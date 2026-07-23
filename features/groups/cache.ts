import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalide TOUT ce qui dépend de « dans quels groupes je suis ».
 *
 * Rejoindre, créer ou quitter un groupe change bien plus que la liste des
 * groupes : l'accueil, les stats et le bloc « Mes groupes » du profil en
 * dépendent aussi. Chaque écran ajoutait ses invalidations dans son coin, et le
 * profil avait été oublié — d'où un groupe fraîchement rejoint invisible dans
 * le profil jusqu'au prochain rechargement complet.
 *
 * Une seule fonction pour tout le monde : le prochain écran qui lira ces données
 * n'aura rien à câbler.
 */
export function invalidateMembership(queryClient: QueryClient, groupId?: string) {
  queryClient.invalidateQueries({ queryKey: ["my-groups"] });
  queryClient.invalidateQueries({ queryKey: ["profile-groups"] });
  queryClient.invalidateQueries({ queryKey: ["profile-stats"] });
  // La notification correspondante doit passer sur « Tu as rejoint le défi ».
  queryClient.invalidateQueries({ queryKey: ["my-invitations"] });

  if (groupId) {
    queryClient.invalidateQueries({ queryKey: ["group", groupId] });
    queryClient.invalidateQueries({ queryKey: ["group-members", groupId] });
    queryClient.invalidateQueries({ queryKey: ["sessions", groupId] });
    queryClient.invalidateQueries({ queryKey: ["pot", groupId] });
  }
}
