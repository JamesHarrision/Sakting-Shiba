export type SpawnItemType =
  | "obstacle_box"
  | "obstacle_fence"
  | "obstacle_dumpster"
  | "coin"
  | "powerup_magnet"
  | "powerup_spring"
  | "powerup_rocket"
  | "powerup_star"
  | "empty";

export type ObstacleItemType = Extract<SpawnItemType, `obstacle_${string}`>;
export type CollectibleItemType = Exclude<
  SpawnItemType,
  ObstacleItemType | "empty"
>;

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
