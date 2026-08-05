import type { SpawnRequest } from "./spawn-pattern.contract";

export interface WorldRunStateSnapshot {
  readonly currentSpeed: number;
  readonly isPaused: boolean;
}

export interface WorldGameplayPort {
  updateRunState(snapshot: Readonly<WorldRunStateSnapshot>): void;
  enqueueSpawn(request: Readonly<SpawnRequest>): void;
  resetRun(): void;
}
