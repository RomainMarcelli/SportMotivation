-- ============================================================================
-- 063 — Badges / Trophées : stockage (Phase 4)
-- ============================================================================
-- À exécuter APRÈS 062. Idempotent. Un badge est GLOBAL au compte et DÉFINITIVEMENT
-- acquis (contrainte d'unicité → attribution idempotente). L'attribution réelle est
-- faite côté serveur (065) ; le client ne fait que LIRE ses badges et les « marquer vus ».
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_badges (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  badge_key   TEXT NOT NULL,                       -- clé du catalogue (constants/badges.ts)
  group_id    UUID REFERENCES public.groups(id) ON DELETE SET NULL,  -- défi où il a été gagné (si pertinent)
  metadata    JSONB NOT NULL DEFAULT '{}'::jsonb,  -- contexte (ex. série atteinte, rang…)
  seen_at     TIMESTAMPTZ,                          -- NULL = pas encore montré (célébration à jouer 1 fois)
  unlocked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Un même badge ne peut être débloqué qu'UNE fois par compte → attribution idempotente.
  UNIQUE (user_id, badge_key)
);

CREATE INDEX IF NOT EXISTS user_badges_user_idx ON public.user_badges (user_id, unlocked_at DESC);

-- Lecture : uniquement SES badges. Écriture : fonctions SECURITY DEFINER seulement.
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS user_badges_select ON public.user_badges;
CREATE POLICY user_badges_select ON public.user_badges
  FOR SELECT USING (user_id = auth.uid());


-- Marque comme « vus » les badges (célébration jouée). Sans argument = tous les non-vus.
CREATE OR REPLACE FUNCTION public.mark_badges_seen(p_keys TEXT[] DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;
  UPDATE public.user_badges
     SET seen_at = now()
   WHERE user_id = auth.uid()
     AND seen_at IS NULL
     AND (p_keys IS NULL OR badge_key = ANY(p_keys));
END;
$$;

GRANT EXECUTE ON FUNCTION public.mark_badges_seen(TEXT[]) TO authenticated;


-- Lecture unique pour l'écran Trophées + la célébration : badges du compte + les
-- compteurs de progression (séances validées, meilleur record de série). Un seul
-- appel → pas d'accès table non typé côté client.
CREATE OR REPLACE FUNCTION public.get_my_trophies()
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  RETURN jsonb_build_object(
    'validated_sessions', (
      SELECT count(*) FROM public.sessions s
      WHERE s.user_id = v_uid AND s.status = 'validated'
    ),
    'best_streak', (
      SELECT COALESCE(max(mgp.best_streak), 0) FROM public.member_group_progress mgp
      WHERE mgp.user_id = v_uid
    ),
    'badges', (
      SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
          'key', ub.badge_key,
          'unlocked_at', ub.unlocked_at,
          'seen_at', ub.seen_at,
          'group_id', ub.group_id
        ) ORDER BY ub.unlocked_at DESC
      ), '[]'::jsonb)
      FROM public.user_badges ub WHERE ub.user_id = v_uid
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_trophies() TO authenticated;

NOTIFY pgrst, 'reload schema';
