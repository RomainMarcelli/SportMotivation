import {
  AVATAR_COLORS,
  AVATAR_ICONS,
  AVATAR_ICON_KEYS,
  DICEBEAR_STYLES,
  avatarIconFor,
  dicebearSeeds,
  dicebearUrl,
  isDicebearUrl,
} from "@/constants/avatars";

describe("catalogue d'avatars", () => {
  it("propose une palette non vide et sans doublon", () => {
    expect(AVATAR_COLORS.length).toBeGreaterThanOrEqual(6);
    expect(new Set(AVATAR_COLORS).size).toBe(AVATAR_COLORS.length);
  });

  it("n'expose que des couleurs hexadécimales valides", () => {
    for (const color of AVATAR_COLORS) {
      expect(color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });

  // L'ordre d'affichage et le dictionnaire doivent rester synchronisés, sinon
  // une icône choisie par un joueur pourrait ne plus apparaître dans la grille.
  it("garde AVATAR_ICON_KEYS et AVATAR_ICONS alignés", () => {
    expect(AVATAR_ICON_KEYS.length).toBe(Object.keys(AVATAR_ICONS).length);
    for (const key of AVATAR_ICON_KEYS) {
      expect(AVATAR_ICONS[key]).toBeDefined();
    }
  });
});

describe("avatarIconFor", () => {
  it("retrouve une icône connue", () => {
    expect(avatarIconFor("dumbbell")).toBe(AVATAR_ICONS.dumbbell);
  });

  // Une icône retirée du catalogue ne doit pas faire planter un vieux profil.
  it("renvoie null pour une clé inconnue ou vide", () => {
    expect(avatarIconFor("licorne")).toBeNull();
    expect(avatarIconFor(null)).toBeNull();
    expect(avatarIconFor("")).toBeNull();
  });
});

describe("dicebearUrl", () => {
  it("construit une URL PNG avec la graine", () => {
    const url = dicebearUrl("bottts", "romz");
    expect(url).toBe("https://api.dicebear.com/9.x/bottts/png?seed=romz&size=256");
  });

  it("encode les graines exotiques", () => {
    expect(dicebearUrl("bottts", "jean pierre")).toContain("seed=jean%20pierre");
  });

  it("a une graine de repli quand le pseudo est vide", () => {
    expect(dicebearUrl("bottts", "   ")).toContain("seed=sportmotiv");
  });

  it("couvre tous les styles proposés", () => {
    for (const style of DICEBEAR_STYLES) {
      expect(dicebearUrl(style.key, "x")).toContain(`/${style.key}/png`);
    }
  });
});

describe("isDicebearUrl", () => {
  it("distingue un avatar généré d'une photo uploadée", () => {
    expect(isDicebearUrl(dicebearUrl("bottts", "romz"))).toBe(true);
    expect(isDicebearUrl("https://xyz.supabase.co/storage/v1/avatars/a.jpg")).toBe(false);
    expect(isDicebearUrl(null)).toBe(false);
    expect(isDicebearUrl("")).toBe(false);
  });
});

describe("dicebearSeeds", () => {
  it("renvoie le nombre demandé de graines uniques", () => {
    const seeds = dicebearSeeds("romz", 12);
    expect(seeds).toHaveLength(12);
    expect(new Set(seeds).size).toBe(12);
  });

  it("commence par la graine de l'utilisateur", () => {
    expect(dicebearSeeds("romz")[0]).toBe("romz");
  });

  it("reste stable d'un rendu à l'autre", () => {
    expect(dicebearSeeds("romz")).toEqual(dicebearSeeds("romz"));
  });
});
