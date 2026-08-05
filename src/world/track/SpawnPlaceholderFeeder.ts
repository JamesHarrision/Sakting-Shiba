import { SPAWN_PATTERNS } from "../../config/gameplay/spawnPatterns";
import type { TrackManager } from "./TrackManager";

const SPAWN_INTERVAL = 40;
const SPAWN_AHEAD = 70;

/**
 * PLACEHOLDER spawn feeder for Milestone 3.
 *
 * The M4 SpawnDirector (Gameplay Agent) will replace this with real pattern
 * selection / difficulty logic. Until then, this cycles the existing
 * SPAWN_PATTERNS so the World Agent's debug placeholders are visible.
 */
export class SpawnPlaceholderFeeder {
  private nextSpawnDistance = SPAWN_INTERVAL;
  private patternIndex = 0;

  constructor(private readonly trackManager: TrackManager) {}

  update(): void {
    const distance = this.trackManager.getScrollDistance();
    if (distance < this.nextSpawnDistance) {
      return;
    }

    this.nextSpawnDistance += SPAWN_INTERVAL;
    const pattern =
      SPAWN_PATTERNS[this.patternIndex % SPAWN_PATTERNS.length];
    this.patternIndex += 1;

    this.trackManager.submitSpawnRequests([
      {
        patternId: pattern.id,
        // Place ahead of the player in the scroll frame so items scroll in
        startZ: distance + SPAWN_AHEAD,
        rows: pattern.rows
      }
    ]);
  }

  reset(): void {
    this.nextSpawnDistance = SPAWN_INTERVAL;
    this.patternIndex = 0;
  }
}
