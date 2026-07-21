import * as DocumentPicker from "expo-document-picker";
import { Platform } from "react-native";

import { kindFromMime, type Justification } from "./attachment";

/** Lit un fichier local en octets (web : fetch ; natif : expo-file-system SDK 54). */
async function readBytes(uri: string): Promise<Uint8Array> {
  if (Platform.OS === "web") {
    const res = await fetch(uri);
    return new Uint8Array(await res.arrayBuffer());
  }
  const { File } = await import("expo-file-system");
  return await new File(uri).bytes();
}

/**
 * Ouvre le sélecteur de fichier (image **ou PDF**) et renvoie le justificatif prêt à l'upload.
 * `null` si l'utilisateur annule.
 */
export async function pickJustification(): Promise<Justification | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["image/*", "application/pdf"],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.[0]) return null;

  const asset = result.assets[0];
  const name = asset.name || "justificatif";
  const mime =
    asset.mimeType ?? (name.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
  const bytes = await readBytes(asset.uri);

  return {
    uri: asset.uri,
    name,
    mime,
    kind: kindFromMime(mime, name),
    bytes,
    size: asset.size ?? null,
  };
}
