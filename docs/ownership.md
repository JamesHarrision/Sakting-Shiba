# Ownership

Use this file as the source of truth until real GitHub usernames are known.

## Person 1 - Gameplay/Core

Owned paths:

- `src/gameplay/`
- `src/systems/`
- `src/config/gameplay/`
- `src/input/`
- `src/tests/gameplay/`

Responsibilities:

- Player controller.
- Lane movement.
- Jump and crouch.
- Collision.
- Spawn pattern logic.
- Score and difficulty.
- Combo and power-up rules.
- Game state.
- Gameplay tests.

## Person 2 - World/UI

Owned paths:

- `src/world/`
- `src/assets/`
- `src/ui/`
- `src/audio/`
- `src/vfx/`
- `src/tests/world/`

Responsibilities:

- Babylon engine and scene.
- Models and asset normalization.
- Track and environment.
- Camera and lighting.
- Object pooling.
- HUD, menu, and result flow.
- Audio, VFX, and responsive behavior.

## Shared Paths

Change these through small focused PRs:

- `src/contracts/`
- `src/events/`
- `src/scenes/`
- `src/config/shared/`
