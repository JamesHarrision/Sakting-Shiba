# Milestone 1 - Whitebox Gameplay

## Person 1 Scope

This branch implements the gameplay/core half of Milestone 1:

- Three-lane player controller.
- Smooth lane switching using delta time.
- Edge clamping at lane `0` and lane `2`.
- Kinematic jump using configured gravity.
- Timed crouch state.
- Keyboard input abstraction for desktop controls.
- Gameplay events for lane change, jump, landing, and state transitions.
- Unit tests for controller and keyboard input behavior.

## Controls

Desktop:

- `A` or `ArrowLeft`: move left.
- `D` or `ArrowRight`: move right.
- `W`, `ArrowUp`, or `Space`: jump.
- `S` or `ArrowDown`: crouch.
- `P` or `Escape`: pause.

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
