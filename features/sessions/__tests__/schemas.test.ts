import { buildDeclareSessionSchema, isValidUrl } from "../schemas";
import { startOfWeekMonday } from "@/lib/date";

const schema = buildDeclareSessionSchema({
  minDuration: 30,
  acceptedActivities: ["running", "cycling"],
});

const base = {
  activityType: "running",
  durationMin: 45,
  performedAt: new Date(), // aujourd'hui = toujours dans la semaine en cours
  proofType: "photo" as const,
  photoUri: "file:///tmp/p.jpg",
};

describe("buildDeclareSessionSchema", () => {
  it("accepte une séance photo valide", () => {
    expect(schema.safeParse(base).success).toBe(true);
  });

  it("accepte une activité hors liste (le warning est géré par l'écran, pas bloquant)", () => {
    const r = schema.safeParse({ ...base, activityType: "swimming" });
    expect(r.success).toBe(true);
  });

  it("refuse une activité vide", () => {
    expect(schema.safeParse({ ...base, activityType: "" }).success).toBe(false);
  });

  it("refuse une durée sous le minimum du groupe", () => {
    const r = schema.safeParse({ ...base, durationMin: 20 });
    expect(r.success).toBe(false);
  });

  it("refuse une date dans le futur", () => {
    const r = schema.safeParse({
      ...base,
      performedAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
    });
    expect(r.success).toBe(false);
  });

  it("refuse une date hors de la semaine en cours (semaine précédente)", () => {
    const lastWeek = new Date(startOfWeekMonday(new Date()).getTime() - 2 * 24 * 60 * 60 * 1000);
    const r = schema.safeParse({ ...base, performedAt: lastWeek });
    expect(r.success).toBe(false);
  });

  it("exige une photo pour une preuve photo", () => {
    const r = schema.safeParse({ ...base, photoUri: undefined });
    expect(r.success).toBe(false);
  });

  it("refuse une photo de galerie dont la date ne correspond pas au jour déclaré", () => {
    const r = schema.safeParse({
      ...base,
      photoTakenAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // il y a 1 mois
    });
    expect(r.success).toBe(false);
  });

  it("exige url + capture + description pour un lien externe", () => {
    const ok = schema.safeParse({
      ...base,
      proofType: "external_link",
      externalUrl: "https://strava.com/activities/1",
      externalDescription: "Sortie vélo",
      photoUri: "file:///tmp/screen.jpg",
    });
    expect(ok.success).toBe(true);

    const bad = schema.safeParse({
      ...base,
      proofType: "external_link",
      externalUrl: "pas-une-url",
      externalDescription: "",
      photoUri: undefined,
    });
    expect(bad.success).toBe(false);
  });

  it("exige une activité Strava sélectionnée pour une preuve strava", () => {
    const bad = schema.safeParse({ ...base, proofType: "strava", photoUri: undefined });
    expect(bad.success).toBe(false);
    const ok = schema.safeParse({
      ...base,
      proofType: "strava",
      photoUri: undefined,
      stravaActivityId: "12345",
    });
    expect(ok.success).toBe(true);
  });

  it("refuse une activité Strava qui ne date pas du jour déclaré", () => {
    const r = schema.safeParse({
      ...base,
      proofType: "strava",
      photoUri: undefined,
      stravaActivityId: "12345",
      stravaActivityDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    });
    expect(r.success).toBe(false);
  });
});

describe("isValidUrl", () => {
  it("valide http/https", () => {
    expect(isValidUrl("https://example.com")).toBe(true);
    expect(isValidUrl("http://example.com/x")).toBe(true);
  });
  it("rejette le reste", () => {
    expect(isValidUrl("ftp://x")).toBe(false);
    expect(isValidUrl("nope")).toBe(false);
    expect(isValidUrl(undefined)).toBe(false);
  });
});
