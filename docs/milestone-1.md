# Milestone 1 - Whitebox Gameplay

## Integrated Scope

This branch combines the gameplay/core and polished whitebox world halves of Milestone 1:

- Three-lane player controller.
- Smooth lane switching using delta time.
- Edge clamping at lane `0` and lane `2`.
- Kinematic jump using configured gravity.
- Timed crouch state.
- Keyboard input abstraction for desktop controls.
- Gameplay events for lane change, jump, landing, and state transitions.
- Unit tests for controller and keyboard input behavior.
- Rooftop track, city backdrop, runner camera, lighting, and fog.
- Procedural cat and skateboard placeholder with visual state animation.
- A snapshot-only boundary between gameplay and player visuals.
- A single render loop and player transform owner.

## Controls

Desktop:

- `A` or `ArrowLeft`: move left.
- `D` or `ArrowRight`: move right.
- `W`, `ArrowUp`, or `Space`: jump.
- `S` or `ArrowDown`: crouch.
- `P` or `Escape`: pause.
- `F3`: toggle the debug HUD.

## Test Checklist

```bash
pnpm run typecheck
pnpm run test
pnpm run build
```

Manual smoke test:

- Move left, center, right.
- Jump and land.
- Crouch and return to running.
- Hold a lane key and confirm it only moves one lane per press.
- Pause with `P` or `Escape`, then resume.
- Leave the window and return; gameplay should remain stable without buffered input.
- Toggle the debug HUD with `F3`.
- Confirm the browser console remains free of errors while playing.
