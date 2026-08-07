/**
 * Per-item calibration overrides for cosmetic models.
 * After running `scripts/normalize-player-glb.mjs`, every GLB is
 * auto-normalized. Use this file to manually tweak any model's
 * visual position / scale / rotation.
 *
 * - position:  [X, Y, Z]  offset in world units (relative to mount)
 * - rotation:  [X, Y, Z]  Euler angles in degrees
 * - scale:     uniform    float multiplier on top of the auto-scale
 *
 * Leave a cosmetic ID out to use the default auto-calibration.
 */

export interface CosmeticOverride {
  readonly position?: [number, number, number];
  readonly rotation?: [number, number, number];
  readonly scale?: number;
}

/**
 * Format:  { cosmeticItemId: override }
 *
 * Example (uncomment to try):
 *   "dog.calico": {
 *     position: [0, 0.05, 0],    // shift up 5cm
 *     scale: 0.95,                // shrink 5%
 *   },
 */
export const COSMETIC_OVERRIDES: Readonly<Record<string, CosmeticOverride>> =
  Object.freeze({
    // "dog.calico":   { position: [0, 0.05, 0], scale: 0.95 },
    // "dog.midnight": { position: [0, 0, 0.05], scale: 1.02 },
    // "board.mint":   { scale: 1.05 },
    // "hat.snapback": { rotation: [0, 15, 0] },  // tilt 15° right
  });
