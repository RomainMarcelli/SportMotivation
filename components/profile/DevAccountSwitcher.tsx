import { useQueryClient } from "@tanstack/react-query";
import { Check, Plus, RefreshCw, Trash2, Users } from "lucide-react-native";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, Text, View } from "react-native";

import { useFeedback } from "@/components/feedback/FeedbackProvider";
import { colors } from "@/constants/colors";
import {
  devSwitcherEnabled,
  forgetDevAccount,
  listDevAccounts,
  signOutForAddAccount,
  switchDevAccount,
  type DevAccount,
} from "@/features/auth/dev-accounts";
import { useCurrentUser } from "@/lib/auth-store";

/**
 * Bascule rapide entre comptes de test. Rendu **uniquement en dev** (`__DEV__`).
 * Chaque compte qui se connecte est mémorisé automatiquement.
 */
export function DevAccountSwitcher() {
  const me = useCurrentUser();
  const { toast, confirm } = useFeedback();
  const queryClient = useQueryClient();

  const [accounts, setAccounts] = useState<DevAccount[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listDevAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, []);

  useEffect(refresh, [refresh, me?.id]);

  if (!devSwitcherEnabled) return null;

  const onSwitch = async (account: DevAccount) => {
    if (account.id === me?.id || busy) return;
    setBusy(account.id);
    try {
      await switchDevAccount(account);
      // ⚠ Ne PAS utiliser queryClient.clear() : il détache les queries observées en plein vol
      // (le splash racine attend `profile` → loader infini). invalidateQueries est non
      // destructif : tout est marqué périmé et se refetch avec la nouvelle session.
      await queryClient.invalidateQueries();
      toast(`Connecté en tant que ${account.label}.`, "success");
    } catch {
      toast("Session expirée pour ce compte — reconnecte-toi une fois.", "error");
    } finally {
      setBusy(null);
    }
  };

  const onForget = async (account: DevAccount) => {
    const ok = await confirm({
      title: "Oublier ce compte ?",
      message: `${account.label} ne sera plus proposé dans la bascule rapide.`,
      confirmLabel: "Oublier",
      destructive: true,
    });
    if (!ok) return;
    await forgetDevAccount(account.id);
    refresh();
  };

  const onAdd = async () => {
    await signOutForAddAccount();
    toast("Connecte-toi avec l'autre compte.", "info");
  };

  return (
    <View
      className="gap-3 rounded-2xl border p-4"
      style={{ backgroundColor: colors.surface, borderColor: colors.line2 }}
    >
      <View className="flex-row items-center gap-2.5">
        <View
          className="h-9 w-9 items-center justify-center rounded-xl"
          style={{ backgroundColor: colors.amberSoft }}
        >
          <Users size={17} color={colors.amber} />
        </View>
        <View className="flex-1">
          <Text className="font-display text-[15px] tracking-tight text-cream">
            Changer de compte
          </Text>
          <Text className="mt-0.5 font-body text-[11px] text-cream-dim">
            Outil de test · visible en développement uniquement
          </Text>
        </View>
        <Pressable onPress={refresh} hitSlop={8} className="active:opacity-70">
          <RefreshCw size={16} color={colors.creamDim} />
        </Pressable>
      </View>

      {accounts.length === 0 ? (
        <Text className="font-body text-[12px] leading-[1.5] text-cream-dim">
          Aucun autre compte mémorisé. Ajoute-en un : tu reviendras ici en un tap.
        </Text>
      ) : (
        <View className="gap-2">
          {accounts.map((a) => {
            const isMe = a.id === me?.id;
            return (
              <View
                key={a.id}
                className="flex-row items-center gap-3 rounded-input border px-3 py-2.5"
                style={{
                  backgroundColor: isMe ? colors.coralSoft : colors.surface2,
                  borderColor: isMe ? "transparent" : colors.line,
                }}
              >
                <Pressable
                  onPress={() => onSwitch(a)}
                  disabled={isMe || !!busy}
                  className="flex-1 flex-row items-center gap-3 active:opacity-80"
                >
                  <View className="flex-1">
                    <Text
                      className="font-body-semibold text-[13.5px]"
                      style={{ color: isMe ? colors.coral : colors.cream }}
                      numberOfLines={1}
                    >
                      {a.label}
                    </Text>
                    <Text className="mt-0.5 font-body text-[11px] text-cream-dim" numberOfLines={1}>
                      {a.email}
                    </Text>
                  </View>
                  {busy === a.id ? (
                    <ActivityIndicator size="small" color={colors.coral} />
                  ) : isMe ? (
                    <View className="flex-row items-center gap-1.5">
                      <Check size={14} color={colors.coral} strokeWidth={2.8} />
                      <Text className="font-body-bold text-[11px] text-coral">actuel</Text>
                    </View>
                  ) : (
                    <Text className="font-body-bold text-[11.5px] text-cream-dim">Basculer</Text>
                  )}
                </Pressable>

                {!isMe ? (
                  <Pressable onPress={() => onForget(a)} hitSlop={8} className="active:opacity-70">
                    <Trash2 size={15} color={colors.creamDim} />
                  </Pressable>
                ) : null}
              </View>
            );
          })}
        </View>
      )}

      <Pressable
        onPress={onAdd}
        className="flex-row items-center justify-center gap-2 rounded-input border border-dashed py-3 active:opacity-80"
        style={{ borderColor: colors.line2 }}
      >
        <Plus size={16} color={colors.cream} />
        <Text className="font-body-semibold text-[13px] text-cream">Ajouter un compte</Text>
      </Pressable>
    </View>
  );
}
