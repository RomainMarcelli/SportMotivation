/** Contact du support et libellés de la section « Région » (purs, testables). */

/** Adresse de contact — à changer ici, elle n'est écrite nulle part ailleurs. */
export const SUPPORT_EMAIL = "admin@vyzor.fr";

export type SupportContext = {
  version: string;
  platform: string;
  osVersion?: string | null;
  /** Pseudo ou e-mail : de quoi retrouver le compte concerné. */
  account?: string | null;
};

/**
 * Lien `mailto:` pré-rempli.
 *
 * La version et la plateforme sont incluses d'office : ce sont les deux
 * informations qu'on redemande systématiquement, et que personne ne pense à
 * donner spontanément.
 */
export function supportMailto(context: SupportContext): string {
  const subject = `Sport Motiv ${context.version} — besoin d'aide`;
  const lines = [
    "Décris ton problème ici :",
    "",
    "",
    "———",
    `Version : ${context.version}`,
    `Appareil : ${context.platform}${context.osVersion ? ` ${context.osVersion}` : ""}`,
  ];
  if (context.account) lines.push(`Compte : ${context.account}`);

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(
    lines.join("\n")
  )}`;
}

/**
 * « Europe/Paris » → « Paris ». Les identifiants IANA sont exacts mais illisibles ;
 * seule la ville intéresse quelqu'un qui vérifie l'heure de clôture du dimanche.
 */
export function timezoneLabel(timezone: string | undefined | null): string {
  if (!timezone) return "—";
  const city = timezone.split("/").pop();
  if (!city) return timezone;
  return city.replace(/_/g, " ");
}

/** Fuseau détecté sur l'appareil, ou `null` si l'environnement ne le donne pas. */
export function detectTimezone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}
