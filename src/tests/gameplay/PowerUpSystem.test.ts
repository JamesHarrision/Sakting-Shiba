import { describe, expect, it, vi } from "vitest";

import { POWER_UP_CONFIG } from "../../config/gameplay/powerUpConfig";
import { GameEventBus } from "../../events/GameEventBus";
import { PowerUpSystem } from "../../gameplay/PowerUpSystem";

describe("PowerUpSystem", () => {
  it("activates rush and rocket gameplay effects", () => {
    const system = new PowerUpSystem();
    system.activate("rush");
    expect(system.getSnapshot().speedMultiplier).toBe(
      POWER_UP_CONFIG.rush.speedMultiplier
    );
    expect(system.getSnapshot().isInvulnerable).toBe(true);

    system.activate("rocket");
    expect(system.getSnapshot().flightHeight).toBe(
      POWER_UP_CONFIG.rocket.flightHeight
    );
    expect(system.getSnapshot().collectionDistance).toBe(
      POWER_UP_CONFIG.rocket.collectionDistance
    );
  });

  it("freezes timers while paused and expires once", () => {
    const events = new GameEventBus();
    const expired = vi.fn();
    events.on("POWERUP_EXPIRED", expired);
    const system = new PowerUpSystem(events);
    system.activate("magnet");
    system.pause();
    system.update(100);
    expect(system.getSnapshot().active.magnet).toBe(
      POWER_UP_CONFIG.magnet.durationSeconds
    );

    system.resume();
    system.update(POWER_UP_CONFIG.magnet.durationSeconds);
    expect(system.getSnapshot().active.magnet).toBeUndefined();
    expect(expired).toHaveBeenCalledOnce();
  });

  it("refreshes duration and clears all effects on restart", () => {
    const system = new PowerUpSystem();
    system.activate("magnet");
    system.update(3);
    system.activate("magnet");
    expect(system.getSnapshot().active.magnet).toBe(
      POWER_UP_CONFIG.magnet.durationSeconds
    );
    system.reset();
    expect(system.getSnapshot().active).toEqual({});
  });
});
