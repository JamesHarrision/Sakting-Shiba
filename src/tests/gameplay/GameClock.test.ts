import { describe, expect, it } from "vitest";

import { GameClock } from "../../gameplay/GameClock";

describe("GameClock", () => {
  it("converts milliseconds to clamped seconds", () => {
    const clock = new GameClock({ maxDeltaSeconds: 0.05 });

    expect(clock.tick(16)).toBeCloseTo(0.016);
    expect(clock.tick(500)).toBe(0.05);
  });

  it("returns zero delta while paused", () => {
    const clock = new GameClock();

    clock.pause();

    expect(clock.tick(16)).toBe(0);
    expect(clock.isPaused()).toBe(true);
  });
});
