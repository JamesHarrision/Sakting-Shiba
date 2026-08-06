import { describe, expect, it } from "vitest";

import { PlayerProfileStore } from "../../gameplay/PlayerProfileStore";

class MemoryStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe("PlayerProfileStore", () => {
  it("persists wallet, purchases, equipment and tutorial state", () => {
    const storage = new MemoryStorage();
    const first = new PlayerProfileStore(storage);
    first.addCoins(200);
    expect(first.purchase("cat.calico", 120)).toBe(true);
    expect(first.equip("cat", "cat.calico")).toBe(true);
    first.completeTutorial();
    expect(first.recordRun(425, 182.7).isNewBestScore).toBe(true);

    const restored = new PlayerProfileStore(storage).getSnapshot();
    expect(restored.coins).toBe(80);
    expect(restored.ownedCosmetics).toContain("cat.calico");
    expect(restored.equippedCat).toBe("cat.calico");
    expect(restored.tutorialCompleted).toBe(true);
    expect(restored.bestScore).toBe(425);
    expect(restored.bestDistance).toBe(182.7);
    expect(restored.totalRuns).toBe(1);
  });

  it("rejects unaffordable, duplicate and unowned actions", () => {
    const store = new PlayerProfileStore(new MemoryStorage());
    expect(store.purchase("board.neon", 1)).toBe(false);
    store.addCoins(10);
    expect(store.purchase("board.neon", 10)).toBe(true);
    expect(store.purchase("board.neon", 10)).toBe(false);
    expect(store.equip("board", "board.unknown")).toBe(false);
    expect(store.equip("board", "board.neon")).toBe(true);
  });

  it("keeps personal records while counting every completed run", () => {
    const store = new PlayerProfileStore(new MemoryStorage());
    store.recordRun(500, 200);
    expect(store.recordRun(450, 240)).toEqual({
      isNewBestScore: false,
      isNewBestDistance: true
    });
    expect(store.getSnapshot()).toMatchObject({
      bestScore: 500,
      bestDistance: 240,
      totalRuns: 2
    });
  });
});
