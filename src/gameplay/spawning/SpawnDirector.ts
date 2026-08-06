import {
  SPAWN_DIRECTOR_CONFIG,
  type SpawnDirectorConfig
} from "../../config/gameplay/spawnDirectorConfig";
import { SPAWN_PATTERNS } from "../../config/gameplay/spawnPatterns";
import type {
  SpawnPattern,
  SpawnRequest,
  SpawnRow
} from "../../contracts/spawn-pattern.contract";
import { SeededRandom } from "./SeededRandom";
import { assertSpawnPatternsSafe } from "./SpawnPatternValidator";

export interface SpawnDirectorOptions extends Partial<SpawnDirectorConfig> {
  readonly seed?: number;
  readonly minimumStartingPatterns?: number;
}

export class SpawnDirector {
  private readonly random: SeededRandom;
  private readonly seed: number;
  private readonly initialSpawnDistance: number;
  private readonly safePatternGap: number;
  private nextStartZ: number | null = null;
  private paused = false;

  constructor(
    private readonly patterns: readonly SpawnPattern[] = SPAWN_PATTERNS,
    options: SpawnDirectorOptions = {}
  ) {
    assertSpawnPatternsSafe(patterns, {
      minimumStartingPatterns: options.minimumStartingPatterns
    });
    this.seed = options.seed ?? 0x434154;
    this.random = new SeededRandom(this.seed);
    this.initialSpawnDistance =
      options.initialSpawnDistance ?? SPAWN_DIRECTOR_CONFIG.initialSpawnDistance;
    this.safePatternGap =
      options.safePatternGap ?? SPAWN_DIRECTOR_CONFIG.safePatternGap;

    if (!Number.isFinite(this.initialSpawnDistance) || this.initialSpawnDistance < 0) {
      throw new Error("Initial spawn distance must be a non-negative number.");
    }
    if (!Number.isFinite(this.safePatternGap) || this.safePatternGap < 0) {
      throw new Error("Safe pattern gap must be a non-negative number.");
    }
  }

  createNextRequest(
    playerZ: number,
    difficulty: number
  ): Readonly<SpawnRequest> | null {
    if (this.paused) return null;

    const safePlayerZ = Number.isFinite(playerZ) ? playerZ : 0;
    const safeDifficulty = Number.isFinite(difficulty)
      ? Math.max(0, Math.floor(difficulty))
      : 0;
    const eligiblePatterns = this.patterns.filter(
      (pattern) => pattern.minimumDifficulty <= safeDifficulty
    );
    if (eligiblePatterns.length === 0) return null;

    const pattern = this.selectWeighted(eligiblePatterns);
    const minimumStartZ = safePlayerZ + this.initialSpawnDistance;
    const startZ = Math.max(this.nextStartZ ?? minimumStartZ, minimumStartZ);
    this.nextStartZ = startZ + pattern.length + this.safePatternGap;

    return Object.freeze({
      patternId: pattern.id,
      startZ,
      rows: Object.freeze(pattern.rows.map(cloneRow))
    });
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  reset(): void {
    this.nextStartZ = null;
    this.paused = false;
    this.random.reset(this.seed);
  }

  getNextStartZ(): number | null {
    return this.nextStartZ;
  }

  private selectWeighted(
    eligiblePatterns: readonly SpawnPattern[]
  ): SpawnPattern {
    const totalWeight = eligiblePatterns.reduce(
      (total, pattern) => total + pattern.weight,
      0
    );
    let target = this.random.next() * totalWeight;

    for (const pattern of eligiblePatterns) {
      target -= pattern.weight;
      if (target < 0) return pattern;
    }

    return eligiblePatterns[eligiblePatterns.length - 1];
  }
}

function cloneRow(row: Readonly<SpawnRow>): SpawnRow {
  return Object.freeze({
    offsetZ: row.offsetZ,
    lanes: Object.freeze([...row.lanes]) as SpawnRow["lanes"]
  });
}
