import type { LaneIndex, PlayerState } from "./gameplay";

export type PlayerVisualState = PlayerState | "paused";

export interface PlayerVisualSnapshot {
  /** Logical lane selected by gameplay */
  readonly laneIndex: LaneIndex;
  /** World X position (lane position) */
  readonly positionX: number;
  /** World Y position (jump height) */
  readonly positionY: number;
  /** Current vertical velocity (for jump arc awareness) */
  readonly verticalVelocity: number;
  /** Current player state */
  readonly state: PlayerVisualState;
  /** Horizontal movement direction: -1 left, 0 center, 1 right */
  readonly horizontalDirection: -1 | 0 | 1;
  /** Whether gameplay considers the player grounded */
  readonly isGrounded: boolean;
  /** Whether the crouch collider and pose should be active */
  readonly isCrouching: boolean;
  /** Normalized remaining crouch state, from 0 to 1 */
  readonly crouchProgress: number;
}

export interface CameraTargetSnapshot {
  /** World X to follow */
  targetX: number;
  /** World Y of the player root */
  targetY: number;
  /** Player state for camera behavior decisions */
  playerState: PlayerVisualState;
}
