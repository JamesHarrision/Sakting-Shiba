import { describe, expect, it } from "vitest";

import { GameEventBus } from "../../events/GameEventBus";
import { PlayerController } from "../../gameplay/PlayerController";
import { createEmptyInputSnapshot } from "../../input/inputSnapshot";
import { PlayerColliderController } from "../../player/PlayerColliderController";

describe("PlayerColliderController", () => {
  it("uses a lower collider while crouching", () => {
    const player = new PlayerController(new GameEventBus());
    const collider = new PlayerColliderController();
    const standing = collider.update(player.getSnapshot());

    player.update({ ...createEmptyInputSnapshot(), crouch: true }, 0.01);
    const crouching = collider.update(player.getSnapshot());

    expect(crouching.height).toBeLessThan(standing.height);
    expect(crouching.centerY).toBeLessThan(standing.centerY);
    expect(crouching.isCrouching).toBe(true);
  });

  it("keeps model-independent dimensions while jumping", () => {
    const player = new PlayerController(new GameEventBus());
    const collider = new PlayerColliderController();
    const standing = collider.update(player.getSnapshot());

    player.update({ ...createEmptyInputSnapshot(), jump: true }, 1 / 60);
    const jumping = collider.update(player.getSnapshot());

    expect(jumping).toMatchObject({
      width: standing.width,
      height: standing.height,
      depth: standing.depth,
      pickupRadius: standing.pickupRadius,
      isCrouching: false
    });
    expect(jumping.centerY).toBeGreaterThan(standing.centerY);
  });

  it("returns immutable snapshots and resets to standing center lane", () => {
    const collider = new PlayerColliderController();
    const initial = collider.getSnapshot();

    expect(Object.isFrozen(initial)).toBe(true);

    collider.setEnabled(false);
    expect(collider.getSnapshot().isEnabled).toBe(false);

    collider.reset();
    expect(collider.getSnapshot()).toMatchObject({
      centerX: 0,
      isCrouching: false,
      isEnabled: true
    });
  });
});
