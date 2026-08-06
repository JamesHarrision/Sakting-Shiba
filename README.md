# Shiba Skating

Shiba Skating is a low-poly 3D endless runner about a cat riding a skateboard
through a rooftop city. It is built with Babylon.js, TypeScript, Vite, and pnpm.

## Play loop

- Dodge dumpsters by changing lane or with a well-timed high jump.
- Jump over boxes and crouch under fences.
- Collect coins for the persistent wallet.
- Pick up Magnet, Rush, and Rocket powerups.
- Buy and equip cat skins and skateboards in the store.
- Learn the controls through the first-run tutorial.

The game includes a main menu, countdown, pause and result screens, responsive
touch controls, sound effects, looping music, camera impact, landing feedback,
speed effects, procedural asset fallback, and persistent cosmetic progression.

## Controls

| Action | Keyboard | Touch |
| --- | --- | --- |
| Change lane | `A` / `D` or Left / Right | Left / Right buttons |
| Jump | `W`, Up, or Space | Up button |
| Crouch | `S` or Down | Down button |
| Pause / resume | `P` or Escape | Pause button |
| Restart | `R` | Run again button |
| Performance HUD | `F3` | Keyboard only |

## Performance

The default preset disables dynamic shadows and post-processing, pools track
chunks and gameplay items, keeps the procedural world below the tested mesh
budget, and excludes the heavy development building model from production.
Adaptive resolution targets 120 FPS while leaving the HTML interface sharp.
Actual FPS is limited by the device and display refresh rate; press `F3` during
a run to inspect the live result on the target machine.

## Commands

```bash
pnpm install
pnpm run dev
pnpm run typecheck
pnpm run test
pnpm run build
```

## Architecture

- `src/gameplay/`: movement, run progression, collision, powerups, tutorial,
  profile, and deterministic spawn selection.
- `src/world/`: pooled infinite track, props, camera, player presentation, and
  world orchestration.
- `src/config/`: data-driven gameplay, visuals, cosmetics, and performance.
- `src/contracts/`: shared gameplay-to-world data contracts.
- `src/ui/`, `src/audio/`, `src/vfx/`: complete presentation layer.
- `src/tests/`: unit, integration, asset-runtime, three-minute, and restart
  acceptance coverage.

Milestone notes remain in `docs/`. The shippable integration work lives on the
`super-slop` branch.
