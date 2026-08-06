import { describe, expect, it } from "vitest";

import { SPAWN_PATTERNS } from "../../config/gameplay/spawnPatterns";
import type { SpawnPattern } from "../../contracts/spawn-pattern.contract";
import {
  hasEscapeLane,
  validateSpawnPatterns
} from "../../gameplay/spawning/SpawnPatternValidator";

describe("spawn pattern configuration", () => {
  it("contains three easy, two medium, and one hard pattern", () => {
    expect(SPAWN_PATTERNS.filter((pattern) => pattern.minimumDifficulty === 0)).toHaveLength(3);
    expect(SPAWN_PATTERNS.filter((pattern) => pattern.minimumDifficulty === 2)).toHaveLength(2);
    expect(SPAWN_PATTERNS.filter((pattern) => pattern.minimumDifficulty === 4)).toHaveLength(1);
  });

  it("passes all safe-spawn validation rules", () => {
    expect(validateSpawnPatterns(SPAWN_PATTERNS)).toEqual([]);
    for (const pattern of SPAWN_PATTERNS) {
      for (const row of pattern.rows) {
        expect(hasEscapeLane(row)).toBe(true);
      }
    }
  });

  it("rejects a row that locks all three lanes", () => {
    const unsafePattern: SpawnPattern = {
      ...SPAWN_PATTERNS[0],
      id: "unsafe-all-lanes",
      rows: [
        {
          offsetZ: 0,
          lanes: ["obstacle_box", "obstacle_fence", "obstacle_dumpster"]
        }
      ]
    };
    const issues = validateSpawnPatterns([
      unsafePattern,
      SPAWN_PATTERNS[1],
      SPAWN_PATTERNS[2]
    ]);

    expect(issues.some((issue) => issue.message.includes("empty escape lane"))).toBe(true);
  });

  it("can validate a dedicated single-route tutorial collection", () => {
    expect(
      validateSpawnPatterns([SPAWN_PATTERNS[0]], {
        minimumStartingPatterns: 1
      })
    ).toEqual([]);
  });
});
