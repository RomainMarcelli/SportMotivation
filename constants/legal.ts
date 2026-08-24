import type { LucideIcon } from "lucide-react-native";
import {
  BadgeEuro,
  CalendarRange,
  Camera,
  Database,
  Eye,
  Flag,
  HeartPulse,
  LogOut,
  Scale,
  Server,
  ShieldCheck,
  Target,
  Trash2,
  TrendingUp,
  UserRound,
  Vote,
  Zap,
} from "lucide-react-native";

/**
 * Textes d'aide et textes légaux.
 *
 * ⚠ TEXTES PROVISOIRES pour les deux documents juridiques — rédigés pour que
 * l'app soit navigable, PAS relus par un juriste. À remplacer avant toute mise
 * en ligne publique : une politique de confidentialité inexacte engage la
 * responsabilité de l'éditeur.
 */

export type LegalDoc = "help" | "terms" | "privacy";

export type LegalSection = {
  heading: string;
  body: string;
  icon: LucideIcon;
  /** Teinte de la tuile d'icône : varie d'une section à l'autre pour rythmer la page. */
  tone: "coral" | "amber" | "mint";
};

export type LegalContent = {
  title: string;
  /** Phrase d'intro affichée sous le titre. */
  intro: string;
  /** `true` → bandeau « texte provisoire » en haut de l'écran. */
  draft: boolean;
  /**
   * `accordion` : questions repliées, on ouvre celle qui nous concerne.
   * `article`   : lecture continue, tout est déplié.
   */
  layout: "accordion" | "article";
  /** « L'essentiel » — ce qu'il faut retenir même sans lire la suite. */
  highlights?: string[];
  sections: LegalSection[];
};

export const LEGAL_DOCS: Record<LegalDoc, LegalContent> = {
  help: {
    title: "Centre d'aide",
    intro: "Les questions qui reviennent le plus souvent. Touche une question pour la réponse.",
    draft: false,
    layout: "accordion",
    sections: [
      {
        heading: "Comment fonctionne un défi ?",
        icon: Target,
        tone: "coral",
        body: "Tu fixes un objectif de séances par semaine et une pénalité par séance manquée. Chaque séance déclarée est soumise au vote des autres membres. Ce qui n'est pas tenu alimente la cagnotte du groupe, débloquée à la fin du défi.",
      },
      {
        heading: "Pourquoi ma séance attend un vote ?",
        icon: Vote,
        tone: "amber",
        body: "Une séance n'est validée qu'à la majorité des autres membres. Tant que le compte n'y est pas, elle reste « en attente ». Passé le délai de vote fixé par le groupe, elle est tranchée automatiquement.",
      },
      {
        heading: "Je suis dans plusieurs défis, je dois déclarer plusieurs fois ?",
        icon: TrendingUp,
        tone: "mint",
        body: "Non. Une séance déclarée compte dans tous tes défis en cours — tu ne l'as courue qu'une fois. Chaque groupe vote de son côté, avec ses propres membres : elle peut donc être validée dans l'un et refusée dans l'autre.",
      },
      {
        heading: "Je suis blessé, que faire ?",
        icon: HeartPulse,
        tone: "amber",
        body: "Déclare une excuse depuis ton groupe. Le groupe vote : une excuse standard réduit ton objectif d'une séance, une excuse majeure annule la semaine. Tu disposes aussi d'un joker par mois, utilisable sans vote.",
      },
      {
        heading: "Ma semaine commence quand ?",
        icon: CalendarRange,
        tone: "coral",
        body: "Le lundi à 00h00, et elle se clôture le dimanche à 23h59, sur le fuseau horaire de ton téléphone.",
      },
      {
        heading: "Puis-je changer d'objectif en cours de défi ?",
        icon: Flag,
        tone: "mint",
        body: "Non : l'objectif hebdomadaire est verrouillé au moment où tu rejoins le défi. C'est ce qui rend l'engagement crédible pour les autres.",
      },
      {
        heading: "Comment prouver une séance ?",
        icon: Camera,
        tone: "coral",
        body: "Trois moyens : une photo prise sur le moment (l'app vérifie la date), une activité Strava si tu as connecté ton compte, ou un lien externe accompagné d'une description.",
      },
      {
        heading: "Que devient mon historique si je quitte un groupe ?",
        icon: LogOut,
        tone: "amber",
        body: "Il est conservé pour le groupe : les séances déjà validées ne sont pas effacées. En revanche tu ne peux plus y déclarer de séance ni voter.",
      },
    ],
  },

  terms: {
    title: "Conditions d'utilisation",
    intro: "Les règles d'usage de Sport Motiv.",
    draft: true,
    layout: "article",
    highlights: [
      "L'application ne touche jamais à ton argent : les règlements se font entre vous.",
      "Une déclaration mensongère peut être refusée par le groupe et te valoir un blâme.",
      "Tu peux supprimer ton compte à tout moment depuis les Paramètres.",
    ],
    sections: [
      {
        heading: "Objet",
        icon: Target,
        tone: "coral",
        body: "Sport Motiv est une application de motivation sportive entre amis. Elle permet de créer un défi, d'y déclarer des séances et de les soumettre au vote des autres membres du groupe.",
      },
      {
        heading: "Ton compte",
        icon: UserRound,
        tone: "amber",
        body: "La création d'un compte nécessite une adresse e-mail valide. Tu es responsable de la confidentialité de ton mot de passe et des actions effectuées depuis ton compte.",
      },
      {
        heading: "Ce que tu déclares",
        icon: Camera,
        tone: "mint",
        body: "Tu garantis que les séances et justificatifs que tu publies correspondent à des activités réellement effectuées par toi. Toute déclaration mensongère peut être refusée par le groupe et entraîner un blâme.",
      },
      {
        heading: "La cagnotte",
        icon: BadgeEuro,
        tone: "amber",
        body: "Les montants affichés sont un décompte entre membres. Sport Motiv n'encaisse, ne détient et ne transfère aucune somme d'argent : les règlements se font directement entre les membres du groupe, par leurs propres moyens.",
      },
      {
        heading: "Suppression du compte",
        icon: Trash2,
        tone: "coral",
        body: "Tu peux supprimer ton compte à tout moment depuis les Paramètres. Les sommes éventuellement dues à un groupe restent conservées le temps de leur règlement.",
      },
      {
        heading: "Responsabilité",
        icon: Scale,
        tone: "mint",
        body: "La pratique sportive engage ta seule responsabilité. Consulte un médecin avant de reprendre une activité intense, et adapte les objectifs que tu t'imposes.",
      },
    ],
  },

  privacy: {
    title: "Politique de confidentialité",
    intro: "Ce que l'application collecte, et pourquoi.",
    draft: true,
    layout: "article",
    highlights: [
      "Aucune donnée n'est vendue ni utilisée à des fins publicitaires.",
      "Seuls les membres de tes groupes voient tes séances et tes preuves.",
      "Tu peux tout supprimer depuis les Paramètres.",
    ],
    sections: [
      {
        heading: "Données collectées",
        icon: Database,
        tone: "coral",
        body: "Prénom, nom, pseudo, adresse e-mail et photo de profil si tu en ajoutes une. Côté activité : tes séances déclarées, leurs justificatifs, tes excuses, tes votes et tes pénalités.",
      },
      {
        heading: "À quoi elles servent",
        icon: Target,
        tone: "amber",
        body: "Uniquement à faire fonctionner les défis : afficher ta progression, permettre aux membres de ton groupe de voter, et calculer la cagnotte. Aucune donnée n'est vendue ni utilisée à des fins publicitaires.",
      },
      {
        heading: "Qui voit quoi",
        icon: Eye,
        tone: "mint",
        body: "Les membres de tes groupes voient ton profil, tes séances et tes justificatifs. Personne en dehors de tes groupes n'y a accès.",
      },
      {
        heading: "Hébergement",
        icon: Server,
        tone: "amber",
        body: "Les données sont hébergées par Supabase. Les photos de séance sont stockées dans un espace privé, accessible aux seuls membres des groupes concernés.",
      },
      {
        heading: "Strava",
        icon: Zap,
        tone: "coral",
        body: "Si tu connectes Strava, l'application lit tes activités récentes pour te permettre de les joindre en preuve. L'accès est en lecture seule et révocable à tout moment, depuis les Paramètres ou depuis ton compte Strava.",
      },
      {
        heading: "Tes droits",
        icon: ShieldCheck,
        tone: "mint",
        body: "Tu peux corriger tes informations depuis ton profil et supprimer ton compte depuis les Paramètres. La suppression efface tes données, à l'exception des sommes dues à un groupe tant qu'elles ne sont pas réglées.",
      },
    ],
  },
};

/** `undefined` si le paramètre d'URL ne correspond à aucun document. */
export function getLegalDoc(doc: string | undefined): LegalContent | undefined {
  if (!doc) return undefined;
  return LEGAL_DOCS[doc as LegalDoc];
}

/**
 * Temps de lecture arrondi à la minute, minimum 1.
 * Annoncer « 2 min de lecture » en tête d'un texte légal évite l'effet mur.
 */
export function readingMinutes(content: LegalContent): number {
  const words = content.sections.reduce(
    (total, section) => total + section.body.split(/\s+/).length + section.heading.split(/\s+/).length,
    0
  );
  return Math.max(1, Math.round(words / 200));
}
