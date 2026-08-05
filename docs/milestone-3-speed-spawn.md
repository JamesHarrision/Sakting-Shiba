# Milestone 3: Speed, Difficulty, and Spawn Patterns

## Scope

Milestone 3 provides pure TypeScript gameplay data and progression systems.
It does not create Babylon meshes, move the track, perform collision checks,
award score, or change player movement and player assets.

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

Patterns are declared in `src/config/gameplay/spawnPatterns.ts`. Rows use only
`debug_obstacle`, `debug_pickup`, and `empty`.

| Tier | Minimum difficulty | Patterns |
| --- | ---: | --- |
| Easy | 0 | `easy-center-pickups`, `easy-single-block`, `easy-open-weave` |
| Medium | 2 | `medium-side-gate`, `medium-switchback` |
| Hard | 4 | `hard-zigzag-gates` |

Every row has at least one explicit empty lane. Starting patterns have at most
one obstacle per row. Debug item types do not encode jump or crouch actions, so
a row cannot require both actions at the same position.

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
dependency.

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
spacing, paused spawning, and restart state cleanup.
