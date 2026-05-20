import { useMutation, useQueryClient } from "@tanstack/react-query";
import { decode as decodeBase64 } from "base64-arraybuffer";

import { supabase } from "@/lib/supabase";
import { useCurrentUser } from "@/lib/auth-store";

import type { CompleteProfileInput } from "./profile-schemas";

type UpdateProfileArgs = CompleteProfileInput & {
  avatarBase64?: string | null;
  avatarMimeType?: string | null;
};

/**
 * Met à jour le profil de l'utilisateur courant et upload optionnel de l'avatar.
 * - L'avatar est stocké dans le bucket `avatars` sous `{userId}/avatar.jpg`
 * - Le bucket est public, donc on peut référencer l'URL publique directement
 */
export function useUpdateProfile() {
  const user = useCurrentUser();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: UpdateProfileArgs) => {
      if (!user) throw new Error("Aucun utilisateur connecté.");

      let avatarUrl: string | null = null;

      if (args.avatarBase64) {
        const mime = args.avatarMimeType ?? "image/jpeg";
        const ext = mime.split("/")[1] ?? "jpg";
        const path = `${user.id}/avatar.${ext}`;
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

      const { error: updateError } = await supabase
        .from("users")
        .update({
          first_name: args.firstName,
          last_name: args.lastName,
          username: args.username,
          ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);
      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });
}
