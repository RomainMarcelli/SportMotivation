import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { useAuthStore, useCurrentUser } from "@/lib/auth-store";
import { supabase } from "@/lib/supabase";

/**
 * Abonnement TEMPS RÉEL aux notifications de l'utilisateur.
 *
 * Dès qu'une ligne le concernant est insérée / mise à jour / supprimée côté
 * serveur (une séance à voter, un refus, une invitation, une relance de
 * cagnotte…), on invalide la liste `["notifications", userId]` : le badge ET
 * l'écran 🔔 se mettent à jour INSTANTANÉMENT, sans attendre le poll de 60 s ni
 * un geste de l'utilisateur.
 *
 * Monté une seule fois au niveau racine (zone authentifiée), donc actif sur TOUS
 * les écrans — y compris le tableau de bord d'un groupe, qui ne porte pas la
 * cloche. La sécurité reste portée par la RLS (`notifications` = ses propres
 * lignes) ; le filtre `user_id` ne fait que réduire le trafic reçu.
 */
export function useNotificationsRealtime() {
  const userId = useCurrentUser()?.id;
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!userId) return;

    // La connexion Realtime doit porter le JWT du user pour que la RLS l'autorise
    // à recevoir SES notifications (sans jeton : connecté en anon → aucun
    // événement). setAuth est idempotent, et supabase-js resynchronise seul au
    // rafraîchissement du token. Compatible versions sync (void) ou async (Promise).
    const token = useAuthStore.getState().session?.access_token;
    if (token) {
      const res = supabase.realtime.setAuth(token) as unknown;
      if (res && typeof (res as Promise<unknown>).then === "function") {
        (res as Promise<unknown>).catch(() => {});
      }
    }

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        () => {
          // Une seule action, quel que soit l'événement : refetch la liste. Le
          // compteur de non-lues en dérive (useUnreadCount), donc il suit tout seul.
          queryClient.invalidateQueries({ queryKey: ["notifications", userId] });
          // Un `badge_unlocked` est une notification et un nouvel enregistrement
          // `user_badges`. Rafraîchir les trophées sur le même signal permet à la
          // célébration racine de regrouper objectif + badge dans une seule modale.
          queryClient.invalidateQueries({ queryKey: ["trophies", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, queryClient]);
}
