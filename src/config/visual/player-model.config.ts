/**
 * Calibration config for real 3D player models.
 * All position/rotation/scale adjustments live here.
 * Gameplay values (lane width, jump height, etc.) are NOT touched.
 */
export interface ModelCalibration {
  position: { x: number; y: number; z: number };
  /** Euler rotation in degrees */
  rotationDegrees: { x: number; y: number; z: number };
  scale: number;
}

export interface PlayerModelVisualConfig {
  cat: ModelCalibration;
  skateboard: ModelCalibration;

  /** Cat seat height above board surface (world units) */
  catSeatHeight: number;
  /** Board ground clearance at rest */
  boardGroundClearance: number;
  /** Extra camera Y offset to frame the player properly */
  cameraVisualOffsetY: number;

  /** Maximum lean angle in degrees during lane switch */
  leanAngleDegrees: number;
  /** Board pitch in degrees during jump takeoff */
  jumpPitchDegrees: number;
  /** Squash amount on landing (1 = no squash) */
  landingSquashAmount: number;
  /** Vertical scale during crouch */
  crouchScaleY: number;
}

export const PLAYER_MODEL_CONFIG: PlayerModelVisualConfig = {
  cat: {
    position: { x: 0, y: 0.62, z: 0.04 },
    rotationDegrees: { x: 0, y: 0, z: 0 },
    scale: 1,
  },
  skateboard: {
    position: { x: 0, y: 0.08, z: 0 },
    rotationDegrees: { x: 0, y: 0, z: 0 },
    scale: 1,
  },

  catSeatHeight: 0.62,
  boardGroundClearance: 0.08,
  cameraVisualOffsetY: 0.15,

  leanAngleDegrees: 12,
  jumpPitchDegrees: 8,
  landingSquashAmount: 0.85,
  crouchScaleY: 0.55,
};
