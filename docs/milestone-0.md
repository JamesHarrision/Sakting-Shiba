# Milestone 0 - Foundation

## Goal

Create a runnable Babylon.js project and agree on the contracts that keep gameplay and world/UI work separate.

## Done

- Project initialized with Vite, TypeScript, Babylon.js, and Vitest.
- `npm run dev`, `npm run typecheck`, `npm run test`, and `npm run build` are available through package scripts.
- The first screen renders a 3D canvas with a ground plane, lane markers, camera, lighting, and a debug player cube.
- Gameplay types are defined in `src/contracts/gameplay.ts`.
- Shared events are defined in `src/events/gameEvents.ts`.
- `GameEventBus`, `GameClock`, and `RunStateStore` are implemented.
- Gameplay config is separated from logic.
- Starter spawn pattern data exists for M1/M3 expansion.

## Not Included

- No cat import.
- No skateboard import.
- No menu.
- No obstacle system.
- No physics engine.

## Next Milestone

Milestone 1 should add whitebox player movement:

- Three-lane movement.
- Jump.
- Crouch.
- Keyboard input.
- Delta-time based state updates.
