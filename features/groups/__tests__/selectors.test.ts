import { groupsView, pickActiveGroup } from "@/features/groups/selectors";

const g = (id: string, status: string) => ({ group: { id, status } });

describe("pickActiveGroup", () => {
  it("undefined si liste vide ou absente", () => {
    expect(pickActiveGroup(undefined)).toBeUndefined();
    expect(pickActiveGroup([])).toBeUndefined();
  });

  it("privilégie le 1er groupe `active`", () => {
    const groups = [g("a", "setup"), g("b", "active"), g("c", "active")];
    expect(pickActiveGroup(groups)?.group.id).toBe("b");
  });

  it("retombe sur le 1er groupe si aucun n'est actif", () => {
    const groups = [g("a", "setup"), g("c", "completed")];
    expect(pickActiveGroup(groups)?.group.id).toBe("a");
  });
});

describe("groupsView", () => {
  it("0 défi → empty", () => {
    expect(groupsView(undefined)).toEqual({ kind: "empty" });
    expect(groupsView([])).toEqual({ kind: "empty" });
  });

  it("1 défi → single avec son id", () => {
    expect(groupsView([g("solo", "active")])).toEqual({ kind: "single", groupId: "solo" });
  });

  it("2+ défis → list", () => {
    expect(groupsView([g("a", "active"), g("b", "setup")])).toEqual({ kind: "list" });
  });
});
