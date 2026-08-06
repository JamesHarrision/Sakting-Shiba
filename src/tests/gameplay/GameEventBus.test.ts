import { describe, expect, it, vi } from "vitest";

import { GameEventBus } from "../../events/GameEventBus";

describe("GameEventBus", () => {
  it("emits typed payloads and supports unsubscribe", () => {
    const eventBus = new GameEventBus();
    const handler = vi.fn();
    const unsubscribe = eventBus.on("COIN_COLLECTED", handler);

    eventBus.emit("COIN_COLLECTED", { amount: 2, totalCoins: 2 });
    unsubscribe();
    eventBus.emit("COIN_COLLECTED", { amount: 1, totalCoins: 3 });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ amount: 2, totalCoins: 2 });
  });
});
