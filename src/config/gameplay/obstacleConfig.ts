import type { ObstacleItemType } from "../../contracts/spawn-pattern.contract";

export interface ObstacleRule {
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly centerYOffset: number;
  readonly visualYOffset: number;
  /** Ground marker color — readability cue for jump / crouch / dodge. */
  readonly markerColor: string;
  readonly jumpClearance?: number;
  readonly requiresCrouch?: boolean;
}

/**
 * Hitboxes are intentionally kept at or below the visual size so a fair
 * dodge/jump never clips the player ("jumped over but still died").
 */
export const OBSTACLE_RULES: Readonly<Record<ObstacleItemType, ObstacleRule>> =
  Object.freeze({
    obstacle_box: Object.freeze({
      // Matches box.glb at calibration scale 0.45 -> 0.9 cube
      width: 0.9,
      height: 0.9,
      depth: 0.9,
      centerYOffset: 0.45,
      visualYOffset: 0,
      markerColor: "#6EE0E0",
      jumpClearance: 0.68
    }),
    obstacle_fence: Object.freeze({
      // Floating barrier -> crouch under it
      width: 1.8,
      height: 0.72,
      depth: 0.7,
      centerYOffset: 1.4,
      visualYOffset: 0.95,
      markerColor: "#F5C85C",
      requiresCrouch: true
    }),
    obstacle_dumpster: Object.freeze({
      // Tall + wide -> dodge to another lane. Intentionally has NO
      // jumpClearance, so jumping over it never succeeds.
      width: 1,
      height: 1.04,
      depth: 1.25,
      centerYOffset: 0.52,
      visualYOffset: 0,
      markerColor: "#F0847A"
    })
  });
