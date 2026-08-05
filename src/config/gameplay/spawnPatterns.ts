import type { SpawnPattern } from "../../contracts/spawn-pattern.contract";

export const SPAWN_PATTERNS: readonly SpawnPattern[] = Object.freeze([
  {
    id: "easy-center-pickups",
    minimumDifficulty: 0,
    weight: 5,
    length: 16,
    rows: [
      { offsetZ: 0, lanes: ["empty", "debug_pickup", "empty"] },
      { offsetZ: 6, lanes: ["empty", "debug_pickup", "empty"] },
      { offsetZ: 12, lanes: ["empty", "debug_pickup", "empty"] }
    ]
  },
  {
    id: "easy-single-block",
    minimumDifficulty: 0,
    weight: 4,
    length: 14,
    rows: [
      { offsetZ: 0, lanes: ["debug_obstacle", "empty", "empty"] },
      { offsetZ: 8, lanes: ["empty", "debug_pickup", "empty"] }
    ]
  },
  {
    id: "easy-open-weave",
    minimumDifficulty: 0,
    weight: 4,
    length: 20,
    rows: [
      { offsetZ: 0, lanes: ["empty", "debug_obstacle", "empty"] },
      { offsetZ: 7, lanes: ["debug_pickup", "empty", "empty"] },
      { offsetZ: 14, lanes: ["empty", "empty", "debug_obstacle"] }
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
        lanes: ["debug_obstacle", "debug_obstacle", "empty"]
      },
      { offsetZ: 8, lanes: ["empty", "debug_pickup", "empty"] },
      {
        offsetZ: 16,
        lanes: ["empty", "debug_obstacle", "debug_obstacle"]
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
        lanes: ["debug_obstacle", "debug_obstacle", "empty"]
      },
      {
        offsetZ: 10,
        lanes: ["empty", "debug_obstacle", "debug_obstacle"]
      },
      { offsetZ: 20, lanes: ["empty", "debug_pickup", "empty"] }
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
        lanes: ["debug_obstacle", "debug_obstacle", "empty"]
      },
      {
        offsetZ: 8,
        lanes: ["empty", "debug_obstacle", "debug_obstacle"]
      },
      {
        offsetZ: 16,
        lanes: ["debug_obstacle", "debug_obstacle", "empty"]
      },
      { offsetZ: 24, lanes: ["empty", "debug_pickup", "empty"] },
      {
        offsetZ: 28,
        lanes: ["empty", "debug_obstacle", "debug_obstacle"]
      }
    ]
  }
]);
