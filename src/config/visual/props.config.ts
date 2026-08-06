/**
 * Environment prop asset manifest.
 *
 * Each kind has an optional GLB path under `src/assets/models/props/`.
 * PropAssetLoader discovers which files actually exist via Vite's
 * `import.meta.glob` — present files are loaded, absent ones silently keep
 * the procedural builder (no console noise, no errors).
 *
 * To add real assets: drop `<kind>.glb` into `src/assets/models/props/`
 * and reload — the loader picks it up immediately.
 */
export const PROPS_ASSET_DIR = "/src/assets/models/props";

export type PropKind =
  | "building"
  | "lamp"
  | "fence"
  | "box"
  | "cone"
  | "dumpster"
  | "tree"
  | "plant"
  | "vent"
  | "ac"
  | "pipe"
  | "antenna"
  | "warningLight"
  | "barrier";

export interface PropCalibration {
  position: { x: number; y: number; z: number };
  rotationDegrees: { x: number; y: number; z: number };
  scale: number;
}

export interface PropAssetEntry {
  readonly kind: PropKind;
  /** Expected GLB path (relative to public/), or null for procedural-only kinds. */
  readonly assetPath: string | null;
  /** False for source assets that exceed the runtime draw-call budget. */
  readonly useAsset: boolean;
  /** Collapses a single-material GLB into one reusable mesh before cloning. */
  readonly mergeMeshes?: boolean;
  /** Applied to the GLB instance; unused for procedural builders. */
  readonly calibration: PropCalibration;
}

/**
 * Calibration per kind, computed from the real GLB audit (scripts/audit-props.mjs).
 * World bbox at scale 1:
 * - box 2x2x2 (center pivot)        -> scale 0.45 => 0.9 cube
 * - building 5.8x5.1x8.9 (offset)   -> scale 0.6, recentered on its base
 * - cone Z-up (axis along Z)        -> scale 0.3, rotate x -90 to stand
 * - dumpster 2.2x2.3x2.8 (center)   -> scale 0.45, base at y=-1.167
 * - fence 20x40x96 (length along Z) -> scale 0.025
 * - lamp 35.7 tall (base at y=0)    -> scale 0.05
 * - plant 5.1x6.1x4.9 (center)      -> scale 0.2, base at y=-1
 * - tree 4.1x7.5x5.0 (center)       -> scale 0.25, base at y=-4.55
 */
export const PROP_ASSETS: readonly PropAssetEntry[] = [
  {
    kind: "box",
    assetPath: `${PROPS_ASSET_DIR}/box.glb`,
    useAsset: true,
    calibration: {
      position: { x: 0, y: 0.45, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 0.45,
    },
  },
  {
    kind: "building",
    assetPath: `${PROPS_ASSET_DIR}/building.glb`,
    useAsset: true,
    mergeMeshes: true,
    calibration: {
      position: { x: -0.165, y: 1.624, z: -1.185 },
      rotationDegrees: { x: 0, y: 0, z: 0.5 },
      scale: 0.6,
    },
  },
  {
    kind: "cone",
    assetPath: `${PROPS_ASSET_DIR}/cone.glb`,
    useAsset: true,
    calibration: {
      position: { x: 0, y: 0.013, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 0.005,
    },
  },
  {
    kind: "dumpster",
    assetPath: `${PROPS_ASSET_DIR}/dumpster.glb`,
    useAsset: true,
    calibration: {
      position: { x: 0, y: 0.525, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 0.45,
    },
  },
  {
    kind: "fence",
    assetPath: `${PROPS_ASSET_DIR}/fence.glb`,
    useAsset: true,
    calibration: {
      position: { x: -1.09, y: 0.238, z: -0.227 },
      rotationDegrees: { x: 0, y: 90, z: 0 },
      scale: 0.025,
    },
  },
  {
    kind: "lamp",
    assetPath: `${PROPS_ASSET_DIR}/lamp.glb`,
    useAsset: true,
    calibration: {
      position: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 0.05,
    },
  },
  {
    kind: "plant",
    assetPath: `${PROPS_ASSET_DIR}/plant.glb`,
    useAsset: true,
    calibration: {
      position: { x: 0, y: 0.2, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 0.2,
    },
  },
  {
    kind: "tree",
    assetPath: `${PROPS_ASSET_DIR}/tree.glb`,
    useAsset: true,
    calibration: {
      position: { x: 0, y: 1.14, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 0.25,
    },
  },
  // Procedural-only rooftop staples (no asset yet)
  {
    kind: "vent",
    assetPath: null,
    useAsset: false,
    calibration: {
      position: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 1,
    },
  },
  {
    kind: "ac",
    assetPath: null,
    useAsset: false,
    calibration: {
      position: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 1,
    },
  },
  {
    kind: "pipe",
    assetPath: null,
    useAsset: false,
    calibration: {
      position: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 1,
    },
  },
  {
    kind: "antenna",
    assetPath: null,
    useAsset: false,
    calibration: {
      position: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 1,
    },
  },
  {
    kind: "warningLight",
    assetPath: null,
    useAsset: false,
    calibration: {
      position: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 1,
    },
  },
  {
    kind: "barrier",
    assetPath: null,
    useAsset: false,
    calibration: {
      position: { x: 0, y: 0, z: 0 },
      rotationDegrees: { x: 0, y: 0, z: 0 },
      scale: 1,
    },
  },
];

export function getPropEntry(kind: PropKind): PropAssetEntry {
  const entry = PROP_ASSETS.find((e) => e.kind === kind);
  if (!entry) {
    throw new Error(`Unknown prop kind: ${kind}`);
  }
  return entry;
}

export const PROP_KINDS: readonly PropKind[] = PROP_ASSETS.map((e) => e.kind);
