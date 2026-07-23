-- ============================================================================
-- 032 — Bucket `avatars` : création + policies (idempotent)
-- ============================================================================
-- Symptôme : « j'ai importé une photo à l'inscription mais elle n'apparaît pas ».
--
-- Jusqu'ici, le bucket `avatars` et ses policies devaient être créés À LA MAIN
-- dans le Dashboard (docs/guides/STORAGE_POLICIES.md). S'ils manquaient, l'upload
-- échouait — et l'erreur partait avec l'écran d'inscription démonté.
--
-- Ce script rend la chose reproductible, comme on l'a déjà fait pour le bucket
-- `excuse-justifications` (cf. 022). Ré-exécutable sans risque.
--
-- Le bucket est PUBLIC en lecture : afficher l'avatar d'un membre ne doit pas
-- coûter une URL signée à chaque rendu de liste. L'écriture, elle, est réservée
-- au propriétaire du dossier `{user_id}/…`.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Lecture : tout le monde (bucket public).
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

-- Écriture : uniquement dans son propre dossier `{auth.uid()}/…`.
DROP POLICY IF EXISTS "avatars_insert_owner" ON storage.objects;
CREATE POLICY "avatars_insert_owner" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- `upsert: true` côté client fait un UPDATE quand le fichier existe déjà :
-- sans cette policy, changer sa photo échouait alors que la première marchait.
DROP POLICY IF EXISTS "avatars_update_owner" ON storage.objects;
CREATE POLICY "avatars_update_owner" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "avatars_delete_owner" ON storage.objects;
CREATE POLICY "avatars_delete_owner" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'avatars'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
