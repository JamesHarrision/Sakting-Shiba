import type { SpawnPattern } from "../../contracts/spawn-pattern.contract";

export const TUTORIAL_SPAWN_PATTERN: Readonly<SpawnPattern> = Object.freeze({
  id: "tutorial-coin-route",
  minimumDifficulty: 0,
  weight: 1,
  length: 32,
  rows: Object.freeze([
    { offsetZ: 0, lanes: ["empty", "coin", "empty"] as const },
    { offsetZ: 8, lanes: ["coin", "empty", "empty"] as const },
    { offsetZ: 16, lanes: ["empty", "empty", "coin"] as const },
    { offsetZ: 24, lanes: ["empty", "coin", "empty"] as const }
  ])
});
