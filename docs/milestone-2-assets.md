# Milestone 2 - Real 3D Asset Integration & Player Visual

## Goal

Replace the M1 procedural placeholder with real low-poly 3D assets (`cat.glb`, `skateboard.glb`) inside a stable `PlayerRig`. Keep gameplay collisions and lane/jump/crouch behavior from M1 untouched, and keep the procedural placeholder as a fallback.

## Status

- Infrastructure complete: AssetRegistry, PlayerAssetLoader, PlayerModelView, calibration config, dual-mode PlayerVisualController, extended DebugHUD.
- Asset loading lifecycle: idle → loading → loaded / failed → fallback.
- Procedural fallback remains the active visual until both GLBs are provided and load successfully.

## Asset Audit (current)

**Blocker: real asset files are not present in the repository.**

No `cat.glb` / `skateboard.glb` exist yet under `public/assets/models/player/` (directory created and ready).

| Asset | Expected path | Status |
|-------|---------------|--------|
| Cat | `public/assets/models/player/cat.glb` | MISSING - loader will report `failed` and fallback stays active |
| Skateboard | `public/assets/models/player/skateboard.glb` | MISSING - loader will report `failed` and fallback stays active |

Audit fields below will be filled once files are provided (format, size, mesh/material count, texture resolution, bounds, pivot, orientation).

## Architecture

### Loader flow

```
main.ts
 └─ PlayerAssetLoader (owns cache + load states)
     ├─ preload(id)             // LoadAssetContainerAsync, once per asset
     └─ createCatInstance / createBoardInstance(parent)  // clone into parent
PlayerModelView
 ├─ BoardMount → BoardCalibration → ImportedBoardRoot
 └─ CatMount   → CatCalibration   → ImportedCatRoot
PlayerVisualController  (dual-mode: real model OR procedural fallback)
```

### Files

| File | Responsibility |
|------|----------------|
| `src/assets/AssetRegistry.ts` | Stable asset IDs + centralized URL manifest |
| `src/assets/PlayerAssetLoader.ts` | AssetContainer load, cache, instance creation, dispose, load states |
| `src/player/visual/PlayerModelView.ts` | Calibration hierarchy (CatMount/BoardMount) |
| `src/config/visual/player-model.config.ts` | All visual calibration values |
| `src/world/player/PlayerVisualController.ts` | State-driven animation for model or fallback |
| `src/world/player/ProceduralPlayer.ts` | M1 fallback placeholder (kept) |
| `src/ui/debug/DebugHud.ts` | Asset load state, model vs fallback indicator |

### Loading state rules

- Both assets must load successfully before the model view is shown.
- If either asset fails: log once, keep fallback, game remains playable.
- On dispose: model instances + loader cache are disposed; no duplicate meshes on restart.
- HMR: `disposeGame()` tears down scene and loader before hot reload.

## Calibration

All values live in `src/config/visual/player-model.config.ts`:

- `cat`: position / rotationDegrees / scale
- `skateboard`: position / rotationDegrees / scale
- `catSeatHeight`, `boardGroundClearance`, `cameraVisualOffsetY`
- `leanAngleDegrees`, `jumpPitchDegrees`, `landingSquashAmount`, `crouchScaleY`

These are the only knobs needed to fit any new cat/board model. Gameplay values (lane width, jump height) are untouched.

## Not Done / Next Steps

- Provide `cat.glb` + `skateboard.glb` (low-poly, no skeleton required, forward = +Z recommended).
- Tune `player-model.config.ts` values against the real assets.
- Fill the asset audit table and capture the 6 acceptance screenshots.
