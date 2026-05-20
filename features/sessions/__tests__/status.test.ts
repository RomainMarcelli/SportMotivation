import { sessionStatusMeta } from "../status";

describe("sessionStatusMeta", () => {
  it("renvoie libellé et ton pour chaque statut", () => {
    expect(sessionStatusMeta("pending_vote")).toEqual({ label: "En attente de vote", tone: "amber" });
    expect(sessionStatusMeta("validated")).toEqual({ label: "Validée", tone: "green" });
    expect(sessionStatusMeta("rejected")).toEqual({ label: "Rejetée", tone: "red" });
    expect(sessionStatusMeta("expired")).toEqual({ label: "Expirée", tone: "neutral" });
  });
});
