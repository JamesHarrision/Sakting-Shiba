import type { PlayerState } from "./gameplay";

export interface PlayerVisualSnapshot {
  /** World X position (lane position) */
  positionX: number;
  /** World Y position (jump height) */
  positionY: number;
  /** Current vertical velocity (for jump arc awareness) */
  verticalVelocity: number;
  /** Current player state */
  state: PlayerState;
  /** Horizontal movement direction: -1 left, 0 center, 1 right */
  horizontalDirection: -1 | 0 | 1;
}

export interface CameraTargetSnapshot {
  /** World X to follow */
  targetX: number;
  /** World Y of the player root */
  targetY: number;
  /** Player state for camera behavior decisions */
  playerState: PlayerState;
}
