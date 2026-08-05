export interface SpawnDirectorConfig {
  readonly initialSpawnDistance: number;
  readonly safePatternGap: number;
}

export const SPAWN_DIRECTOR_CONFIG: Readonly<SpawnDirectorConfig> =
  Object.freeze({
    initialSpawnDistance: 32,
    safePatternGap: 10
  });
