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
  /** Applied to the GLB instance; unused for procedural builders. */
  readonly calibration: PropCalibration;
}

export const PROP_ASSETS: readonly PropAssetEntry[] = [
  { kind: "building", assetPath: `${PROPS_ASSET_DIR}/building.glb`, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "lamp", assetPath: `${PROPS_ASSET_DIR}/lamp.glb`, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "fence", assetPath: `${PROPS_ASSET_DIR}/fence.glb`, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 90, z: 0 }, scale: 1 } },
  { kind: "box", assetPath: `${PROPS_ASSET_DIR}/box.glb`, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "cone", assetPath: `${PROPS_ASSET_DIR}/cone.glb`, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "dumpster", assetPath: `${PROPS_ASSET_DIR}/dumpster.glb`, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "tree", assetPath: `${PROPS_ASSET_DIR}/tree.glb`, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "plant", assetPath: `${PROPS_ASSET_DIR}/plant.glb`, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  // Procedural-only rooftop staples (no asset yet)
  { kind: "vent", assetPath: null, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "ac", assetPath: null, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "pipe", assetPath: null, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "antenna", assetPath: null, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "warningLight", assetPath: null, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } },
  { kind: "barrier", assetPath: null, calibration: { position: { x: 0, y: 0, z: 0 }, rotationDegrees: { x: 0, y: 0, z: 0 }, scale: 1 } }
];

export function getPropEntry(kind: PropKind): PropAssetEntry {
  const entry = PROP_ASSETS.find((e) => e.kind === kind);
  if (!entry) {
    throw new Error(`Unknown prop kind: ${kind}`);
  }
  return entry;
}

export const PROP_KINDS: readonly PropKind[] = PROP_ASSETS.map((e) => e.kind);
