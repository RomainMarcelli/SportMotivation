import { AVATAR_COLORS } from "@/constants/avatars";

import {
  displayName,
  fallbackColor,
  initialsFrom,
  initialsFromName,
  resolveAvatar,
} from "../avatar";

describe("initialsFromName", () => {
  it("prend la première lettre des deux premiers mots", () => {
    expect(initialsFromName("Romain Marcelli")).toBe("RM");
  });

  it("prend deux lettres quand il n'y a qu'un mot", () => {
    expect(initialsFromName("Romain")).toBe("RO");
  });

  it("ignore les espaces multiples", () => {
    expect(initialsFromName("  Jean   Pierre  ")).toBe("JP");
  });

  it("renvoie une chaîne vide pour un nom vide", () => {
    expect(initialsFromName("   ")).toBe("");
  });
});

describe("initialsFrom", () => {
  it("combine prénom et nom", () => {
    expect(initialsFrom({ first_name: "Romain", last_name: "Marcelli" })).toBe("RM");
  });

  it("se rabat sur le prénom seul", () => {
    expect(initialsFrom({ first_name: "Romain" })).toBe("RO");
  });

  it("gère un prénom qui contient déjà le nom complet", () => {
    expect(initialsFrom({ first_name: "Romain Marcelli" })).toBe("RM");
  });

  it("se rabat sur le pseudo", () => {
    expect(initialsFrom({ username: "romz" })).toBe("RO");
  });

  it("ne renvoie jamais du vide", () => {
    expect(initialsFrom({})).toBe("?");
    expect(initialsFrom({ first_name: "  ", username: "" })).toBe("?");
  });
});

describe("fallbackColor", () => {
  it("renvoie toujours une couleur de la palette", () => {
    expect(AVATAR_COLORS).toContain(fallbackColor("user-42"));
  });

  it("est déterministe (pas de clignotement entre deux rendus)", () => {
    expect(fallbackColor("user-42")).toBe(fallbackColor("user-42"));
  });

  it("distingue deux utilisateurs différents", () => {
    const colors = new Set(
      ["a", "b", "c", "d", "e", "f", "g", "h"].map((k) => fallbackColor(k))
    );
    expect(colors.size).toBeGreaterThan(1);
  });

  it("a un repli pour une clé vide", () => {
    expect(fallbackColor(null)).toBe(AVATAR_COLORS[0]);
    expect(fallbackColor("  ")).toBe(AVATAR_COLORS[0]);
  });
});

describe("displayName", () => {
  it("préfère prénom + nom", () => {
    expect(displayName({ first_name: "Romain", last_name: "Marcelli", username: "romz" })).toBe(
      "Romain Marcelli"
    );
  });

  it("se rabat sur le pseudo", () => {
    expect(displayName({ username: "romz" })).toBe("romz");
  });

  it("renvoie une chaîne vide si on ne sait rien", () => {
    expect(displayName({})).toBe("");
  });
});

describe("resolveAvatar", () => {
  it("priorise l'image sur tout le reste", () => {
    const result = resolveAvatar({
      avatar_url: "https://example.com/a.png",
      avatar_icon: "dumbbell",
      avatar_color: "#FF6A45",
      first_name: "Romain",
    });
    expect(result).toEqual({ kind: "image", uri: "https://example.com/a.png", color: "#FF6A45" });
  });

  it("choisit l'icône quand il n'y a pas d'image", () => {
    const result = resolveAvatar({ avatar_icon: "bike", avatar_color: "#5FE0A8" });
    expect(result).toEqual({ kind: "icon", icon: "bike", color: "#5FE0A8" });
  });

  it("retombe sur les initiales", () => {
    const result = resolveAvatar({ first_name: "Romain", last_name: "Marcelli" });
    expect(result.kind).toBe("initials");
    if (result.kind === "initials") expect(result.initials).toBe("RM");
  });

  // Une URL vide en base ne doit pas produire une <Image src=""> cassée.
  it("traite une URL vide comme absente", () => {
    expect(resolveAvatar({ avatar_url: "   ", avatar_icon: "flame" }).kind).toBe("icon");
  });

  it("traite une icône vide comme absente", () => {
    expect(resolveAvatar({ avatar_icon: "", first_name: "Romain" }).kind).toBe("initials");
  });

  it("résout toujours une couleur, même sans rien de choisi", () => {
    const result = resolveAvatar({ id: "user-1" });
    expect(AVATAR_COLORS).toContain(result.color);
  });

  it("supporte un profil null", () => {
    expect(resolveAvatar(null).kind).toBe("initials");
  });
});
