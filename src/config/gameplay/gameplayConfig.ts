import type { LaneIndex } from "../../contracts/gameplay";

export const GAMEPLAY_CONFIG = {
  initialSpeed: 10,
  maximumSpeed: 28,
  speedIncreasePerSecond: 0.08,
  laneWidth: 2.4,
  laneSwitchDuration: 0.18,
  jumpHeight: 2.8,
  gravity: -24,
  crouchDuration: 0.45,
  shieldDuration: 12,
  magnetDuration: 8
} as const;

export const LANE_INDICES: readonly LaneIndex[] = [0, 1, 2] as const;

export const LANE_X_POSITIONS: Record<LaneIndex, number> = {
  0: -GAMEPLAY_CONFIG.laneWidth,
  1: 0,
  2: GAMEPLAY_CONFIG.laneWidth
};
