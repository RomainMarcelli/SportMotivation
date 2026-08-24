import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "expo-router";
import {
  AlertCircle,
  ArrowRight,
  AtSign,
  Lock,
  Mail,
  Palette,
  ShieldCheck,
  User,
} from "lucide-react-native";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";

import { GoogleSignInButton } from "@/components/auth/GoogleSignInButton";
import { PasswordStrength } from "@/components/auth/PasswordStrength";
import { AvatarPicker, type AvatarSelection } from "@/components/profile/AvatarPicker";
import { PrivacyToggleCard } from "@/components/profile/PrivacyToggleCard";
import { Avatar } from "@/components/ui/Avatar";
import { BrandMark } from "@/components/ui/BrandMark";
import { GradientButton } from "@/components/ui/GradientButton";
import { Reveal } from "@/components/ui/Reveal";
import { ScreenContainer } from "@/components/ui/ScreenContainer";
import { TextField } from "@/components/ui/TextField";
import { AVATAR_COLORS } from "@/constants/avatars";
import { colors } from "@/constants/colors";
import { isGoogleConfigured } from "@/features/auth/google";
import { useSignUp } from "@/features/auth/mutations";
import { useUpdateProfile } from "@/features/auth/profile-mutations";
import { signUpSchema, type SignUpInput } from "@/features/auth/schemas";
import {
  isEmailTakenError,
  isUsernameTakenError,
  useUsernameAvailability,
  useUsernameSuggestions,
} from "@/features/auth/username";
import { DEFAULT_IS_SEARCHABLE } from "@/features/settings/privacy";
import { setFinishingSignUp } from "@/lib/auth-store";

export default function SignUpScreen() {
  const router = useRouter();
  const signUp = useSignUp();
  const updateProfile = useUpdateProfile();
  // Couleur de départ tirée au sort **une seule fois** : sans ça, tous les comptes
  // créés sans passer par le sélecteur seraient corail. Elle est enregistrée telle
  // quelle, donc ce que l'écran montre est bien ce que le joueur gardera.
  const [avatar, setAvatar] = useState<AvatarSelection>(() => ({
    color: AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)],
    icon: null,
    photo: null,
    generatedUrl: null,
    clearImage: true,
  }));
  const [pickerOpen, setPickerOpen] = useState(false);
  /** Trouvable par son pseudo. Public par défaut (cf. `features/settings/privacy`). */
  const [searchable, setSearchable] = useState(DEFAULT_IS_SEARCHABLE);
  const [pwdFocused, setPwdFocused] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Compte créé, mais l'écriture du profil a échoué → on propose de réessayer. */
  const [needsRetry, setNeedsRetry] = useState(false);
  /** L'e-mail saisi a déjà un compte → raccourci vers la connexion. */
  const [emailTaken, setEmailTaken] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isValid },
  } = useForm<SignUpInput>({
    resolver: zodResolver(signUpSchema),
    mode: "onChange",
    defaultValues: { firstName: "", username: "", email: "", password: "", confirmPassword: "" },
  });

  const passwordValue = watch("password");
  const firstNameValue = watch("firstName");
  const usernameValue = watch("username");
  const emailValue = watch("email");
  const submitting = signUp.isPending || updateProfile.isPending;

  // Vérif live : on annonce « déjà pris » AVANT de créer le compte, plutôt que de
  // deviner après coup à partir d'une violation de contrainte.
  const { data: usernameFree } = useUsernameAvailability(usernameValue);
  const usernameTaken = usernameFree === false && !errors.username;
  // Pseudo pris → on propose des alternatives DISPONIBLES (base + numéro),
  // cliquables pour remplir le champ. N'interroge le réseau que si c'est pris.
  const { data: usernameSuggestions = [] } = useUsernameSuggestions(usernameValue, usernameTaken);

  const avatarPreviewUri = avatar.photo?.uri ?? avatar.generatedUrl;

  const handleError = (e: unknown) => {
    const err = e as { code?: string; message?: string; details?: string };
    const msg = err.message ?? "";
    // Pseudo d'abord : son message contient parfois « already », qui ferait
    // passer un pseudo pris pour un e-mail pris.
    if (isUsernameTakenError(err)) {
      setError("username", { message: `« ${usernameValue} » est déjà pris, choisis-en un autre.` });
    } else if (isEmailTakenError(err)) {
      setEmailTaken(true);
      setError("email", { message: "Un compte existe déjà avec cet e-mail." });
    } else if (/database error saving new user/i.test(msg)) {
      // Le trigger de création du profil a échoué. En pratique c'est presque
      // toujours le pseudo : c'est la seule contrainte unique qu'il touche.
      setError("username", {
        message: `« ${usernameValue} » semble déjà pris, essaie une variante.`,
      });
    } else if (msg) {
      // On affiche le VRAI message : c'est ici que se cachait « SQL non exécuté »,
      // masqué jusqu'ici derrière un « une erreur est survenue » inutile.
      setSubmitError(msg);
    } else {
      setSubmitError("Une erreur est survenue. Réessaie.");
    }
  };

  /** Écriture du profil (identité + avatar). Isolée pour pouvoir être **réessayée**. */
  const writeProfile = (data: SignUpInput) =>
    updateProfile.mutateAsync({
      firstName: data.firstName,
      username: data.username,
      avatarBase64: avatar.photo?.base64 ?? null,
      avatarMimeType: avatar.photo?.mime ?? null,
      generatedAvatarUrl: avatar.generatedUrl,
      avatarColor: avatar.color,
      avatarIcon: avatar.icon,
      clearAvatarIcon: avatar.icon === null,
      isSearchable: searchable,
    });

  const onSubmit = async (data: SignUpInput) => {
    setSubmitError(null);
    // Verrouille la racine sur `(auth)` : sans ça, `onAuthStateChange` démonte cet
    // écran dès que le compte est créé — donc AVANT que l'avatar soit enregistré.
    setFinishingSignUp(true);

    let hasSession = false;
    try {
      const result = await signUp.mutateAsync(data);
      hasSession = !!result.session;
    } catch (e) {
      setFinishingSignUp(false);
      handleError(e);
      return;
    }

    if (!hasSession) {
      // Confirmation d'e-mail ON (plus tard) : métadonnées déjà envoyées via signUp.
      setFinishingSignUp(false);
      router.replace("/sign-in");
      return;
    }

    try {
      await writeProfile(data);
      // Profil écrit → on relâche le verrou, la racine bascule sur les onglets.
      setFinishingSignUp(false);
    } catch (e) {
      // Le compte EXISTE désormais. Plutôt que d'envoyer l'utilisateur dans l'app
      // avec un profil vide (le bug d'avant), on le garde ici avec un « Réessayer ».
      setNeedsRetry(true);
      handleError(e);
    }
  };

  /** Le compte est créé mais le profil n'a pas pu être écrit : on retente ce seul appel. */
  const onRetry = handleSubmit(async (data) => {
    setSubmitError(null);
    try {
      await writeProfile(data);
      setNeedsRetry(false);
      setFinishingSignUp(false);
    } catch (e) {
      handleError(e);
    }
  });

  /** Sortie de secours : entrer quand même, le profil restera modifiable. */
  const onSkipProfile = () => {
    setNeedsRetry(false);
    setFinishingSignUp(false);
  };

  const clearSubmitError = () => {
    if (submitError) setSubmitError(null);
  };

  return (
    <ScreenContainer transparent padded={false}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        className="flex-1"
      >
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-[24px] py-8"
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Reveal delay={0} className="mb-6 items-center">
            <BrandMark size={56} />
            <Text className="mt-4 text-center font-display text-[26px] tracking-tighter text-cream">
              Crée ton compte
            </Text>
            <Text className="mt-2 text-center font-body text-[13.5px] text-cream-dim">
              Rejoins tes amis et lance ton premier défi.
            </Text>
          </Reveal>

          {/* Avatar : couleur, icône, avatar rigolo ou photo */}
          <Reveal delay={60} className="mb-6 items-center">
            <Pressable onPress={() => setPickerOpen(true)} className="items-center" hitSlop={6}>
              <View style={{ width: 88, height: 88 }}>
                <Avatar
                  uri={avatarPreviewUri}
                  color={avatar.color}
                  icon={avatarPreviewUri ? null : avatar.icon}
                  name={firstNameValue}
                  size={88}
                />
                <View
                  style={{
                    position: "absolute",
                    bottom: 0,
                    right: 0,
                    width: 28,
                    height: 28,
                    borderRadius: 14,
                    backgroundColor: colors.coral,
                    alignItems: "center",
                    justifyContent: "center",
                    borderWidth: 3,
                    borderColor: colors.ink,
                  }}
                >
                  <Palette size={13} color={colors.onCoral} strokeWidth={2.6} />
                </View>
              </View>
              <Text className="mt-2 font-body-medium text-[12px] text-cream-dim">
                Personnaliser mon avatar
              </Text>
            </Pressable>
          </Reveal>

          <View className="gap-[18px]">
            <Reveal delay={100}>
              <Controller
                control={control}
                name="firstName"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Prénom"
                    icon={User}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(t) => {
                      onChange(t);
                      clearSubmitError();
                    }}
                    placeholder="Romain"
                    autoCapitalize="words"
                    autoComplete="given-name"
                    error={errors.firstName?.message}
                  />
                )}
              />
            </Reveal>

            <Reveal delay={140}>
              <Controller
                control={control}
                name="username"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Pseudo"
                    icon={AtSign}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(t) => {
                      onChange(t);
                      clearErrors("username");
                      clearSubmitError();
                    }}
                    placeholder="romz"
                    autoCapitalize="none"
                    autoComplete="username"
                    error={
                      errors.username?.message ??
                      (usernameTaken ? "Ce pseudo est déjà pris." : undefined)
                    }
                  />
                )}
              />

              {/* Pseudo déjà pris → alternatives disponibles, cliquables pour
                  remplir le champ (retour Romain : proposer une variante plutôt
                  que de laisser le joueur en inventer une à l'aveugle). */}
              {usernameTaken && usernameSuggestions.length > 0 ? (
                <View className="mt-2.5">
                  <Text className="mb-1.5 font-body text-[11.5px] text-cream-dim">
                    Pseudos disponibles :
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {usernameSuggestions.map((s) => (
                      <Pressable
                        key={s}
                        testID="username-suggestion"
                        onPress={() => {
                          setValue("username", s, { shouldValidate: true, shouldDirty: true });
                          clearErrors("username");
                        }}
                        hitSlop={6}
                        accessibilityRole="button"
                        accessibilityLabel={`Choisir le pseudo ${s}`}
                        className="flex-row items-center gap-1 rounded-full px-3 py-1.5 active:opacity-80"
                        style={{ backgroundColor: colors.coralSoft }}
                      >
                        <AtSign size={12} color={colors.coral} strokeWidth={2.4} />
                        <Text className="font-body-bold text-[12.5px] text-coral">{s}</Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : null}
            </Reveal>

            <Reveal delay={180}>
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Adresse e-mail"
                    icon={Mail}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(t) => {
                      onChange(t);
                      clearErrors("email");
                      setEmailTaken(false);
                      clearSubmitError();
                    }}
                    placeholder="ton@email.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    error={errors.email?.message}
                  />
                )}
              />
              {/* Adresse déjà inscrite : la bonne action n'est pas de corriger le
                  champ, c'est d'aller se connecter. On l'offre directement. */}
              {emailTaken ? (
                <Pressable
                  onPress={() =>
                    router.push({ pathname: "/sign-in", params: { email: emailValue } } as never)
                  }
                  hitSlop={8}
                  className="mt-2 flex-row items-center gap-1.5 self-start py-1"
                >
                  <Text className="font-body-bold text-[12.5px] text-coral">
                    Me connecter avec cet e-mail
                  </Text>
                  <ArrowRight size={14} color={colors.coral} strokeWidth={2.4} />
                </Pressable>
              ) : null}
            </Reveal>

            <Reveal delay={220}>
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Mot de passe"
                    icon={Lock}
                    value={value}
                    onFocus={() => setPwdFocused(true)}
                    onBlur={() => {
                      setPwdFocused(false);
                      onBlur();
                    }}
                    onChangeText={(t) => {
                      onChange(t);
                      clearSubmitError();
                    }}
                    placeholder="8 caractères minimum"
                    secureTextEntry
                    noCopy
                    autoComplete="new-password"
                  />
                )}
              />
              <PasswordStrength
                password={passwordValue}
                visible={pwdFocused || passwordValue.length > 0}
              />
            </Reveal>

            <Reveal delay={260}>
              <Controller
                control={control}
                name="confirmPassword"
                render={({ field: { onChange, onBlur, value } }) => (
                  <TextField
                    label="Confirmer le mot de passe"
                    icon={ShieldCheck}
                    value={value}
                    onBlur={onBlur}
                    onChangeText={(t) => {
                      onChange(t);
                      clearSubmitError();
                    }}
                    placeholder="Saisis-le à nouveau"
                    secureTextEntry
                    noPaste
                    autoComplete="new-password"
                    error={errors.confirmPassword?.message}
                  />
                )}
              />
            </Reveal>

            {/* Confidentialité — posée ici plutôt qu'après coup dans les réglages :
                c'est au moment de choisir son pseudo qu'on se demande qui pourra
                le retrouver. Modifiable ensuite dans les Paramètres. */}
            <Reveal delay={280}>
              <PrivacyToggleCard value={searchable} onChange={setSearchable} />
            </Reveal>
          </View>

          <Reveal delay={300} className="mt-7 gap-3.5">
            {submitError ? (
              <View className="flex-row items-center gap-2 rounded-input border border-red/30 bg-red-soft px-3.5 py-3">
                <AlertCircle size={18} color={colors.red} />
                <Text className="flex-1 font-body-medium text-[13px] text-red">{submitError}</Text>
              </View>
            ) : null}

            <GradientButton
              onPress={needsRetry ? onRetry : handleSubmit(onSubmit)}
              loading={submitting}
              disabled={!isValid || usernameTaken}
            >
              {needsRetry ? "Réessayer d'enregistrer mon profil" : "Créer mon compte"}
            </GradientButton>

            {needsRetry ? (
              <Pressable onPress={onSkipProfile} hitSlop={8} className="items-center py-1">
                <Text className="font-body-semibold text-[12.5px] text-cream-dim">
                  Continuer sans avatar (modifiable dans le profil)
                </Text>
              </Pressable>
            ) : null}

            {isGoogleConfigured && !needsRetry ? (
              <>
                <View className="flex-row items-center gap-3">
                  <View className="h-px flex-1 bg-line" />
                  <Text className="font-body text-[12px] text-cream-dim">ou</Text>
                  <View className="h-px flex-1 bg-line" />
                </View>
                <GoogleSignInButton />
              </>
            ) : null}

            <Text className="mt-1 px-2 text-center font-body text-[11px] leading-4 text-cream-dim">
              En créant un compte, tu acceptes nos Conditions d'utilisation et notre Politique de
              confidentialité.
            </Text>
          </Reveal>
        </ScrollView>

        <View className="items-center px-[24px] pb-4 pt-2">
          <Pressable onPress={() => router.push("/sign-in")} hitSlop={8}>
            <Text className="font-body text-[13px] text-cream-dim">
              Déjà un compte ? <Text className="font-body-bold text-coral">Se connecter</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <AvatarPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={setAvatar}
        value={{
          color: avatar.color,
          icon: avatar.icon,
          url: avatar.generatedUrl,
          photo: avatar.photo,
          name: firstNameValue,
          seed: usernameValue || firstNameValue,
        }}
      />
    </ScreenContainer>
  );
}
