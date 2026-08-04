import type { SpawnPattern } from "../../contracts/gameplay";

export const SPAWN_PATTERNS: readonly SpawnPattern[] = [
  {
    id: "m0-fish-line",
    minimumDifficulty: 0,
    weight: 10,
    rows: [
      {
        offsetZ: 0,
        lanes: [null, { type: "pickup", assetId: "pickup.fish" }, null]
      },
      {
        offsetZ: 8,
        lanes: [{ type: "obstacle", assetId: "obstacle.box" }, null, null]
      }
    ]
  }
];
