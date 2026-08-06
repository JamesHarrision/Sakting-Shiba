import type { SpawnPattern } from "../../contracts/spawn-pattern.contract";

export const SPAWN_PATTERNS: readonly SpawnPattern[] = Object.freeze([
  {
    id: "easy-center-pickups",
    minimumDifficulty: 0,
    weight: 5,
    length: 16,
    rows: [
      { offsetZ: 0, lanes: ["empty", "coin", "empty"] },
      { offsetZ: 6, lanes: ["empty", "coin", "empty"] },
      { offsetZ: 12, lanes: ["empty", "coin", "empty"] }
    ]
  },
  {
    id: "easy-single-block",
    minimumDifficulty: 0,
    weight: 4,
    length: 14,
    rows: [
      { offsetZ: 0, lanes: ["obstacle_box", "empty", "empty"] },
      { offsetZ: 8, lanes: ["empty", "coin", "empty"] }
    ]
  },
  {
    id: "easy-open-weave",
    minimumDifficulty: 0,
    weight: 4,
    length: 20,
    rows: [
      { offsetZ: 0, lanes: ["empty", "obstacle_dumpster", "empty"] },
      { offsetZ: 7, lanes: ["coin", "empty", "empty"] },
      { offsetZ: 14, lanes: ["empty", "empty", "obstacle_fence"] }
    ]
  },
  {
    id: "medium-side-gate",
    minimumDifficulty: 2,
    weight: 3,
    length: 22,
    rows: [
      {
        offsetZ: 0,
        lanes: ["obstacle_box", "obstacle_dumpster", "empty"]
      },
      { offsetZ: 8, lanes: ["empty", "coin", "empty"] },
      {
        offsetZ: 16,
        lanes: ["empty", "obstacle_fence", "obstacle_dumpster"]
      }
    ]
  },
  {
    id: "medium-switchback",
    minimumDifficulty: 2,
    weight: 3,
    length: 26,
    rows: [
      {
        offsetZ: 0,
        lanes: ["obstacle_dumpster", "obstacle_box", "empty"]
      },
      {
        offsetZ: 10,
        lanes: ["empty", "obstacle_fence", "obstacle_box"]
      },
      { offsetZ: 20, lanes: ["empty", "coin", "empty"] }
    ]
  },
  {
    id: "hard-zigzag-gates",
    minimumDifficulty: 4,
    weight: 2,
    length: 34,
    rows: [
      {
        offsetZ: 0,
        lanes: ["obstacle_box", "obstacle_dumpster", "empty"]
      },
      {
        offsetZ: 8,
        lanes: ["empty", "obstacle_fence", "obstacle_dumpster"]
      },
      {
        offsetZ: 16,
        lanes: ["obstacle_fence", "obstacle_box", "empty"]
      },
      { offsetZ: 24, lanes: ["empty", "powerup_magnet", "empty"] },
      {
        offsetZ: 28,
        lanes: ["empty", "obstacle_dumpster", "obstacle_box"]
      }
    ]
  }
]);
