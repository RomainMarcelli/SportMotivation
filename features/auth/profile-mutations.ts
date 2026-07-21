import { useMutation, useQueryClient } from "@tanstack/react-query";
import { decode as decodeBase64 } from "base64-arraybuffer";

import { supabase } from "@/lib/supabase";

export type UpdateProfileArgs = {
  firstName?: string;
  username?: string;
  /** Optionnel : non collecté à l'inscription (absent de la maquette), réglé via le profil. */
  lastName?: string;
  /** Photo à uploader (base64 renvoyé par ImagePicker). */
  avatarBase64?: string | null;
  avatarMimeType?: string | null;
  /** URL d'un avatar généré (DiceBear) — enregistrée telle quelle, sans upload. */
  generatedAvatarUrl?: string | null;
  avatarColor?: string | null;
  avatarIcon?: string | null;
  /** L'utilisateur est repassé en bulle couleur/icône → efface l'image en base. */
  clearAvatarImage?: boolean;
  /** L'utilisateur a rechoisi ses initiales → efface l'icône en base. */
  clearAvatarIcon?: boolean;
};

const SQL_MISSING =
  "Le profil n'a pas pu être enregistré : les scripts SQL 028 et 030 n'ont pas encore été " +
  "exécutés sur ce projet Supabase (fonction « upsert_my_profile » introuvable).";

/**
 * PostgREST ne trouve pas la fonction — soit elle n'existe pas, soit sa signature
 * ne correspond pas (cas typique : 028 exécuté mais pas 030, qui ajoute 4 paramètres).
 */
function isMissingFunction(error: { code?: string; message?: string }): boolean {
  if (error.code === "PGRST202" || error.code === "42883") return true;
  return /could not find the function|function .* does not exist/i.test(error.message ?? "");
}

/**
 * Met à jour le profil de l'utilisateur courant (+ upload optionnel de l'avatar).
 *
 * ⚠ Deux pièges corrigés ici — ils faisaient perdre SILENCIEUSEMENT le prénom/pseudo/photo
 * saisis à l'inscription :
 *  1. On ne lit PLUS l'utilisateur dans le store Zustand : juste après `signUp`, le store est
 *     encore `null` (la session n'a pas fini de se propager) → la mutation partait sans id.
 *     On interroge `supabase.auth.getUser()` au moment de l'appel.
 *  2. On ne fait PLUS un `UPDATE ... WHERE id = ...` : s'il ne touche aucune ligne (ligne
 *     `public.users` pas encore créée par le trigger, ou filtrée par la RLS), PostgREST ne
 *     renvoie AUCUNE erreur → écriture perdue. On passe par la RPC `upsert_my_profile`
 *     (SECURITY DEFINER, INSERT ... ON CONFLICT) qui s'identifie via `auth.uid()`.
 *
 * Et un troisième, plus sournois : quand la RPC n'existe pas (SQL non exécuté), l'erreur
 * était noyée dans un « une erreur est survenue ». Elle est désormais explicite et nomme
 * le fichier SQL à passer.
 *
 * Les photos sont stockées dans le bucket public `avatars` sous `{userId}/avatar.{ext}`.
 * Les avatars générés ne sont PAS ré-hébergés : on garde l'URL DiceBear.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: UpdateProfileArgs) => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Aucun utilisateur connecté.");

      let avatarUrl: string | null = args.generatedAvatarUrl ?? null;

      if (args.avatarBase64) {
        const mime = args.avatarMimeType ?? "image/jpeg";
        const ext = mime.split("/")[1] ?? "jpg";
        const path = `${userId}/avatar.${ext}`;
        const arrayBuffer = decodeBase64(args.avatarBase64);

        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(path, arrayBuffer, {
            contentType: mime,
            upsert: true,
          });
        if (uploadError) throw uploadError;

        const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
        // Cache-buster pour forcer le rechargement de l'image après upsert
        avatarUrl = `${publicUrl.publicUrl}?v=${Date.now()}`;
      }

      const { error } = await supabase.rpc("upsert_my_profile", {
        p_first_name: args.firstName ?? null,
        p_last_name: args.lastName ?? null,
        p_username: args.username ?? null,
        p_avatar_url: avatarUrl,
        p_avatar_color: args.avatarColor ?? null,
        p_avatar_icon: args.avatarIcon ?? null,
        p_clear_avatar_url: args.clearAvatarImage ?? false,
        p_clear_avatar_icon: args.clearAvatarIcon ?? false,
      });

      if (error) {
        if (isMissingFunction(error)) throw new Error(SQL_MISSING);
        throw error;
      }

      return userId;
    },
    onSuccess: (userId) => {
      queryClient.invalidateQueries({ queryKey: ["profile", userId] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      // Les listes de membres affichent l'avatar : elles doivent suivre.
      queryClient.invalidateQueries({ queryKey: ["group-members"] });
    },
  });
}
