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
      width: 1,
      height: 1.04,
      depth: 1.25,
      centerYOffset: 0.52,
      visualYOffset: 0,
      jumpClearance: 1.65
    })
  });
