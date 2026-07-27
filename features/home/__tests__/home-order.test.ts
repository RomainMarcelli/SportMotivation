import { moveInList, orderGroups } from "../home-order";

describe("orderGroups", () => {
  it("place les défis choisis en tête, dans l'ordre voulu", () => {
    expect(orderGroups(["a", "b", "c"], ["c", "a"])).toEqual(["c", "a", "b"]);
  });

  it("laisse l'ordre d'origine quand aucune préférence", () => {
    expect(orderGroups(["a", "b"], [])).toEqual(["a", "b"]);
  });

  // Un défi rejoint après le dernier réglage n'est pas dans `order` → il va à la
  // fin plutôt que de disparaître.
  it("ajoute un nouveau défi à la fin", () => {
    expect(orderGroups(["a", "b", "c"], ["b", "a"])).toEqual(["b", "a", "c"]);
  });

  // Un défi quitté reste peut-être dans `order` : on l'ignore proprement.
  it("ignore un identifiant qui n'existe plus", () => {
    expect(orderGroups(["a", "b"], ["x", "b"])).toEqual(["b", "a"]);
  });

  it("ne mute pas les tableaux d'entrée", () => {
    const ids = ["a", "b"];
    const order = ["b"];
    orderGroups(ids, order);
    expect(ids).toEqual(["a", "b"]);
    expect(order).toEqual(["b"]);
  });
});

describe("moveInList", () => {
  it("descend un élément d'un cran", () => {
    expect(moveInList(["a", "b", "c"], "a", 1)).toEqual(["b", "a", "c"]);
  });

  it("monte un élément d'un cran", () => {
    expect(moveInList(["a", "b", "c"], "c", -1)).toEqual(["a", "c", "b"]);
  });

  it("ne fait rien à la première position vers le haut", () => {
    expect(moveInList(["a", "b", "c"], "a", -1)).toEqual(["a", "b", "c"]);
  });

  it("ne fait rien à la dernière position vers le bas", () => {
    expect(moveInList(["a", "b", "c"], "c", 1)).toEqual(["a", "b", "c"]);
  });

  it("ne fait rien pour un identifiant absent", () => {
    expect(moveInList(["a", "b"], "x", 1)).toEqual(["a", "b"]);
  });

  it("renvoie un nouveau tableau (immuable)", () => {
    const ids = ["a", "b"];
    expect(moveInList(ids, "a", 1)).not.toBe(ids);
    expect(ids).toEqual(["a", "b"]);
  });
});
