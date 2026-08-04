# Catboard Rush

Low-poly 3D endless runner about a cat riding a skateboard through a city. The technical direction is Babylon.js, TypeScript, and Vite with simple kinematic gameplay instead of real skateboard physics.

## Milestone 0

This repo currently contains the foundation:

- Vite + TypeScript + Babylon.js app shell.
- Fullscreen 3D canvas with a ground plane, lane markers, camera, light, and debug player cube.
- Typed gameplay contracts.
- Typed `GameEventBus`.
- `GameClock`.
- `RunStateStore`.
- Gameplay config and starter spawn pattern data.
- Vitest unit tests for the gameplay foundation.

## Commands

```bash
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run test
pnpm run build
```

## Collaboration Ownership

Person 1 owns gameplay/core:

- `src/gameplay/`
- `src/systems/`
- `src/config/gameplay/`
- `src/input/`
- `src/tests/gameplay/`

Person 2 owns world/UI:

- `src/world/`
- `src/assets/`
- `src/ui/`
- `src/audio/`
- `src/vfx/`
- `src/tests/world/`

Shared areas require a small focused PR:

- `src/contracts/`
- `src/events/`
- `src/scenes/`
- `src/config/shared/`

## Git Workflow

Use `main` for stable code and `develop` for integration. Feature work branches from `develop`.

Suggested branches:

```text
feature/m1-player-controller
feature/m1-whitebox-world
feature/m2-player-rig
feature/m2-asset-import
```

Before merging a task, run:

```bash
pnpm run typecheck
pnpm run test
pnpm run build
```
