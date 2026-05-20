# Policies Storage Supabase

> Policies RLS sur les buckets Storage pour autoriser les uploads/downloads sécurisés.

## Bucket `avatars` (public)

Le bucket `avatars` est **public** : tout le monde peut lire les images sans authentification (utile pour afficher l'avatar d'un membre dans un groupe).

Mais l'**upload** doit être restreint : seul le propriétaire peut uploader son propre avatar.

### Policy à créer (côté Dashboard Supabase)

**Supabase Dashboard → Storage → `avatars` → Policies → "New Policy"**

Templates pré-fournis ou SQL custom :

```sql
-- Lecture publique
CREATE POLICY "Avatars are publicly accessible"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Upload restreint à l'owner (chemin = `{user_id}/...`)
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Update / Replace
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Delete
CREATE POLICY "Users can delete their own avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Convention de nommage des fichiers

Dans le code, l'avatar est uploadé sous : `{userId}/avatar.{ext}` (ex: `8a2f.../avatar.jpg`).

C'est ce qui permet à la policy de vérifier que le **premier segment du chemin** (`storage.foldername(name)[1]`) correspond à l'`auth.uid()`.

## Buckets `session-proofs` et `excuse-justifications`

> À créer en Phase 3 (déclaration de séance) et Phase 4 (excuses majeures).

Ces buckets sont **privés** : seuls les membres du groupe peuvent voir les preuves de séance et justificatifs.

Policies prévues :
- Upload : l'auteur de la séance/excuse uniquement
- Read : tous les membres actifs du groupe (via `is_group_member()`)

À détailler quand on attaquera ces phases.
