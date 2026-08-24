# Suppression de compte (anonymisation)

La suppression de compte se fait par **anonymisation** (soft delete), pas par effacement
total : les séances, pénalités et l'historique du membre **restent** dans les groupes pour
ne pas fausser les cagnottes et classements. Le profil est anonymisé et le compte auth est
banni (impossible de se reconnecter).

## Pourquoi une Edge Function ?

Bannir un compte et changer son email côté auth nécessite la clé `service_role`, qui ne doit
**jamais** être exposée dans l'app. Tout passe donc par l'Edge Function `delete-account`.

## Déploiement

Le code est déjà écrit : [`supabase/functions/delete-account/index.ts`](../../supabase/functions/delete-account/index.ts).

1. Dashboard Supabase → **Edge Functions** → **Create a function** → nom : `delete-account`
2. Colle le contenu du fichier ci-dessus → **Deploy**

### Secrets

L'Edge Function utilise `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` et `SUPABASE_ANON_KEY`.
Ces trois variables sont **fournies automatiquement** par Supabase à toutes les Edge Functions
— normalement **rien à configurer**. Si jamais elles manquaient, ajoute-les dans
Project Settings → Edge Functions → Secrets.

## Ce que fait la fonction

1. Identifie l'appelant via son JWT (sécurité : on ne supprime que son propre compte).
2. Anonymise `public.users` : nom → « Compte supprimé », `username`/`avatar_url`/`expo_push_token` effacés.
3. `group_members.left_at = now()` sur tous ses groupes actifs (il quitte les défis).
4. Bannit le compte auth (~100 ans) et brouille son email → reconnexion impossible, adresse libérée.

## Côté app

`features/auth/account.ts` → `useDeleteAccount()` appelle la fonction puis `signOut()`.
Déclenché depuis l'onglet **Profil** → « Supprimer mon compte » (avec confirmation).
