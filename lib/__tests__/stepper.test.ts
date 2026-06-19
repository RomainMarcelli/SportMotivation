import { stepValue } from "@/lib/stepper";

const opts = { min: 1, max: 14, step: 1 };

describe("stepValue", () => {
  it("incrémente et décrémente du pas", () => {
    expect(stepValue(4, "inc", opts)).toBe(5);
    expect(stepValue(4, "dec", opts)).toBe(3);
  });

  it("borne au min et au max", () => {
    expect(stepValue(1, "dec", opts)).toBe(1);
    expect(stepValue(14, "inc", opts)).toBe(14);
  });

  it("respecte un pas personnalisé sans dépasser les bornes", () => {
    const o = { min: 5, max: 180, step: 5 };
    expect(stepValue(20, "inc", o)).toBe(25);
    expect(stepValue(178, "inc", o)).toBe(180);
    expect(stepValue(7, "dec", o)).toBe(5);
  });
});
