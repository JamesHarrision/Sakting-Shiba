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
      fish: 0,
      speed: 10,
      combo: 0,
      isGameOver: false
    });
  });

  it("updates fish and score through events", () => {
    const eventBus = new GameEventBus();
    const fishHandler = vi.fn();
    const scoreHandler = vi.fn();
    const store = new RunStateStore(eventBus);

    eventBus.on("FISH_COLLECTED", fishHandler);
    eventBus.on("SCORE_CHANGED", scoreHandler);
    store.startRun();
    store.collectFish(3);

    expect(store.getSnapshot().fish).toBe(3);
    expect(store.getSnapshot().score).toBe(30);
    expect(fishHandler).toHaveBeenCalledWith({ amount: 3, totalFish: 3 });
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
