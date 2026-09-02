import {
  DEFAULT_INTERESTS,
  interestLabel,
  interestSearchConfig,
  slugInterest,
} from "@/constants/interests";

import { mockPlaces } from "../mock";
import { haversineKm, priceLabel, rankPlaces, scorePlace } from "../scoring";
import type { RawPlace } from "../types";

const CENTER = { lat: 48.8566, lng: 2.3522 };

function place(over: Partial<RawPlace> = {}): RawPlace {
  return {
    id: "p1",
    name: "Lieu",
    interestKey: "restaurant",
    address: null,
    rating: 4,
    userRatingCount: 100,
    priceLevel: null,
    lat: CENTER.lat,
    lng: CENTER.lng,
    googleMapsUri: null,
    types: [],
    ...over,
  };
}

describe("priceLabel", () => {
  it("mappe les paliers connus", () => {
    expect(priceLabel("PRICE_LEVEL_INEXPENSIVE")).toBe("€");
    expect(priceLabel("PRICE_LEVEL_MODERATE")).toBe("€€");
    expect(priceLabel("PRICE_LEVEL_EXPENSIVE")).toBe("€€€");
    expect(priceLabel("PRICE_LEVEL_VERY_EXPENSIVE")).toBe("€€€€");
  });

  it("n'invente JAMAIS un prix : inconnu/absent → « Prix à consulter »", () => {
    expect(priceLabel(null)).toBe("Prix à consulter");
    expect(priceLabel(undefined)).toBe("Prix à consulter");
    expect(priceLabel("PRICE_LEVEL_FREE")).toBe("Prix à consulter");
    expect(priceLabel("PRICE_LEVEL_UNSPECIFIED")).toBe("Prix à consulter");
    expect(priceLabel("n'importe quoi")).toBe("Prix à consulter");
  });
});

describe("haversineKm", () => {
  it("vaut 0 pour le même point", () => {
    expect(haversineKm(CENTER, CENTER)).toBeCloseTo(0, 5);
  });

  it("approxime une distance connue (Paris → Lyon ≈ 392 km)", () => {
    const lyon = { lat: 45.7578, lng: 4.832 };
    expect(haversineKm(CENTER, lyon)).toBeGreaterThan(380);
    expect(haversineKm(CENTER, lyon)).toBeLessThan(405);
  });
});

describe("scorePlace", () => {
  it("préfère une meilleure note, toutes choses égales par ailleurs", () => {
    const good = place({ rating: 4.8 });
    const meh = place({ rating: 3.2 });
    expect(scorePlace(good, CENTER)).toBeGreaterThan(scorePlace(meh, CENTER));
  });

  it("pénalise la distance", () => {
    const near = place({ lat: CENTER.lat, lng: CENTER.lng });
    const far = place({ lat: CENTER.lat + 0.2, lng: CENTER.lng + 0.2 });
    expect(scorePlace(near, CENTER)).toBeGreaterThan(scorePlace(far, CENTER));
  });
});

describe("rankPlaces", () => {
  it("dédoublonne par id", () => {
    const ranked = rankPlaces([place({ id: "a" }), place({ id: "a" }), place({ id: "b" })], CENTER);
    expect(ranked).toHaveLength(2);
    expect(ranked.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("classe du meilleur au moins bon et enrichit distance + prix", () => {
    const ranked = rankPlaces(
      [
        place({ id: "far-bad", rating: 3, lat: CENTER.lat + 0.3, lng: CENTER.lng }),
        place({ id: "near-good", rating: 4.9, priceLevel: "PRICE_LEVEL_MODERATE" }),
      ],
      CENTER
    );
    expect(ranked[0].id).toBe("near-good");
    expect(ranked[0].priceLabel).toBe("€€");
    expect(ranked[0].distanceKm).toBeCloseTo(0, 3);
  });

  it("tronque à la limite", () => {
    const many = Array.from({ length: 40 }, (_, i) => place({ id: `p${i}` }));
    expect(rankPlaces(many, CENTER, 10)).toHaveLength(10);
  });

  it("distanceKm = null quand le centre est inconnu", () => {
    expect(rankPlaces([place()], null)[0].distanceKm).toBeNull();
  });
});

describe("catalogue d'intérêts", () => {
  it("résout la config de recherche d'une clé connue", () => {
    expect(interestSearchConfig("restaurant").includedTypes).toContain("restaurant");
  });

  it("retombe sur une recherche texte pour un intérêt libre", () => {
    expect(interestSearchConfig("accrobranche")).toEqual({ textQuery: "Accrobranche" });
  });

  it("slugifie sans accents ni ponctuation", () => {
    expect(slugInterest("Salle d'Escalade !")).toBe("salle_d_escalade");
    expect(slugInterest("  Café   Théâtre ")).toBe("cafe_theatre");
  });

  it("interestLabel humanise une clé hors catalogue", () => {
    expect(interestLabel("laser_game")).toBe("Laser game");
    expect(interestLabel("bar")).toBe("Bar");
  });
});

describe("mockPlaces", () => {
  it("est déterministe (mêmes entrées → mêmes lieux)", () => {
    const a = mockPlaces(DEFAULT_INTERESTS, CENTER);
    const b = mockPlaces(DEFAULT_INTERESTS, CENTER);
    expect(a).toEqual(b);
    expect(a.length).toBe(DEFAULT_INTERESTS.length * 4);
  });

  it("produit des lieux exploitables par rankPlaces", () => {
    const ranked = rankPlaces(mockPlaces(["restaurant"], CENTER), CENTER);
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked[0].interestKey).toBe("restaurant");
    expect(typeof ranked[0].priceLabel).toBe("string");
  });
});
