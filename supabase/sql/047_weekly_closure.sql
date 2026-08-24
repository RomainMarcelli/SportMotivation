-- ============================================================================
-- 047 — Clôture hebdomadaire automatique (génère les pénalités « séance manquée »)
-- ============================================================================
-- À exécuter APRÈS 046. Idempotent. Nécessite l'extension `pg_cron` (déjà créée en 045).
--
-- Règle métier (§9) : chaque lundi, pour la semaine qui vient de se terminer, on
-- compare les séances VALIDÉES de chaque membre à son objectif, et on crée
-- 1 pénalité par séance manquante (montant = pénalité du membre), qui alimente la
-- cagnotte. Ajustements :
--   • Excuse MAJEURE acceptée → semaine annulée, AUCUNE pénalité (§7).
--   • Excuse STANDARD acceptée → objectif réduit de 1 (§7).
--   • Joker du mois non consommé → annule 1 séance manquée (§8), puis est marqué consommé.
--
-- Robustesse :
--   • IDEMPOTENT — une semaine n'est clôturée qu'UNE fois par groupe (table
--     `weekly_closures`). Rejouable sans risque (retry cron, test manuel).
--   • Sûr vis-à-vis d'un éventuel trigger de base `penalties → pot_transactions` :
--     on ne crée une transaction QUE pour une pénalité qui n'en a pas déjà une
--     (réconciliation), puis on RECALCULE `pots.total_amount` depuis la somme.
--     → marche AVEC ou SANS trigger, jamais de double comptage.
--   • Robuste au changement d'heure : le cron tourne en UTC, mais la fonction se
--     garde-fou sur le jour « lundi » en heure de Paris.
--
-- Test manuel immédiat (sans attendre lundi) :
--   SELECT public.run_weekly_closure(p_force := true);                       -- semaine écoulée
--   SELECT public.run_weekly_closure(p_week_start := '2026-07-13', p_force := true); -- une semaine précise
-- ============================================================================

-- 1. Marqueur d'idempotence : une clôture par (groupe, semaine) ----------------
CREATE TABLE IF NOT EXISTS public.weekly_closures (
  group_id   UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  week_start DATE NOT NULL,
  closed_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (group_id, week_start)
);
-- Seule la fonction SECURITY DEFINER y touche : RLS activée sans policy (aucun accès client).
ALTER TABLE public.weekly_closures ENABLE ROW LEVEL SECURITY;

-- 2. Consommation du joker : trace la séance manquée annulée (évite de l'annuler
--    plusieurs semaines de suite avec le même joker mensuel). --------------------
ALTER TABLE public.jokers ADD COLUMN IF NOT EXISTS consumed_at TIMESTAMPTZ;


-- 3. La clôture elle-même -----------------------------------------------------
CREATE OR REPLACE FUNCTION public.run_weekly_closure(
  p_week_start DATE DEFAULT NULL,
  p_force      BOOLEAN DEFAULT FALSE
)
RETURNS INTEGER  -- nombre de pénalités créées
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_paris   TIMESTAMP;
  v_week    DATE;
  v_grp     RECORD;
  v_mbr     RECORD;
  v_target  INTEGER;
  v_valid   INTEGER;
  v_miss    INTEGER;
  v_joker   UUID;
  v_created INTEGER := 0;
BEGIN
  v_paris := now() AT TIME ZONE 'Europe/Paris';
  -- Semaine à clôturer = celle qui vient de finir (lundi précédent le lundi courant).
  v_week := COALESCE(p_week_start, (date_trunc('week', v_paris)::date - 7));

  -- Garde-fou : on ne clôture (en auto) qu'un LUNDI, heure de Paris (DOW 1).
  IF NOT p_force AND EXTRACT(DOW FROM v_paris) <> 1 THEN
    RETURN 0;
  END IF;

  FOR v_grp IN
    SELECT g.id, g.name, g.penalty_amount
    FROM public.groups g
    WHERE g.status = 'active'
      -- La semaine doit tomber dans la période du défi.
      AND v_week >= date_trunc('week', g.challenge_start::timestamp)::date
      AND v_week <= g.challenge_end
      -- Idempotence : pas déjà clôturée.
      AND NOT EXISTS (
        SELECT 1 FROM public.weekly_closures wc
        WHERE wc.group_id = g.id AND wc.week_start = v_week
      )
  LOOP
    FOR v_mbr IN
      SELECT gm.user_id,
             gm.weekly_target,
             COALESCE(gm.penalty_amount, v_grp.penalty_amount) AS penalty
      FROM public.group_members gm
      WHERE gm.group_id = v_grp.id AND gm.left_at IS NULL
    LOOP
      -- (a) Objectif effectif selon les excuses acceptées de la semaine.
      --     majeure → -1 (sentinelle « semaine annulée ») ; standard → objectif −1 par excuse.
      SELECT CASE
               WHEN bool_or(e.excuse_type = 'major') THEN -1
               ELSE v_mbr.weekly_target
                    - count(*) FILTER (WHERE e.excuse_type = 'standard')::int
             END
        INTO v_target
      FROM public.excuses e
      WHERE e.group_id = v_grp.id AND e.user_id = v_mbr.user_id
        AND e.week_start = v_week AND e.status = 'accepted';

      IF v_target IS NULL THEN v_target := v_mbr.weekly_target; END IF;  -- aucune excuse
      IF v_target = -1 THEN CONTINUE; END IF;                           -- excuse majeure : rien
      IF v_target < 0 THEN v_target := 0; END IF;

      -- (b) Séances validées de la semaine.
      SELECT count(*) INTO v_valid
      FROM public.sessions s
      WHERE s.group_id = v_grp.id AND s.user_id = v_mbr.user_id
        AND s.week_start = v_week AND s.status = 'validated';

      v_miss := GREATEST(0, v_target - v_valid);

      -- (c) Joker du mois non consommé → annule 1 séance manquée.
      IF v_miss > 0 THEN
        SELECT j.id INTO v_joker
        FROM public.jokers j
        WHERE j.group_id = v_grp.id AND j.user_id = v_mbr.user_id
          AND j.month_start = date_trunc('month', v_week)::date
          AND j.consumed_at IS NULL
        LIMIT 1;
        IF v_joker IS NOT NULL THEN
          v_miss := v_miss - 1;
          UPDATE public.jokers SET consumed_at = now() WHERE id = v_joker;
          v_joker := NULL;
        END IF;
      END IF;

      -- (d) 1 pénalité par séance manquée + notification au membre.
      IF v_miss > 0 THEN
        INSERT INTO public.penalties (group_id, user_id, amount, penalty_type, week_start)
        SELECT v_grp.id, v_mbr.user_id, v_mbr.penalty, 'missed_session', v_week
        FROM generate_series(1, v_miss);
        v_created := v_created + v_miss;

        INSERT INTO public.notifications (user_id, type, title, body, data)
        VALUES (
          v_mbr.user_id,
          'penalty_applied',
          CASE WHEN v_miss > 1 THEN 'Séances manquées' ELSE 'Séance manquée' END,
          v_miss || CASE WHEN v_miss > 1 THEN ' séances manquées' ELSE ' séance manquée' END
            || ' cette semaine dans « ' || v_grp.name || ' ». Pénalité ajoutée à la cagnotte.',
          jsonb_build_object('group_id', v_grp.id, 'week_start', v_week)
        );
      END IF;
    END LOOP;

    -- (e) Réconciliation : 1 transaction 'penalty_added' par pénalité qui n'en a
    --     pas déjà une. Neutre si un trigger de base l'a déjà fait (NOT EXISTS).
    INSERT INTO public.pot_transactions
      (pot_id, user_id, amount, transaction_type, related_penalty_id, is_paid)
    SELECT p.id, pen.user_id, pen.amount, 'penalty_added', pen.id, FALSE
    FROM public.penalties pen
    JOIN public.pots p ON p.group_id = pen.group_id
    WHERE pen.group_id = v_grp.id
      AND NOT EXISTS (
        SELECT 1 FROM public.pot_transactions t WHERE t.related_penalty_id = pen.id
      );

    -- (f) Recalcul du total du pot depuis les transactions (idempotent, jamais de double).
    UPDATE public.pots p
    SET total_amount = COALESCE((
          SELECT sum(t.amount) FROM public.pot_transactions t
          WHERE t.pot_id = p.id AND t.transaction_type = 'penalty_added'
        ), 0),
        updated_at = now()
    WHERE p.group_id = v_grp.id;

    -- (g) Marquer la semaine clôturée pour ce groupe.
    INSERT INTO public.weekly_closures (group_id, week_start)
    VALUES (v_grp.id, v_week)
    ON CONFLICT (group_id, week_start) DO NOTHING;
  END LOOP;

  RETURN v_created;
END;
$$;


-- 4. Planification : chaque semaine, tôt le lundi (heure de Paris) -------------
-- Le cron tourne en UTC ; on le fait tourner à chaque heure du dimanche/lundi UTC
-- (Paris lundi 00h tombe le dimanche soir UTC selon l'heure d'été/hiver) et la
-- fonction ne fait le travail qu'un lundi Paris — l'idempotence couvre les rejouements.
CREATE EXTENSION IF NOT EXISTS pg_cron;

DO $cron$
BEGIN
  PERFORM cron.unschedule('weekly-closure');
EXCEPTION WHEN OTHERS THEN NULL;  -- pas encore planifié : rien à faire
END
$cron$;

SELECT cron.schedule('weekly-closure', '0 * * * 0,1', $$ SELECT public.run_weekly_closure(); $$);

NOTIFY pgrst, 'reload schema';
