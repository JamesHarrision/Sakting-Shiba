import type { LaneIndex, PlayerState } from "./gameplay";

export type PlayerVisualState = PlayerState | "paused";

export interface PlayerVisualSnapshot {
  /** Logical lane selected by gameplay */
  laneIndex: LaneIndex;
  /** World X position (lane position) */
  positionX: number;
  /** World Y position (jump height) */
  positionY: number;
  /** Current vertical velocity (for jump arc awareness) */
  verticalVelocity: number;
  /** Current player state */
  state: PlayerVisualState;
  /** Horizontal movement direction: -1 left, 0 center, 1 right */
  horizontalDirection: -1 | 0 | 1;
  /** Whether gameplay considers the player grounded */
  isGrounded: boolean;
  /** Whether the crouch collider and pose should be active */
  isCrouching: boolean;
}

export interface CameraTargetSnapshot {
  /** World X to follow */
  targetX: number;
  /** World Y of the player root */
  targetY: number;
  /** Player state for camera behavior decisions */
  playerState: PlayerVisualState;
}
