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

  /** Cat seat height: distance from board mount to cat calibration origin (feet on deck) */
  catSeatHeight: number;
  /** Feet distance below the cat calibration origin (used for foot-locked crouch squash) */
  catFootOffset: number;
  /** Top of the board deck above ground level */
  boardDeckHeight: number;
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

/**
 * Calibration values computed from the real assets (see docs/milestone-2-assets.md):
 * - cat.glb:  world bbox 2.25 x 2.49 x 1.87, feet at Y -0.995, stands upright (Y is tallest)
 * - skateboard.glb: world bbox 0.76 x 0.11 x 0.19, length along X (needs +90deg Y rotation),
 *                   ground already at Y 0
 */
export const PLAYER_MODEL_CONFIG: PlayerModelVisualConfig = {
  cat: {
    position: { x: 0, y: 0.895, z: 0 },
    rotationDegrees: { x: 0, y: 0, z: 0 },
    scale: 0.66,
  },
  skateboard: {
    position: { x: 0, y: 0, z: 0 },
    rotationDegrees: { x: 0, y: 90, z: 0 },
    scale: 2.2,
  },

  // catSeatHeight = boardDeckHeight + catFootOffset
  catSeatHeight: 0.895,
  catFootOffset: 0.657,
  boardDeckHeight: 0.238,
  boardGroundClearance: 0,
  cameraVisualOffsetY: 0.15,

  leanAngleDegrees: 12,
  jumpPitchDegrees: 8,
  landingSquashAmount: 0.85,
  crouchScaleY: 0.55,
};
