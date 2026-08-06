import type {
  CollectibleItemType,
  ObstacleItemType,
  SpawnItemType
} from "./spawn-pattern.contract";

export interface WorldItemSnapshot {
  readonly id: number;
  readonly type: Exclude<SpawnItemType, "empty">;
  readonly lane: 0 | 1 | 2;
  readonly centerX: number;
  readonly centerY: number;
  readonly worldZ: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
}

export interface ObstacleHit {
  readonly itemId: number;
  readonly type: ObstacleItemType;
}

export interface CollectibleHit {
  readonly itemId: number;
  readonly type: CollectibleItemType;
}

export interface CollisionFrameResult {
  readonly obstacleHit: ObstacleHit | null;
  readonly collectibles: readonly CollectibleHit[];
}
