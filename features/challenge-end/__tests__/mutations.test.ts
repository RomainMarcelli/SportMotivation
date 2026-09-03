import { mapUnlockError } from "../mutations";

describe("mapUnlockError", () => {
  it("explique pourquoi la clôture attend encore des votes", () => {
    expect(mapUnlockError("PENDING_VOTES")).toMatch(/encore en cours de vote/i);
  });
});
