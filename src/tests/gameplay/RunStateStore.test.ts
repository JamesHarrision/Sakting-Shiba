import { describe, expect, it, vi } from "vitest";

import { GameEventBus } from "../../events/GameEventBus";
import { RunStateStore } from "../../gameplay/RunStateStore";

describe("RunStateStore", () => {
  it("starts with the configured run state", () => {
    const store = new RunStateStore(new GameEventBus());

    store.startRun();

    expect(store.getSnapshot()).toMatchObject({
      distance: 0,
      score: 0,
      coins: 0,
      speed: 10,
      combo: 0,
      isGameOver: false
    });
  });

  it("updates coins and score through events", () => {
    const eventBus = new GameEventBus();
    const coinHandler = vi.fn();
    const scoreHandler = vi.fn();
    const store = new RunStateStore(eventBus);

    eventBus.on("COIN_COLLECTED", coinHandler);
    eventBus.on("SCORE_CHANGED", scoreHandler);
    store.startRun();
    store.collectCoins(3);

    expect(store.getSnapshot().coins).toBe(3);
    expect(store.getSnapshot().score).toBe(30);
    expect(coinHandler).toHaveBeenCalledWith({ amount: 3, totalCoins: 3 });
    expect(scoreHandler).toHaveBeenLastCalledWith({
      score: 30,
      distance: 0,
      combo: 0
    });
  });

  it("does not emit run ended more than once", () => {
    const eventBus = new GameEventBus();
    const runEndedHandler = vi.fn();
    const store = new RunStateStore(eventBus);

    eventBus.on("RUN_ENDED", runEndedHandler);
    store.startRun();
    store.endRun();
    store.endRun();

    expect(runEndedHandler).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().isGameOver).toBe(true);
  });
});
