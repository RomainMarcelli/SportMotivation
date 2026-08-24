/**
 * Confidentialité du profil — apparaître ou non dans la recherche par pseudo.
 *
 * Un seul réglage, `users.is_searchable`, proposé à l'inscription puis
 * modifiable dans les Paramètres. Il ne concerne QUE la recherche par « @ » :
 * le code d'invitation, le lien et le QR code d'un défi continuent de marcher
 * dans les deux cas. C'est important à dire, sinon « privé » ressemble à un
 * mode qui coupe l'app en deux.
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";

import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/auth-store";
import type { UserProfile } from "@/hooks/useProfile";

/** Public par défaut : une recherche où personne n'est trouvable passe pour cassée. */
export const DEFAULT_IS_SEARCHABLE = true;

export function privacyLabel(isSearchable: boolean): string {
  return isSearchable ? "Public" : "Privé";
}

/** Une phrase, à la deuxième personne : ce que ce réglage change concrètement. */
export function privacySummary(isSearchable: boolean): string {
  return isSearchable
    ? "Tout le monde peut te trouver avec ton pseudo et t'inviter à un défi."
    : "Tu n'apparais pas dans la recherche. On peut toujours t'inviter avec un code ou un lien.";
}

/**
 * Le détail affiché dans la bulle d'explication (même texte partout).
 *
 * « N'importe qui » et non « tes amis » : tant que le système d'amis n'existe
 * pas, tout membre de l'app peut chercher un pseudo et inviter. C'est justement
 * ce que le mode privé servira à filtrer une fois les amis en place — cf.
 * l'étape « Système d'amis ».
 */
export const PRIVACY_EXPLAINER =
  "En public, n'importe qui peut te trouver en cherchant « @ton-pseudo » et t'inviter à un " +
  "défi. En privé, tu restes invisible dans cette recherche — le code d'invitation, le lien " +
  "et le QR code fonctionnent toujours.";

/** Lecture tolérante : un profil pas encore chargé est considéré public. */
export function readIsSearchable(profile: { is_searchable?: boolean | null } | null | undefined) {
  return profile?.is_searchable ?? DEFAULT_IS_SEARCHABLE;
}

/**
 * Bascule public / privé. Mise à jour optimiste : l'interrupteur doit répondre
 * au doigt, pas à l'aller-retour réseau — et il revient en arrière si ça casse.
 */
export function useSetSearchable() {
  const queryClient = useQueryClient();
  const user = useCurrentUser();
  const key = ["profile", user?.id];

  return useMutation({
    mutationFn: async (isSearchable: boolean) => {
      const { data, error } = await supabase.rpc("upsert_my_profile", {
        p_is_searchable: isSearchable,
      });
      if (error) throw error;
      return (data as UserProfile | null) ?? null;
    },
    onMutate: async (isSearchable) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<UserProfile>(key);
      if (previous) {
        queryClient.setQueryData<UserProfile>(key, { ...previous, is_searchable: isSearchable });
      }
      return { previous };
    },
    onError: (_e, _v, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
    onSuccess: (profile) => {
      if (profile) queryClient.setQueryData(key, profile);
    },
  });
}
