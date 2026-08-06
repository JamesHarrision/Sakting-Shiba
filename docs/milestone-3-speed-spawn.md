# Milestone 3: Speed, Difficulty, and Spawn Patterns

## Scope

Milestone 3 introduced the pure TypeScript progression and spawn contracts.
The ship integration now consumes those contracts in `RunGameplaySystem` and
renders their requests through `TrackManager`; the director still has no
Babylon dependency and remains the sole owner of pattern selection.

## RunSpeedSystem

`RunSpeedSystem` reads `RUN_SPEED_CONFIG` and exposes:

- `update(deltaSeconds)`
- `getCurrentSpeed()`
- `getDifficulty()`
- `getSnapshot()`
- `pause()` / `resume()`
- `reset()`

Difficulty starts at zero and increases by one after every active
`difficultyIncreaseInterval`. Paused time is excluded. Speed is clamped to
`maximumSpeed`, and reset restores initial speed, difficulty zero, and the
running state.

## Spawn patterns

Patterns are declared in `src/config/gameplay/spawnPatterns.ts`. Rows use
`obstacle_box`, `obstacle_fence`, `obstacle_dumpster`, `coin`, the three timed
powerups, and `empty`.

| Tier | Minimum difficulty | Patterns |
| --- | ---: | --- |
| Easy | 0 | `easy-center-pickups`, `easy-single-block`, `easy-open-weave` |
| Medium | 2 | `medium-side-gate`, `medium-switchback` |
| Hard | 4 | `hard-zigzag-gates` |

Every row has at least one explicit empty lane. Starting patterns have at most
one obstacle per row. No row requires jumping and crouching at the same
position. Box obstacles require a jump, fences require crouching, and dumpsters
require changing lane.

## SpawnDirector

`SpawnDirector.createNextRequest(playerZ, difficulty)` returns a `SpawnRequest`
or `null` while paused. It:

- Filters out patterns above the current difficulty.
- Selects eligible patterns by weight.
- Uses deterministic seeded random values.
- Keeps the first request at least `initialSpawnDistance` ahead of the player.
- Places each later request after the prior pattern length and safe gap.
- Restores random and spawn state on reset.

The director returns data only and has no Babylon or world implementation
dependency. `RunGameplaySystem` forwards the resulting requests to the world;
the removed development-only placeholder feeder is no longer part of runtime.

## World Agent handoff

The shared `WorldGameplayPort` accepts only:

- `WorldRunStateSnapshot` containing `currentSpeed` and `isPaused`.
- `SpawnRequest` through `enqueueSpawn`.
- A reset signal through `resetRun`.

The World Agent must not receive `SpawnDirector` or `PlayerController`.

## Validation

Run:

```text
pnpm run typecheck
pnpm run test
pnpm run build
```

The automated suite covers speed progression and clamping, difficulty,
pause/reset, difficulty filtering, safe lanes, deterministic seeds, spawn
spacing, paused spawning, three simulated minutes, and ten restart cycles with
stable mesh and spawn state.
