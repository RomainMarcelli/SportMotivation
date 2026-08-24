/**
 * Justificatif d'excuse : image (JPG/PNG) **ou PDF** (fréquent pour un certificat médical).
 * Ce module reste **pur** (aucun import natif) pour être testable ; le sélecteur de fichier
 * vit dans `pick-justification.ts`.
 */

export type JustificationKind = "image" | "pdf";

export type Justification = {
  uri: string;
  name: string;
  mime: string;
  kind: JustificationKind;
  /** Contenu binaire prêt pour l'upload Storage. */
  bytes: Uint8Array;
  /** Taille en octets si connue. */
  size: number | null;
};

/** Déduit le type de justificatif du MIME, avec repli sur l'extension du nom/chemin. */
export function kindFromMime(mime: string | null | undefined, name: string): JustificationKind {
  if (mime?.startsWith("image/")) return "image";
  if (mime === "application/pdf") return "pdf";
  return name.toLowerCase().endsWith(".pdf") ? "pdf" : "image";
}

/** Extension de fichier à utiliser pour le chemin Storage. */
export function extFromMime(mime: string | null | undefined, name: string): string {
  if (kindFromMime(mime, name) === "pdf") return "pdf";
  const sub = mime?.split("/")[1];
  return sub && /^[a-z0-9]+$/i.test(sub) ? sub : "jpg";
}

/** Taille lisible à la française : « 1,2 Mo », « 340 Ko ». */
export function formatFileSize(size: number | null | undefined): string {
  if (!size || size <= 0) return "";
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1).replace(".", ",")} Mo`;
}
