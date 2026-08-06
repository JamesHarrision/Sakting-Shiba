import type { SpawnRow } from "./spawn-pattern.contract";

/**
 * World-space request from the Gameplay Agent to render spawn placeholders.
 * The World Agent never decides patterns or difficulty — it only renders.
 *
 * Contract notes:
 * - `startZ` is a WORLD Z in the current scroll space. The player sits at Z 0
 *   and the world scrolls toward -Z. Patterns ahead of the camera use +Z.
 * - `startZ` should be within the active track window (from behind the camera
 *   up to the fogged spawn area); out-of-window requests are skipped once.
 * - Rows are offset from `startZ` (see SpawnRow.offsetZ).
 */
export interface SpawnRequest {
  readonly patternId: string;
  readonly startZ: number;
  readonly rows: readonly SpawnRow[];
}

export interface TrackDebugStats {
  readonly activeChunks: number;
  readonly pooledChunks: number;
  readonly activeObstacles: number;
  readonly activePickups: number;
  readonly speed: number;
  readonly furthestChunkZ: number;
}

/** Chunk variants available for rotation */
export const TRACK_CHUNK_VARIANTS = ["A", "B", "C", "D"] as const;
export type TrackChunkVariant = (typeof TRACK_CHUNK_VARIANTS)[number];
