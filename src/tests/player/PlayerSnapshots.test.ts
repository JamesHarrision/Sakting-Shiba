import { describe, expect, it } from "vitest";

import { GameEventBus } from "../../events/GameEventBus";
import { PlayerController } from "../../gameplay/PlayerController";
import { createEmptyInputSnapshot } from "../../input/inputSnapshot";

describe("Player snapshots", () => {
  it("exposes readonly visual state without leaking controller internals", () => {
    const controller = new PlayerController(new GameEventBus());
    const snapshot = controller.getVisualSnapshot();

    expect(Object.isFrozen(snapshot)).toBe(true);

    try {
      (snapshot as { positionX: number }).positionX = 999;
    } catch {
      // Frozen snapshots may throw in strict mode.
    }

    expect(controller.getVisualSnapshot().positionX).toBe(0);
  });

  it("reports lane, movement state and crouch progress", () => {
    const controller = new PlayerController(new GameEventBus());

    controller.update({ ...createEmptyInputSnapshot(), moveLeft: true }, 0.01);
    expect(controller.getVisualSnapshot()).toMatchObject({
      laneIndex: 0,
      state: "switching_lane",
      horizontalDirection: -1
    });

    controller.update(createEmptyInputSnapshot(), 0.18);
    controller.update({ ...createEmptyInputSnapshot(), crouch: true }, 0.01);

    expect(controller.getVisualSnapshot()).toMatchObject({
      state: "crouching",
      isCrouching: true
    });
    expect(controller.getVisualSnapshot().crouchProgress).toBeGreaterThan(0);
  });

  it("provides a minimal immutable camera target snapshot", () => {
    const controller = new PlayerController(new GameEventBus());

    controller.update({ ...createEmptyInputSnapshot(), jump: true }, 1 / 60);
    const camera = controller.getCameraTargetSnapshot(true);

    expect(Object.isFrozen(camera)).toBe(true);
    expect(camera).toMatchObject({
      targetX: 0,
      targetZ: 0,
      isPaused: true
    });
    expect(camera.targetY).toBeGreaterThan(0);
  });
});
