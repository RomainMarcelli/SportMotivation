import { isProfileComplete, type UserProfile } from "../useProfile";

function makeProfile(overrides: Partial<UserProfile> = {}): UserProfile {
  return {
    id: "user-1",
    email: "a@b.com",
    first_name: "Romain",
    last_name: "Martin",
    username: "romz",
    avatar_url: null,
    expo_push_token: null,
    created_at: "2026-05-19T00:00:00Z",
    updated_at: "2026-05-19T00:00:00Z",
    ...overrides,
  };
}

describe("isProfileComplete", () => {
  it("retourne true si prénom et nom sont remplis", () => {
    expect(isProfileComplete(makeProfile())).toBe(true);
  });

  it("retourne false si le prénom manque", () => {
    expect(isProfileComplete(makeProfile({ first_name: null }))).toBe(false);
  });

  it("retourne false si le nom manque", () => {
    expect(isProfileComplete(makeProfile({ last_name: null }))).toBe(false);
  });

  it("retourne false pour null ou undefined", () => {
    expect(isProfileComplete(null)).toBe(false);
    expect(isProfileComplete(undefined)).toBe(false);
  });
});
