import { WORLD_VISUAL_CONFIG } from "../config/visual/world-visual.config";
import type { SpawnRequest } from "../contracts/spawn-pattern.contract";
import { RunSpeedSystem } from "./RunSpeedSystem";
import { SpawnDirector } from "./spawning/SpawnDirector";

const MAX_REQUESTS_PER_FRAME = 8;

export interface RunGameplayFrame {
  readonly speed: number;
  readonly difficulty: number;
  readonly spawnRequests: readonly Readonly<SpawnRequest>[];
}

export class RunGameplaySystem {
  private paused = false;

  constructor(
    private readonly speedSystem = new RunSpeedSystem(),
    private readonly spawnDirector = new SpawnDirector(),
    private readonly spawnAheadDistance = WORLD_VISUAL_CONFIG.fogEnd
  ) {}

  update(deltaSeconds: number, playerTravelZ: number): Readonly<RunGameplayFrame> {
    if (this.paused) return this.getFrame([]);

    this.speedSystem.update(deltaSeconds);
    const requests: Readonly<SpawnRequest>[] = [];
    const spawnThroughZ = playerTravelZ + this.spawnAheadDistance;

    for (let index = 0; index < MAX_REQUESTS_PER_FRAME; index += 1) {
      const nextStartZ = this.spawnDirector.getNextStartZ();
      if (nextStartZ !== null && nextStartZ > spawnThroughZ) break;

      const request = this.spawnDirector.createNextRequest(
        playerTravelZ,
        this.speedSystem.getDifficulty()
      );
      if (!request) break;
      requests.push(request);
    }

    return this.getFrame(requests);
  }

  getCurrentSpeed(): number {
    return this.speedSystem.getCurrentSpeed();
  }

  pause(): void {
    this.paused = true;
    this.speedSystem.pause();
    this.spawnDirector.pause();
  }

  resume(): void {
    this.paused = false;
    this.speedSystem.resume();
    this.spawnDirector.resume();
  }

  reset(): void {
    this.paused = false;
    this.speedSystem.reset();
    this.spawnDirector.reset();
  }

  private getFrame(
    spawnRequests: readonly Readonly<SpawnRequest>[]
  ): Readonly<RunGameplayFrame> {
    return Object.freeze({
      speed: this.speedSystem.getCurrentSpeed(),
      difficulty: this.speedSystem.getDifficulty(),
      spawnRequests: Object.freeze(spawnRequests)
    });
  }
}
