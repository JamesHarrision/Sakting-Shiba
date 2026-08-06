import { describe, expect, it } from "vitest";

import { getPropEntry } from "../../config/visual/props.config";

describe("obstacle asset calibration", () => {
  it("places the center-pivoted box on top of the track", () => {
    const box = getPropEntry("box");
    const sourceMinimumY = -1;
    const calibratedMinimumY =
      box.calibration.position.y + sourceMinimumY * box.calibration.scale;

    expect(calibratedMinimumY).toBeCloseTo(0, 3);
  });

  it("rotates and centers the fence across a lane", () => {
    const fence = getPropEntry("fence");
    const sourceWidth = 20.082;
    const sourceLength = 96.11;
    const visualWidth = sourceLength * fence.calibration.scale;
    const visualDepth = sourceWidth * fence.calibration.scale;

    expect(fence.calibration.rotationDegrees.y).toBe(90);
    expect(visualWidth).toBeGreaterThan(1.8);
    expect(visualDepth).toBeLessThan(0.7);
    expect(fence.calibration.position.x).toBeCloseTo(-1.09, 2);
    expect(fence.calibration.position.z).toBeCloseTo(-0.227, 3);
  });
});
