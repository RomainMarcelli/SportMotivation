import {
  Activity,
  Bike,
  Dumbbell,
  Footprints,
  Medal,
  Mountain,
  Sailboat,
  Volleyball,
  Waves,
} from "lucide-react-native";

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

  it("couvre les familles élargies (sports de balle, nautique, montagne)", () => {
    expect(getSportIcon("Football")).toBe(Volleyball);
    expect(getSportIcon("Padel")).toBe(Volleyball);
    expect(getSportIcon("Voile")).toBe(Sailboat);
    expect(getSportIcon("Kayak")).toBe(Sailboat);
    expect(getSportIcon("Escalade")).toBe(Mountain);
  });

  // Aucune icône « cheval » n'existe : on retombe sur la médaille (proxy « sport »).
  it("donne une icône à l'équitation", () => {
    expect(getSportIcon("Équitation")).toBe(Medal);
    expect(getSportIcon("cheval")).toBe(Medal);
  });

  it("retombe sur l'icône générique pour une activité non sportive", () => {
    expect(getSportIcon("Échecs")).toBe(Activity);
    expect(getSportIcon("Lecture")).toBe(Activity);
  });
});
