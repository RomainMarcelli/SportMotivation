import { excuseFormSchema } from "../schemas";

/**
 * Validation du formulaire « Déclarer une excuse ». Deux règles portent tout le
 * sens métier : le type doit être `standard` ou `major`, et un motif non vide
 * est OBLIGATOIRE (le groupe vote sur ce motif, une excuse sans texte n'a aucun
 * sens). Le `.trim()` évite qu'un motif fait uniquement d'espaces passe.
 */
describe("excuseFormSchema", () => {
  it("accepte une excuse valide", () => {
    const r = excuseFormSchema.safeParse({ excuseType: "standard", reason: "Grippe" });
    expect(r.success).toBe(true);
  });

  it("accepte le type majeur", () => {
    expect(
      excuseFormSchema.safeParse({ excuseType: "major", reason: "Hospitalisation" }).success
    ).toBe(true);
  });

  it("rejette un type inconnu", () => {
    expect(excuseFormSchema.safeParse({ excuseType: "mineur", reason: "x" }).success).toBe(false);
  });

  it("rejette un motif vide", () => {
    const r = excuseFormSchema.safeParse({ excuseType: "standard", reason: "" });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0].message).toBe("Le motif est obligatoire");
  });

  // Un motif de seuls espaces est vide une fois nettoyé → doit être rejeté.
  it("rejette un motif composé uniquement d'espaces", () => {
    expect(excuseFormSchema.safeParse({ excuseType: "standard", reason: "    " }).success).toBe(
      false
    );
  });

  // Le motif renvoyé est nettoyé (trim) : pas d'espaces parasites en base.
  it("nettoie les espaces autour du motif", () => {
    const r = excuseFormSchema.safeParse({ excuseType: "standard", reason: "  Blessure  " });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.reason).toBe("Blessure");
  });

  it("accepte pile 500 caractères mais rejette 501", () => {
    expect(
      excuseFormSchema.safeParse({ excuseType: "standard", reason: "a".repeat(500) }).success
    ).toBe(true);
    expect(
      excuseFormSchema.safeParse({ excuseType: "standard", reason: "a".repeat(501) }).success
    ).toBe(false);
  });
});
