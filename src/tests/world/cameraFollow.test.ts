import { describe, expect, it } from "vitest";

import { dampTowards } from "../../world/cameraFollow";

describe("dampTowards", () => {
  it("returns the same value when delta time is zero", () => {
    expect(dampTowards(3, 10, 8, 0)).toBe(3);
  });

  it("moves toward the target without overshooting", () => {
    const next = dampTowards(0, 10, 8, 1 / 60);

    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(10);
  });

  it("stays close across different frame rates over one second", () => {
    let coarseStep = 0;

    for (let index = 0; index < 10; index += 1) {
      coarseStep = dampTowards(coarseStep, 10, 8, 0.1);
    }

    let fineStep = 0;

    for (let index = 0; index < 100; index += 1) {
      fineStep = dampTowards(fineStep, 10, 8, 0.01);
    }

    expect(coarseStep).toBeCloseTo(fineStep, 3);
  });
});
