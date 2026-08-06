import { describe, expect, it, vi } from "vitest";

import { GameEventBus } from "../../events/GameEventBus";
import { TutorialSystem } from "../../gameplay/TutorialSystem";

describe("TutorialSystem", () => {
  it("advances only on the expected first-run actions", () => {
    const events = new GameEventBus();
    const changed = vi.fn();
    const completed = vi.fn();
    const tutorial = new TutorialSystem(events, changed, completed);
    tutorial.start();

    events.emit("PLAYER_JUMPED", { lane: 1 });
    expect(tutorial.getStep()).toBe("lane");
    events.emit("LANE_CHANGED", { from: 1, to: 0 });
    events.emit("PLAYER_JUMPED", { lane: 0 });
    events.emit("PLAYER_STATE_CHANGED", { from: "running", to: "crouching" });
    events.emit("COIN_COLLECTED", { amount: 1, totalCoins: 1 });

    expect(tutorial.getStep()).toBe("complete");
    expect(completed).toHaveBeenCalledOnce();
    tutorial.dispose();
  });

  it("can cancel without marking the tutorial complete", () => {
    const completed = vi.fn();
    const tutorial = new TutorialSystem(new GameEventBus(), vi.fn(), completed);
    tutorial.start();
    tutorial.cancel();
    expect(tutorial.isActive).toBe(false);
    expect(completed).not.toHaveBeenCalled();
  });
});
