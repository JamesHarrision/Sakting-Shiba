import { describe, expect, it, vi } from "vitest";

import { LANE_X_POSITIONS } from "../../config/gameplay/gameplayConfig";
import { GameEventBus } from "../../events/GameEventBus";
import { PlayerController } from "../../gameplay/PlayerController";
import { createEmptyInputSnapshot } from "../../input/inputSnapshot";

describe("PlayerController", () => {
  it("starts on the center lane", () => {
    const controller = new PlayerController(new GameEventBus());

    expect(controller.getSnapshot()).toMatchObject({
      lane: 1,
      x: LANE_X_POSITIONS[1],
      y: 0,
      state: "running",
      isGrounded: true
    });
  });

  it("switches lanes smoothly and clamps at lane edges", () => {
    const eventBus = new GameEventBus();
    const laneChangedHandler = vi.fn();
    const controller = new PlayerController(eventBus);

    eventBus.on("LANE_CHANGED", laneChangedHandler);

    controller.update({ ...createEmptyInputSnapshot(), moveLeft: true }, 0);
    expect(controller.getSnapshot().lane).toBe(0);
    expect(controller.getSnapshot().isSwitchingLane).toBe(true);
    expect(laneChangedHandler).toHaveBeenCalledWith({ from: 1, to: 0 });

    controller.update(createEmptyInputSnapshot(), 0.18);
    expect(controller.getSnapshot().x).toBe(LANE_X_POSITIONS[0]);

    controller.update({ ...createEmptyInputSnapshot(), moveLeft: true }, 0);
    expect(controller.getSnapshot().lane).toBe(0);
    expect(laneChangedHandler).toHaveBeenCalledTimes(1);
  });

  it("ignores extra lane input while switching", () => {
    const eventBus = new GameEventBus();
    const laneChangedHandler = vi.fn();
    const controller = new PlayerController(eventBus);

    eventBus.on("LANE_CHANGED", laneChangedHandler);
    controller.update({ ...createEmptyInputSnapshot(), moveRight: true }, 0);
    controller.update({ ...createEmptyInputSnapshot(), moveRight: true }, 0.01);

    expect(controller.getSnapshot().lane).toBe(2);
    expect(laneChangedHandler).toHaveBeenCalledTimes(1);
  });

  it("jumps with kinematic gravity and lands once", () => {
    const eventBus = new GameEventBus();
    const jumpedHandler = vi.fn();
    const landedHandler = vi.fn();
    const controller = new PlayerController(eventBus);

    eventBus.on("PLAYER_JUMPED", jumpedHandler);
    eventBus.on("PLAYER_LANDED", landedHandler);

    controller.update({ ...createEmptyInputSnapshot(), jump: true }, 1 / 60);

    expect(controller.getSnapshot().state).toBe("jumping");
    expect(controller.getSnapshot().y).toBeGreaterThan(0);
    expect(jumpedHandler).toHaveBeenCalledTimes(1);

    for (let i = 0; i < 120; i += 1) {
      controller.update(createEmptyInputSnapshot(), 1 / 60);
    }

    expect(controller.getSnapshot()).toMatchObject({
      y: 0,
      verticalVelocity: 0,
      isGrounded: true,
      state: "running"
    });
    expect(landedHandler).toHaveBeenCalledTimes(1);
  });

  it("crouches for the configured duration while grounded", () => {
    const controller = new PlayerController(new GameEventBus());

    controller.update({ ...createEmptyInputSnapshot(), crouch: true }, 0.1);

    expect(controller.getSnapshot()).toMatchObject({
      isCrouching: true,
      state: "crouching"
    });

    controller.update(createEmptyInputSnapshot(), 0.45);

    expect(controller.getSnapshot()).toMatchObject({
      isCrouching: false,
      state: "running"
    });
  });
});
