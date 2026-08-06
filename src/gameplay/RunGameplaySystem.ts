import { WORLD_VISUAL_CONFIG } from "../config/visual/world-visual.config";
import type { SpawnRequest } from "../contracts/spawn-pattern.contract";
import { RunSpeedSystem } from "./RunSpeedSystem";
import { SpawnDirector } from "./spawning/SpawnDirector";
import { TUTORIAL_SPAWN_PATTERN } from "../config/gameplay/tutorialSpawnPattern";

const MAX_REQUESTS_PER_FRAME = 8;
const EMPTY_REQUESTS: readonly Readonly<SpawnRequest>[] = Object.freeze([]);

export interface RunGameplayFrame {
  readonly speed: number;
  readonly difficulty: number;
  readonly spawnRequests: readonly Readonly<SpawnRequest>[];
}

export class RunGameplaySystem {
  private paused = false;
  private tutorialMode = false;
  private readonly tutorialSpawnDirector = new SpawnDirector(
    [TUTORIAL_SPAWN_PATTERN],
    {
      seed: 0x545554,
      initialSpawnDistance: 8,
      safePatternGap: 8,
      minimumStartingPatterns: 1
    }
  );

  constructor(
    private readonly speedSystem = new RunSpeedSystem(),
    private readonly spawnDirector = new SpawnDirector(),
    private readonly spawnAheadDistance = WORLD_VISUAL_CONFIG.fogEnd
  ) {}

  update(deltaSeconds: number, playerTravelZ: number): Readonly<RunGameplayFrame> {
    if (this.paused) return this.getFrame([]);

    this.speedSystem.update(deltaSeconds);
    let requests: Readonly<SpawnRequest>[] | undefined;
    const spawnThroughZ = playerTravelZ + this.spawnAheadDistance;
    const activeDirector = this.tutorialMode
      ? this.tutorialSpawnDirector
      : this.spawnDirector;

    for (let index = 0; index < MAX_REQUESTS_PER_FRAME; index += 1) {
      const nextStartZ = activeDirector.getNextStartZ();
      if (nextStartZ !== null && nextStartZ > spawnThroughZ) break;

      const request = activeDirector.createNextRequest(
        playerTravelZ,
        this.speedSystem.getDifficulty()
      );
      if (!request) break;
      (requests ??= []).push(request);
    }

    return this.getFrame(requests ?? EMPTY_REQUESTS);
  }

  getCurrentSpeed(): number {
    return this.speedSystem.getCurrentSpeed();
  }

  setTutorialMode(enabled: boolean): void {
    if (enabled === this.tutorialMode) return;
    this.tutorialMode = enabled;
    const activeDirector = enabled
      ? this.tutorialSpawnDirector
      : this.spawnDirector;
    activeDirector.reset();
    if (this.paused) activeDirector.pause();
  }

  pause(): void {
    this.paused = true;
    this.speedSystem.pause();
    this.spawnDirector.pause();
    this.tutorialSpawnDirector.pause();
  }

  resume(): void {
    this.paused = false;
    this.speedSystem.resume();
    this.spawnDirector.resume();
    this.tutorialSpawnDirector.resume();
  }

  reset(): void {
    this.paused = false;
    this.tutorialMode = false;
    this.speedSystem.reset();
    this.spawnDirector.reset();
    this.tutorialSpawnDirector.reset();
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
