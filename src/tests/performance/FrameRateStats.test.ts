import { describe, expect, it } from "vitest";

import { FrameRateStats } from "../../performance/FrameRateStats";

describe("FrameRateStats", () => {
  it("reports weighted current, minimum, and average FPS", () => {
    const stats = new FrameRateStats();

    stats.addWindow(60, 0.5);
    stats.addWindow(50, 0.5);

    expect(stats.getSnapshot()).toEqual({
      currentFps: 100,
      minimumFps: 100,
      averageFps: 110
    });
  });

  it("ignores invalid windows and resets for a new run", () => {
    const stats = new FrameRateStats();

    stats.addWindow(0, 1);
    stats.addWindow(60, 0);
    expect(stats.getSnapshot().averageFps).toBe(0);

    stats.addWindow(72, 0.5);
    stats.reset();
    expect(stats.getSnapshot()).toEqual({
      currentFps: 0,
      minimumFps: 0,
      averageFps: 0
    });
  });
});
