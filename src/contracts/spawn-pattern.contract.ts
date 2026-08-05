export type SpawnItemType =
  | "debug_obstacle"
  | "debug_pickup"
  | "empty";

export type SpawnLanes = readonly [
  SpawnItemType,
  SpawnItemType,
  SpawnItemType
];

export interface SpawnRow {
  readonly offsetZ: number;
  readonly lanes: SpawnLanes;
}

export interface SpawnPattern {
  readonly id: string;
  readonly minimumDifficulty: number;
  readonly weight: number;
  readonly length: number;
  readonly rows: readonly SpawnRow[];
}

export interface SpawnRequest {
  readonly patternId: string;
  readonly startZ: number;
  readonly rows: readonly SpawnRow[];
}
