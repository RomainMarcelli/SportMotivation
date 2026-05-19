# Supabase - Skill

## Description
Bonnes pratiques pour utiliser Supabase dans le projet Sport Motivation App.

## Quand utiliser ce skill
À chaque interaction avec Supabase : requêtes, RLS, auth, storage, edge functions, types TypeScript.

## Configuration initiale

### Client Supabase
Le client doit être initialisé UNE SEULE FOIS dans `lib/supabase.ts` :

```typescript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Database } from '@/types/database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
```

### Variables d'environnement
Dans `.env` (NE JAMAIS commit) :
```
EXPO_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
```

⚠️ Préfixe `EXPO_PUBLIC_` obligatoire pour que la variable soit accessible côté client Expo.

⚠️ JAMAIS exposer la `service_role key` côté client. Elle ne s'utilise que dans les Edge Functions (où elle est gérée par Supabase).

## Génération des types TypeScript

Après chaque modification du schéma DB, regénérer les types :

```bash
npx supabase gen types typescript --project-id <ton-project-id> > types/database.types.ts
```

Toujours typer les requêtes avec `<Database>` pour bénéficier de l'autocomplétion et de la validation.

## Convention pour les requêtes

### Toujours utiliser TanStack Query
Ne JAMAIS faire de `supabase.from(...).select()` directement dans un composant. Toujours passer par un hook custom avec TanStack Query :

```typescript
// hooks/useGroup.ts
export function useGroup(groupId: string) {
  return useQuery({
    queryKey: ['group', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('groups')
        .select('*, group_members(*, users(*))')
        .eq('id', groupId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!groupId,
  });
}
```

### Conventions de queryKey
- Liste : `['groups']`, `['sessions', groupId]`
- Détail : `['group', groupId]`, `['session', sessionId]`
- Toujours du plus général au plus spécifique

### Invalidation après mutation
Après une mutation, invalider les queries concernées :

```typescript
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: async (data) => { /* ... */ },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['group', groupId] });
  },
});
```

## Row Level Security (RLS)

### Toutes les tables ont RLS activée
Ne JAMAIS désactiver la RLS sans raison majeure documentée dans `DECISIONS.md`.

### Helpers existants
Deux fonctions PostgreSQL sont disponibles :
- `is_group_member(group_id)` : vérifie si l'user actuel est membre actif
- `is_group_admin(group_id)` : vérifie si l'user actuel est admin

### Debug RLS
Si une donnée ne remonte pas alors qu'elle devrait :
1. Vérifier l'utilisateur connecté (`supabase.auth.getUser()`)
2. Tester la requête directement dans le SQL Editor de Supabase (en mode "authenticated as user")
3. Vérifier les policies de la table concernée

## Storage

### Buckets configurés
| Bucket | Visibilité | Usage |
|---|---|---|
| `avatars` | Public | Photos de profil utilisateurs + photos de groupes |
| `session-proofs` | Privé | Photos de séances (anti-fraude) |
| `excuse-justifications` | Privé | Justificatifs d'excuses majeures |

### Upload d'une image (caméra in-app)

```typescript
// Pour les photos de séance : OBLIGATOIREMENT depuis la caméra
const result = await ImagePicker.launchCameraAsync({
  mediaTypes: ImagePicker.MediaTypeOptions.Images,
  quality: 0.8,
  exif: true, // Important pour récupérer les metadata
});

if (!result.canceled) {
  const file = result.assets[0];
  const fileName = `${userId}/${sessionId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from('session-proofs')
    .upload(fileName, {
      uri: file.uri,
      type: 'image/jpeg',
      name: fileName,
    });
}
```

### Anti-fraude
Pour les photos de séances :
- Utiliser `launchCameraAsync` (PAS `launchImageLibraryAsync`)
- Vérifier la présence de metadata EXIF (timestamp + GPS)
- Stocker timestamp et géoloc dans `session_proofs` (colonnes `latitude`, `longitude`, `captured_at`)

## Auth

### Création du profil utilisateur
Le trigger SQL `on_auth_user_created` crée automatiquement une ligne dans `public.users` à chaque inscription via Supabase Auth. Ne PAS créer manuellement.

### Récupération de l'utilisateur courant
Toujours via le store Zustand `useAuthStore`, qui écoute `supabase.auth.onAuthStateChange`.

### Google OAuth
Configuration nécessaire :
1. Créer un OAuth Client ID dans Google Cloud Console
2. Ajouter le client ID dans Supabase Dashboard → Authentication → Providers → Google
3. Configurer l'URL de redirection : `https://<project>.supabase.co/auth/v1/callback`

### Session persistante
La session est stockée dans AsyncStorage automatiquement. Auto-refresh activé. Pas de gestion manuelle nécessaire.

## Edge Functions

### Use cases dans le projet
- **Clôture hebdomadaire** (dimanche 23h59) : calcul des pénalités, mise à jour de la cagnotte
- **Notifications planifiées** : récap dominical, rappel séance planifiée, J-7 fin de défi
- **OAuth Strava** : échange code contre token (le secret reste côté serveur)

### Structure
```
supabase/functions/
  ├── weekly-closure/
  │   ├── index.ts
  │   └── _shared/
  ├── send-reminders/
  │   └── index.ts
  └── strava-oauth-callback/
      └── index.ts
```

### Déploiement
```bash
npx supabase functions deploy <function-name>
```

### Cron jobs
Configurer via Dashboard Supabase → Database → Cron Jobs, ou via SQL :
```sql
SELECT cron.schedule(
  'weekly-closure',
  '59 23 * * 0', -- Dimanche 23h59
  $$SELECT net.http_post('https://<project>.supabase.co/functions/v1/weekly-closure', ...)$$
);
```

## Realtime

### Quand l'utiliser
- Feed des séances du groupe (nouvelles séances apparaissent en live)
- Votes en cours (mise à jour du compteur de votes)
- Cagnotte (montant qui évolue)

### Subscription
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`group:${groupId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'sessions',
      filter: `group_id=eq.${groupId}`,
    }, (payload) => {
      queryClient.invalidateQueries({ queryKey: ['sessions', groupId] });
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [groupId]);
```

⚠️ Toujours `unsubscribe` dans le cleanup du `useEffect`.

## Erreurs courantes

### "JWT expired"
Le auto-refresh devrait gérer ça. Si ça arrive, vérifier que `autoRefreshToken: true` est bien dans la config du client.

### "Row not found" sur un select
Probablement la RLS qui filtre. Vérifier que l'user est bien membre du groupe.

### "duplicate key value violates unique constraint"
Une contrainte UNIQUE est violée (ex: un user essaie de voter deux fois sur la même séance). Gérer côté UI avec un message clair.

### "permission denied for table X"
La RLS bloque l'opération. Vérifier les policies définies.
