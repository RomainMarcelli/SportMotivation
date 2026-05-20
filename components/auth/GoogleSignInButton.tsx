import { Button } from "@/components/ui/Button";
import { useGoogleAuth } from "@/features/auth/google";

/**
 * Bouton "Continuer avec Google". Monté uniquement quand isGoogleConfigured est vrai
 * (sinon useGoogleAuth → Google.useAuthRequest lève une exception sur Android).
 */
export function GoogleSignInButton() {
  const google = useGoogleAuth();
  return (
    <Button
      variant="secondary"
      onPress={google.signIn}
      disabled={!google.isReady}
      loading={google.isPending}
    >
      Continuer avec Google
    </Button>
  );
}
