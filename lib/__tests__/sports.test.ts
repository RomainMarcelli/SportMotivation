import { Activity, Bike, Dumbbell, Footprints, Waves } from "lucide-react-native";

import { getSportIcon, normalizeSport } from "@/lib/sports";

describe("normalizeSport", () => {
  it("retire les accents, la casse et compacte les espaces", () => {
    expect(normalizeSport("  Vélo  de   route ")).toBe("velo de route");
    expect(normalizeSport("Natation")).toBe("natation");
  });
});

describe("getSportIcon", () => {
  it("mappe les sports connus (insensible aux accents/casse)", () => {
    expect(getSportIcon("Course à pied")).toBe(Footprints);
    expect(getSportIcon("VÉLO")).toBe(Bike);
    expect(getSportIcon("Musculation")).toBe(Dumbbell);
    expect(getSportIcon("natation")).toBe(Waves);
  });

  it("retombe sur l'icône générique pour un sport inconnu", () => {
    expect(getSportIcon("Pétanque")).toBe(Activity);
  });
});
