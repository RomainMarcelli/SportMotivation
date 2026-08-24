-- ============================================================================
-- 028 — Fix : le profil saisi à l'inscription n'était pas enregistré
-- ============================================================================
-- Symptôme : on saisit prénom + pseudo + photo à l'inscription, puis l'écran
-- Profil est vide et redemande ces informations.
--
-- Causes côté client (corrigées dans `features/auth/profile-mutations.ts`) :
--   1. `useUpdateProfile` lisait l'utilisateur dans le store Zustand, qui est
--      encore `null` au moment précis où l'on enchaîne signUp → update.
--   2. Un `UPDATE ... WHERE id = ...` qui ne touche AUCUNE ligne (ligne pas
--      encore créée par le trigger, ou filtrée par la RLS) ne renvoie PAS
--      d'erreur : l'écriture était perdue silencieusement.
--
-- Correctif serveur : une RPC SECURITY DEFINER qui identifie l'appelant via
-- `auth.uid()` (aucune dépendance à l'état client) et fait un INSERT ... ON
-- CONFLICT — donc qui fonctionne même si la ligne `public.users` n'existe pas
-- encore. Les champs NULL/vides ne réécrasent jamais une valeur existante.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.upsert_my_profile(
  p_first_name TEXT DEFAULT NULL,
  p_last_name  TEXT DEFAULT NULL,
  p_username   TEXT DEFAULT NULL,
  p_avatar_url TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid   UUID := auth.uid();
  v_email TEXT;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'NOT_AUTHENTICATED'; END IF;

  SELECT email INTO v_email FROM auth.users WHERE id = v_uid;

  INSERT INTO public.users (id, email, first_name, last_name, username, avatar_url)
  VALUES (
    v_uid,
    COALESCE(v_email, ''),
    NULLIF(btrim(p_first_name), ''),
    NULLIF(btrim(p_last_name), ''),
    NULLIF(btrim(p_username), ''),
    NULLIF(btrim(p_avatar_url), '')
  )
  ON CONFLICT (id) DO UPDATE SET
    -- COALESCE : on n'écrase que si une nouvelle valeur est fournie.
    first_name = COALESCE(EXCLUDED.first_name, public.users.first_name),
    last_name  = COALESCE(EXCLUDED.last_name,  public.users.last_name),
    username   = COALESCE(EXCLUDED.username,   public.users.username),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.users.avatar_url),
    updated_at = now();
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_my_profile(TEXT, TEXT, TEXT, TEXT) TO authenticated;

NOTIFY pgrst, 'reload schema';
