import type { ObstacleItemType } from "../../contracts/spawn-pattern.contract";

export interface ObstacleRule {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly centerYOffset: number;
  readonly visualYOffset: number;
  readonly jumpClearance?: number;
  readonly requiresCrouch?: boolean;
}

export const OBSTACLE_RULES: Readonly<Record<ObstacleItemType, ObstacleRule>> =
  Object.freeze({
    obstacle_box: Object.freeze({
      width: 1.15,
      height: 0.95,
      depth: 1.1,
      centerYOffset: 0.475,
      visualYOffset: 0,
      jumpClearance: 0.72
    }),
    obstacle_fence: Object.freeze({
      width: 1.8,
      height: 0.72,
      depth: 0.7,
      centerYOffset: 1.4,
      visualYOffset: 0.95,
      requiresCrouch: true
    }),
    obstacle_dumpster: Object.freeze({
      width: 1.45,
      height: 1.2,
      depth: 1.35,
      centerYOffset: 0.6,
      visualYOffset: 0
    })
  });
