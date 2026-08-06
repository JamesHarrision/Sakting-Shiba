# Shiba Skating ship reference

## Reference boundary

Shiba Skating uses Subway Surfers as a benchmark for lane readability,
responsive controls, collectible guidance, short-session pacing, and power-up
roles. It does not copy Subway Surfers branding, characters, artwork, audio,
level layouts, UI trade dress, or other proprietary content.

## Gameplay pillars

- Three lanes must remain readable at the fastest supported speed.
- Coins form readable paths that teach the safest or most rewarding route.
- Obstacles use distinct silhouettes: jump, crouch, or change lane.
- The first 20 seconds teach controls with low pressure and generous spacing.
- Speed begins energetic, ramps predictably, and never outruns reaction time.
- Power-ups create a short change of rhythm without obscuring hazards.

## Power-up roles

| Shiba Skating | Reference role | Ship behavior |
| --- | --- | --- |
| Coin Magnet | Coin Magnet | Pull nearby coins for a short duration. |
| Rocket Pack | Jetpack | Lift above ground hazards and create an aerial coin path. |
| Spring Paws | Super Sneakers | Increase jump height while preserving lane control. |
| Lucky Star | 2x Multiplier | Double score gain for a short duration. |
| Spare Board | Hoverboard | Optional consumable shield that absorbs one crash. |

Spring Paws and Lucky Star now use separate jump and score multipliers. Spare
Board belongs to the pre-run/store loop rather than random world spawns.

## Visual budgets

- Target: 120 FPS on the current test machine at 100% render scale.
- Near buildings: at most 6 reusable variants, instanced or cloned from cached
  containers, with no per-frame allocation.
- Distant skyline: low-detail building variants only.
- Road, lane marks, curbs, and guardrails remain procedural and pooled.
- Decorative props are non-collidable and never affect gameplay transforms.
- Imported props must be grounded from audited bounds and use a documented
  world scale.

## Release priorities

1. Collision readability and no false deaths.
2. Stable loading, restart, pause, and 120 FPS behavior.
3. Grounded, varied buildings and layered city depth.
4. Calm coin feedback, readable power-up VFX, and faster opening pace.
5. Polished menu, HUD, audio, store preview, and persistent progression.
