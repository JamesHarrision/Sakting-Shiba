import { describe, expect, it } from "vitest";

import { OBSTACLE_RULES } from "../../config/gameplay/obstacleConfig";
import { getPropEntry } from "../../config/visual/props.config";

describe("obstacle asset calibration", () => {
  it("centers the merged building asset and places its base on the rooftop", () => {
    const building = getPropEntry("building");
    const sourceMinimum = { x: -2.619, y: -2.707, z: -2.457 };
    const sourceMaximum = { x: 3.168, y: 2.427, z: 6.408 };
    const centerX = (sourceMinimum.x + sourceMaximum.x) / 2;
    const centerZ = (sourceMinimum.z + sourceMaximum.z) / 2;

    expect(building.useAsset).toBe(true);
    expect(building.mergeMeshes).toBe(true);
    expect(
      building.calibration.position.y +
        sourceMinimum.y * building.calibration.scale
    ).toBeCloseTo(0, 2);
    expect(
      building.calibration.position.x + centerX * building.calibration.scale
    ).toBeCloseTo(0, 2);
    expect(
      building.calibration.position.z + centerZ * building.calibration.scale
    ).toBeCloseTo(0, 2);
  });

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

  it("keeps the dumpster collider inside the calibrated GLB silhouette", () => {
    const dumpster = getPropEntry("dumpster");
    const rule = OBSTACLE_RULES.obstacle_dumpster;
    const visualWidth = 2.228 * dumpster.calibration.scale;
    const visualHeight = 2.311 * dumpster.calibration.scale;
    const visualDepth = 2.799 * dumpster.calibration.scale;

    expect(rule.width).toBeLessThanOrEqual(visualWidth);
    expect(rule.height).toBeLessThanOrEqual(visualHeight + 0.001);
    expect(rule.depth).toBeLessThanOrEqual(visualDepth);
    expect(rule.centerYOffset).toBeCloseTo(visualHeight / 2, 2);
  });
});
