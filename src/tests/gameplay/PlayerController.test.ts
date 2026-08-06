import { describe, expect, it, vi } from "vitest";

import { LANE_X_POSITIONS } from "../../config/gameplay/gameplayConfig";
import { GameEventBus } from "../../events/GameEventBus";
import { PlayerController } from "../../gameplay/PlayerController";
import { createEmptyInputSnapshot } from "../../input/inputSnapshot";

describe("PlayerController", () => {
  it("jumps higher while Spring Paws is active", () => {
    const normal = new PlayerController(new GameEventBus());
    const boosted = new PlayerController(new GameEventBus());
    boosted.setJumpMultiplier(1.65);
    const jumpInput = { ...createEmptyInputSnapshot(), jump: true };

    const normalJump = normal.update(jumpInput, 1 / 60);
    const boostedJump = boosted.update(jumpInput, 1 / 60);

    expect(boostedJump.verticalVelocity).toBeGreaterThan(
      normalJump.verticalVelocity
    );
  });

  it("enters rocket flight and falls after the effect ends", () => {
    const controller = new PlayerController(new GameEventBus());
    controller.setFlightHeight(4);
    for (let index = 0; index < 60; index += 1) {
      controller.update(createEmptyInputSnapshot(), 1 / 60);
    }
    expect(controller.getSnapshot().state).toBe("flying");
    expect(controller.getSnapshot().y).toBeGreaterThan(3.8);

    controller.setFlightHeight(null);
    controller.update(createEmptyInputSnapshot(), 1 / 60);
    expect(controller.getSnapshot().state).toBe("jumping");
  });

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

  it("keeps jump and crouch mutually exclusive", () => {
    const controller = new PlayerController(new GameEventBus());

    controller.update({ ...createEmptyInputSnapshot(), crouch: true }, 0.01);
    controller.update({ ...createEmptyInputSnapshot(), jump: true }, 0.01);

    expect(controller.getSnapshot()).toMatchObject({
      state: "crouching",
      y: 0,
      verticalVelocity: 0
    });

    controller.reset();
    controller.update({ ...createEmptyInputSnapshot(), jump: true }, 0.01);
    controller.update({ ...createEmptyInputSnapshot(), crouch: true }, 0.01);

    expect(controller.getSnapshot()).toMatchObject({
      state: "jumping",
      isCrouching: false
    });
  });

  it("exposes a read-only visual snapshot with lane direction", () => {
    const controller = new PlayerController(new GameEventBus());

    controller.update({ ...createEmptyInputSnapshot(), moveRight: true }, 0.01);

    expect(controller.getVisualSnapshot()).toMatchObject({
      laneIndex: 2,
      state: "switching_lane",
      horizontalDirection: 1,
      isGrounded: true
    });
  });
});
