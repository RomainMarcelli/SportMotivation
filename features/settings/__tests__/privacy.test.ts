import {
  DEFAULT_IS_SEARCHABLE,
  privacyLabel,
  privacySummary,
  readIsSearchable,
} from "../privacy";

describe("privacy", () => {
  it("est public par défaut", () => {
    expect(DEFAULT_IS_SEARCHABLE).toBe(true);
  });

  it("libellé selon l'état", () => {
    expect(privacyLabel(true)).toBe("Public");
    expect(privacyLabel(false)).toBe("Privé");
  });

  it("résume ce que chaque état change, à la 2e personne", () => {
    expect(privacySummary(true)).toMatch(/trouver/i);
    expect(privacySummary(false)).toMatch(/code|lien/i);
  });

  // Un profil pas encore chargé (ou champ absent d'un vieux payload) = public :
  // on ne rend personne invisible par accident.
  it("considère public tout profil indéterminé", () => {
    expect(readIsSearchable(undefined)).toBe(true);
    expect(readIsSearchable(null)).toBe(true);
    expect(readIsSearchable({})).toBe(true);
    expect(readIsSearchable({ is_searchable: null })).toBe(true);
  });

  it("respecte un choix explicite", () => {
    expect(readIsSearchable({ is_searchable: false })).toBe(false);
    expect(readIsSearchable({ is_searchable: true })).toBe(true);
  });
});
