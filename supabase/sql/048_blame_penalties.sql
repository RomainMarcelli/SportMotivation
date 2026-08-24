-- ============================================================================
-- 048 — Blâmes : création au refus + pénalité au seuil (§6)
-- ============================================================================
-- À exécuter APRÈS 047. Idempotent.
--
-- Règle (§6) : 1 blâme par séance REJETÉE au vote (jamais pour une expiration /
-- absence de vote). Au SEUIL (`groups.blame_threshold`, 3 par défaut) → 1 pénalité
-- supplémentaire (montant d'une séance manquée = pénalité du membre) + RESET du
-- compteur. Cumul sur toute la durée du défi.
--
-- Aujourd'hui `cast_vote` (018) résout le scrutin mais laissait un TODO : aucun
-- blâme n'était créé. On branche la conséquence via un TRIGGER sur `sessions`
-- (statut → 'rejected') : ça couvre le vote ET une future résolution à l'échéance,
-- sans réécrire `cast_vote`.
--
-- Robustesse (mêmes garde-fous que la clôture 047) :
--   • blâme idempotent (un seul par séance) ;
--   • pénalité créée une seule fois par franchissement de seuil (les blâmes
--     comptés sont marqués `settled` → le compteur repart de zéro) ;
--   • pot alimenté par RÉCONCILIATION (une transaction par pénalité sans
--     transaction) + recalcul du total → sûr avec ou sans trigger de base.
--
-- Test manuel : faire rejeter 3 séances d'un même membre (seuil par défaut) →
-- une pénalité `blame_threshold` doit apparaître dans la cagnotte.
-- ============================================================================

-- 1. Conséquences d'un refus : blâme, puis pénalité si le seuil est atteint ----
CREATE OR REPLACE FUNCTION public.apply_blame_on_rejection(p_session_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_session   public.sessions%ROWTYPE;
  v_threshold INTEGER;
  v_name      TEXT;
  v_unsettled INTEGER;
  v_penalty   NUMERIC;
  v_pen_id    UUID;
BEGIN
  SELECT * INTO v_session FROM public.sessions WHERE id = p_session_id;
  -- On n'agit que sur un vrai refus (pas une expiration / absence de vote).
  IF NOT FOUND OR v_session.status <> 'rejected' THEN RETURN; END IF;

  -- (a) 1 blâme par séance rejetée — idempotent.
  INSERT INTO public.blames (group_id, user_id, session_id, settled)
  SELECT v_session.group_id, v_session.user_id, v_session.id, FALSE
  WHERE NOT EXISTS (SELECT 1 FROM public.blames b WHERE b.session_id = v_session.id);

  -- (b) Seuil du groupe + blâmes non réglés du membre.
  SELECT blame_threshold, name INTO v_threshold, v_name
  FROM public.groups WHERE id = v_session.group_id;

  SELECT count(*) INTO v_unsettled
  FROM public.blames
  WHERE group_id = v_session.group_id AND user_id = v_session.user_id AND NOT settled;

  -- (c) Seuil atteint → pénalité + reset du compteur.
  IF v_unsettled >= COALESCE(v_threshold, 3) THEN
    SELECT COALESCE(gm.penalty_amount, g.penalty_amount) INTO v_penalty
    FROM public.group_members gm
    JOIN public.groups g ON g.id = gm.group_id
    WHERE gm.group_id = v_session.group_id AND gm.user_id = v_session.user_id
      AND gm.left_at IS NULL;

    INSERT INTO public.penalties
      (group_id, user_id, amount, penalty_type, related_session_id, week_start)
    VALUES
      (v_session.group_id, v_session.user_id, COALESCE(v_penalty, 0),
       'blame_threshold', v_session.id, v_session.week_start)
    RETURNING id INTO v_pen_id;

    -- Reset : les blâmes comptés deviennent réglés (le compteur repart de zéro).
    UPDATE public.blames SET settled = TRUE
    WHERE group_id = v_session.group_id AND user_id = v_session.user_id AND NOT settled;

    -- Réconciliation pot (sûr avec/sans trigger de base) + recalcul du total.
    INSERT INTO public.pot_transactions
      (pot_id, user_id, amount, transaction_type, related_penalty_id, is_paid)
    SELECT p.id, v_session.user_id, COALESCE(v_penalty, 0), 'penalty_added', v_pen_id, FALSE
    FROM public.pots p
    WHERE p.group_id = v_session.group_id
      AND NOT EXISTS (SELECT 1 FROM public.pot_transactions t WHERE t.related_penalty_id = v_pen_id);

    UPDATE public.pots p
    SET total_amount = COALESCE((
          SELECT sum(t.amount) FROM public.pot_transactions t
          WHERE t.pot_id = p.id AND t.transaction_type = 'penalty_added'
        ), 0),
        updated_at = now()
    WHERE p.group_id = v_session.group_id;

    -- Notification (même type que les autres pénalités → ouvre la Cagnotte).
    INSERT INTO public.notifications (user_id, type, title, body, data)
    VALUES (
      v_session.user_id,
      'penalty_applied',
      'Seuil de blâmes atteint',
      'Trop de séances refusées dans « ' || COALESCE(v_name, 'ton défi') ||
        ' » : une pénalité a été ajoutée à la cagnotte.',
      jsonb_build_object('group_id', v_session.group_id, 'session_id', v_session.id)
    );
  END IF;
END;
$$;


-- 2. Trigger : dès qu'une séance passe à 'rejected' -------------------------
CREATE OR REPLACE FUNCTION public.trg_blame_on_rejection()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.apply_blame_on_rejection(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sessions_blame ON public.sessions;
CREATE TRIGGER trg_sessions_blame
  AFTER UPDATE OF status ON public.sessions
  FOR EACH ROW
  WHEN (NEW.status = 'rejected' AND OLD.status IS DISTINCT FROM 'rejected')
  EXECUTE FUNCTION public.trg_blame_on_rejection();

NOTIFY pgrst, 'reload schema';
