import { Activity, Volleyball } from "lucide-react-native";

import {
  activitiesDisplay,
  activitiesSummary,
  getActivityIcon,
  getActivityLabel,
} from "../activities";

describe("getActivityLabel", () => {
  it("traduit un identifiant connu", () => {
    expect(getActivityLabel("running")).toBe("Course");
  });

  // Un sport ajouté en base sans passer par le catalogue reste lisible.
  it("retombe sur l'identifiant brut", () => {
    expect(getActivityLabel("padel")).toBe("padel");
  });
});

describe("getActivityIcon", () => {
  // Un sport libre hors catalogue est passé au matcher par mots-clés (lib/sports) :
  // « padel » obtient donc une icône de balle, pas le repli générique.
  it("délègue les sports hors catalogue au matcher par mots-clés", () => {
    expect(getActivityIcon("padel")).toBe(Volleyball);
  });

  it("retombe sur l'icône générique pour un id sans correspondance", () => {
    expect(getActivityIcon("truc-inconnu")).toBe(Activity);
  });
});

describe("activitiesSummary", () => {
  const ALL = ["running", "cycling", "swimming", "yoga"];

  it("n'en montre que deux et compte le reste", () => {
    expect(activitiesSummary(ALL)).toEqual({
      label: "Course, Vélo",
      extra: 2,
      total: 4,
    });
  });

  // Liste courte : aucun « +0 » disgracieux.
  it("ne signale rien quand tout tient", () => {
    const summary = activitiesSummary(["running", "cycling"]);
    expect(summary.label).toBe("Course, Vélo");
    expect(summary.extra).toBe(0);
  });

  it("respecte une limite personnalisée", () => {
    expect(activitiesSummary(ALL, 3).label).toBe("Course, Vélo, Natation");
    expect(activitiesSummary(ALL, 3).extra).toBe(1);
  });

  // Une limite absurde ne doit pas produire une ligne vide.
  it("montre au moins une activité", () => {
    expect(activitiesSummary(ALL, 0).label).toBe("Course");
    expect(activitiesSummary(ALL, -5).extra).toBe(3);
  });

  it("gère un défi sans activité déclarée", () => {
    expect(activitiesSummary([])).toEqual({ label: "—", extra: 0, total: 0 });
  });
});

describe("activitiesDisplay", () => {
  it("montre tout en clair quand il y en a peu et court (≤ 3)", () => {
    expect(activitiesDisplay(["running", "cycling"])).toEqual({
      mode: "inline",
      label: "Course, Vélo",
      extra: 0,
      total: 2,
    });
    expect(activitiesDisplay(["running", "cycling", "swimming"])).toEqual({
      mode: "inline",
      label: "Course, Vélo, Natation", // 22 caractères → tient sur une ligne
      extra: 0,
      total: 3,
    });
  });

  it("bascule en popup dès qu'il y en a plus de 3", () => {
    expect(activitiesDisplay(["running", "cycling", "swimming", "yoga"])).toEqual({
      mode: "popup",
      label: "Course, Vélo",
      extra: 2,
      total: 4,
    });
  });

  // ≤ 3 mais trop long pour la ligne → popup quand même (« ou que c'est trop long »).
  it("bascule en popup quand 3 activités débordent", () => {
    const longIds = ["aaaaaaaaaa", "bbbbbbbbbb", "cccccccccc"]; // 34 caractères une fois jointes
    const d = activitiesDisplay(longIds);
    expect(d.mode).toBe("popup");
    expect(d.total).toBe(3);
    expect(d.extra).toBe(1);
    expect(d.label).toBe("aaaaaaaaaa, bbbbbbbbbb");
  });

  it("gère l'absence d'activité", () => {
    expect(activitiesDisplay([])).toEqual({ mode: "inline", label: "—", extra: 0, total: 0 });
  });
});
