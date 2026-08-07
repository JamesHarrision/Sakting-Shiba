import { describe, expect, it } from "vitest";

import type { PlayerColliderSnapshot } from "../../contracts/player-collider.contract";
import type { WorldItemSnapshot } from "../../contracts/world-item.contract";
import { RunnerCollisionSystem } from "../../gameplay/RunnerCollisionSystem";

const STANDING_PLAYER: PlayerColliderSnapshot = {
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

function item(
  type: WorldItemSnapshot["type"],
  overrides: Partial<WorldItemSnapshot> = {}
): WorldItemSnapshot {
  return {
    id: 1,
    type,
    lane: 1,
    centerX: 0,
    centerY: 0.6,
    worldZ: 0,
    width: 1.2,
    height: 1,
    depth: 1.1,
    ...overrides
  };
}

describe("RunnerCollisionSystem", () => {
  it("hits a grounded player on a box and clears a jumping player", () => {
    const system = new RunnerCollisionSystem();
    expect(system.update(STANDING_PLAYER, [item("obstacle_box")]).obstacleHit?.type)
      .toBe("obstacle_box");

    const jumping = { ...STANDING_PLAYER, centerY: 1.75 };
    expect(system.update(jumping, [item("obstacle_box")]).obstacleHit).toBeNull();
  });

  it("requires crouch for a fence", () => {
    const system = new RunnerCollisionSystem();
    expect(system.update(STANDING_PLAYER, [item("obstacle_fence")]).obstacleHit)
      .not.toBeNull();
    expect(
      system.update(
        { ...STANDING_PLAYER, centerY: 0.6, height: 0.9, isCrouching: true },
        [item("obstacle_fence")]
      ).obstacleHit
    ).toBeNull();
  });

  it("allows only a lane dodge over a dumpster (jumping never clears it)", () => {
    const system = new RunnerCollisionSystem();
    expect(system.update(STANDING_PLAYER, [item("obstacle_dumpster")]).obstacleHit)
      .not.toBeNull();
    // Even a high jump cannot clear the dumpster
    expect(
      system.update(
        { ...STANDING_PLAYER, centerY: 2.55 },
        [item("obstacle_dumpster")]
      ).obstacleHit
    ).not.toBeNull();
    // Switching lanes is the only way through
    expect(
      system.update(STANDING_PLAYER, [
        item("obstacle_dumpster", { centerX: 2.4, lane: 2 })
      ]).obstacleHit
    ).toBeNull();
  });

  it("reports collectibles and lets invulnerable runs cross obstacles", () => {
    const system = new RunnerCollisionSystem();
    expect(system.update(STANDING_PLAYER, [item("coin")]).collectibles)
      .toEqual([{ itemId: 1, type: "coin" }]);
    expect(
      system.update(STANDING_PLAYER, [item("obstacle_dumpster")], true).obstacleHit
    ).toBeNull();
  });
});
