import { describe, expect, it, vi } from "vitest";

import type { PerformanceConfig } from "../../config/visual/performance.config";
import { AdaptiveResolutionController } from "../../performance/AdaptiveResolutionController";

const TEST_CONFIG: PerformanceConfig = {
  targetFps: 120,
  initialHardwareScalingLevel: 1.25,
  minimumHardwareScalingLevel: 1,
  maximumHardwareScalingLevel: 2,
  sampleWindowSeconds: 1,
  scalingStep: 0.25,
  lowFpsRatio: 0.9,
  highFpsRatio: 1.08
};

describe("AdaptiveResolutionController", () => {
  it("starts at the configured performance level", () => {
    const apply = vi.fn();
    const controller = new AdaptiveResolutionController(apply, TEST_CONFIG);

    expect(controller.getScalingLevel()).toBe(1.25);
    expect(apply).toHaveBeenCalledWith(1.25);
  });

  it("lowers render resolution when measured FPS is below target", () => {
    const apply = vi.fn();
    const controller = new AdaptiveResolutionController(apply, TEST_CONFIG);

    for (let frame = 0; frame < 60; frame += 1) controller.update(1 / 60);

    expect(controller.getScalingLevel()).toBe(1.5);
    expect(apply).toHaveBeenLastCalledWith(1.5);
  });

  it("restores detail above the target without exceeding native resolution", () => {
    const apply = vi.fn();
    const controller = new AdaptiveResolutionController(apply, TEST_CONFIG);

    for (let sample = 0; sample < 4; sample += 1) {
      for (let frame = 0; frame < 144; frame += 1) controller.update(1 / 144);
    }

    expect(controller.getScalingLevel()).toBe(1);
    expect(apply).toHaveBeenLastCalledWith(1);
  });

  it("caps scaling at the configured low-resolution limit", () => {
    const apply = vi.fn();
    const controller = new AdaptiveResolutionController(apply, TEST_CONFIG);

    for (let sample = 0; sample < 5; sample += 1) {
      for (let frame = 0; frame < 30; frame += 1) controller.update(1 / 30);
    }

    expect(controller.getScalingLevel()).toBe(2);
  });
});
