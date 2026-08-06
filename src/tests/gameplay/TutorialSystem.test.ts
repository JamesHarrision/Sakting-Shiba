import { describe, expect, it, vi } from "vitest";

import { GameEventBus } from "../../events/GameEventBus";
import { RunnerCollisionSystem } from "../../gameplay/RunnerCollisionSystem";
import type { PlayerColliderSnapshot } from "../../contracts/player-collider.contract";
import type { WorldItemSnapshot } from "../../contracts/world-item.contract";
import {
  POST_TUTORIAL_PROTECTION_SECONDS,
  TutorialSystem
} from "../../gameplay/TutorialSystem";

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
    expect(tutorial.isProtected).toBe(true);
    tutorial.update(POST_TUTORIAL_PROTECTION_SECONDS - 0.1);
    expect(tutorial.isProtected).toBe(true);
    tutorial.update(0.2);
    expect(tutorial.isProtected).toBe(false);
    tutorial.dispose();
  });

  it("can cancel without marking the tutorial complete", () => {
    const completed = vi.fn();
    const tutorial = new TutorialSystem(new GameEventBus(), vi.fn(), completed);
    tutorial.start();
    tutorial.cancel();
    expect(tutorial.isActive).toBe(false);
    expect(tutorial.isProtected).toBe(false);
    expect(completed).not.toHaveBeenCalled();
  });

  it("prevents an immediate obstacle hit after the final tutorial coin", () => {
    const events = new GameEventBus();
    const tutorial = new TutorialSystem(events, vi.fn(), vi.fn());
    const collisions = new RunnerCollisionSystem();
    const player: PlayerColliderSnapshot = {
      centerX: 0,
      centerY: 0.975,
      centerZ: 0,
      width: 0.9,
      height: 1.65,
      depth: 1.05,
      pickupRadius: 1.4,
      isCrouching: false,
      isEnabled: true
    };
    const dumpster: WorldItemSnapshot = {
      id: 7,
      type: "obstacle_dumpster",
      lane: 1,
      centerX: 0,
      centerY: 0.75,
      worldZ: 0,
      width: 1.45,
      height: 1.2,
      depth: 1.35
    };

    tutorial.start();
    events.emit("LANE_CHANGED", { from: 1, to: 0 });
    events.emit("PLAYER_JUMPED", { lane: 0 });
    events.emit("PLAYER_STATE_CHANGED", {
      from: "running",
      to: "crouching"
    });
    events.emit("COIN_COLLECTED", { amount: 1, totalCoins: 1 });

    expect(
      collisions.update(player, [dumpster], tutorial.isProtected).obstacleHit
    ).toBeNull();

    tutorial.update(POST_TUTORIAL_PROTECTION_SECONDS + 0.01);
    expect(
      collisions.update(player, [dumpster], tutorial.isProtected).obstacleHit
    ).not.toBeNull();
    tutorial.dispose();
  });
});
