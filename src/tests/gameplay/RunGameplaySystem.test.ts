import { describe, expect, it } from "vitest";

import { RUN_SPEED_CONFIG } from "../../config/gameplay/runSpeedConfig";
import { RunGameplaySystem } from "../../gameplay/RunGameplaySystem";

describe("RunGameplaySystem", () => {
  it("fills the visible spawn window without emitting every frame", () => {
    const system = new RunGameplaySystem();
    const first = system.update(1 / 60, 0);
    const second = system.update(1 / 60, 0);

    expect(first.spawnRequests.length).toBeGreaterThan(0);
    expect(second.spawnRequests).toHaveLength(0);
    for (let index = 1; index < first.spawnRequests.length; index += 1) {
      expect(first.spawnRequests[index].startZ).toBeGreaterThan(
        first.spawnRequests[index - 1].startZ
      );
    }
  });

  it("pauses and resets speed plus spawn state", () => {
    const system = new RunGameplaySystem();
    system.update(5, 0);
    const accelerated = system.getCurrentSpeed();
    expect(accelerated).toBeGreaterThan(RUN_SPEED_CONFIG.initialSpeed);

    system.pause();
    expect(system.update(5, 100).speed).toBe(accelerated);
    expect(system.update(5, 100).spawnRequests).toHaveLength(0);

    system.reset();
    expect(system.getCurrentSpeed()).toBe(RUN_SPEED_CONFIG.initialSpeed);
    expect(system.update(0, 0).spawnRequests.length).toBeGreaterThan(0);
  });
});
