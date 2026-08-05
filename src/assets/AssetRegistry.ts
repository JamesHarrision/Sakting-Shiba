export const PLAYER_ASSET_IDS = {
  cat: "player.cat",
  skateboard: "player.skateboard",
} as const;

export type PlayerAssetId =
  (typeof PLAYER_ASSET_IDS)[keyof typeof PLAYER_ASSET_IDS];

export interface AssetEntry {
  readonly type: "model";
  readonly url: string;
  readonly description: string;
}

export const ASSET_MANIFEST: Readonly<Record<PlayerAssetId, AssetEntry>> = {
  [PLAYER_ASSET_IDS.cat]: {
    type: "model",
    url: "/assets/models/player/cat.glb",
    description: "Low-poly cat model",
  },
  [PLAYER_ASSET_IDS.skateboard]: {
    type: "model",
    url: "/assets/models/player/skateboard.glb",
    description: "Skateboard model",
  },
} as const;

/** Convenience for passing around asset entries */
export function getAssetEntry(id: PlayerAssetId): AssetEntry {
  return ASSET_MANIFEST[id];
}
