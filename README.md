# Catboard Rush

Low-poly 3D endless runner about a cat riding a skateboard through a city. The technical direction is Babylon.js, TypeScript, and Vite with simple kinematic gameplay instead of real skateboard physics.

## Milestone 1

The current integration build contains:

- Vite + TypeScript + Babylon.js app shell.
- A polished whitebox rooftop world with three readable lanes, fog, lighting, and a runner camera.
- A procedural cat and skateboard placeholder with lane, jump, crouch, and landing feedback.
- Keyboard controls, pause handling, and a toggleable debug HUD.
- Typed gameplay contracts.
- Typed `GameEventBus`.
- `GameClock`.
- `RunStateStore`.
- Gameplay config and starter spawn pattern data.
- Vitest unit tests for the gameplay foundation.

Controls: `A/D` or arrow keys change lanes, `W`/Up/Space jumps, `S`/Down crouches,
`P`/Escape pauses, and `F3` toggles the debug HUD.

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
