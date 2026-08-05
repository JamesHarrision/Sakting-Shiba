import { describe, expect, it } from "vitest";

import { SPAWN_DIRECTOR_CONFIG } from "../../config/gameplay/spawnDirectorConfig";
import { SPAWN_PATTERNS } from "../../config/gameplay/spawnPatterns";
import { SpawnDirector } from "../../gameplay/spawning/SpawnDirector";

describe("SpawnDirector", () => {
  it("never selects a pattern above the current difficulty", () => {
    const director = new SpawnDirector(SPAWN_PATTERNS, { seed: 100 });

    for (let index = 0; index < 50; index += 1) {
      const request = director.createNextRequest(0, 0);
      const pattern = SPAWN_PATTERNS.find(
        (candidate) => candidate.id === request?.patternId
      );
      expect(pattern?.minimumDifficulty).toBe(0);
    }
  });

  it("produces the same sequence for the same seed", () => {
    const first = new SpawnDirector(SPAWN_PATTERNS, { seed: 4242 });
    const second = new SpawnDirector(SPAWN_PATTERNS, { seed: 4242 });

    const firstSequence = Array.from({ length: 20 }, () =>
      first.createNextRequest(0, 5)
    );
    const secondSequence = Array.from({ length: 20 }, () =>
      second.createNextRequest(0, 5)
    );

    expect(firstSequence).toEqual(secondSequence);
  });

  it("keeps requests away from the player and prevents overlap", () => {
    const director = new SpawnDirector(SPAWN_PATTERNS, { seed: 7 });
    const first = director.createNextRequest(100, 5);
    const second = director.createNextRequest(100, 5);
    const firstPattern = SPAWN_PATTERNS.find(
      (pattern) => pattern.id === first?.patternId
    );

    expect(first?.startZ).toBeGreaterThanOrEqual(
      100 + SPAWN_DIRECTOR_CONFIG.initialSpawnDistance
    );
    expect(second?.startZ).toBeGreaterThanOrEqual(
      (first?.startZ ?? 0) +
        (firstPattern?.length ?? 0) +
        SPAWN_DIRECTOR_CONFIG.safePatternGap
    );
  });

  it("clears spawn and random state on restart", () => {
    const director = new SpawnDirector(SPAWN_PATTERNS, { seed: 99 });
    const firstRequest = director.createNextRequest(0, 5);
    director.createNextRequest(0, 5);

    director.reset();

    expect(director.createNextRequest(0, 5)).toEqual(firstRequest);
  });

  it("does not emit requests while paused", () => {
    const director = new SpawnDirector(SPAWN_PATTERNS, { seed: 12 });
    director.pause();
    expect(director.createNextRequest(0, 5)).toBeNull();
    director.resume();
    expect(director.createNextRequest(0, 5)).not.toBeNull();
  });
});
