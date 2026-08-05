# Milestone 2 - Real 3D Asset Integration & Player Visual

## Goal

Replace the M1 procedural placeholder with real low-poly 3D assets (`cat.glb`, `skateboard.glb`) inside a stable `PlayerRig`. Keep gameplay collisions and lane/jump/crouch behavior from M1 untouched, and keep the procedural placeholder as a fallback.

## Status

- Infrastructure complete: AssetRegistry, PlayerAssetLoader, PlayerModelView, calibration config, dual-mode PlayerVisualController, extended DebugHUD.
- Real assets integrated and calibrated (`cat.glb` + `skateboard.glb` under `public/assets/models/player/`).
- Asset loading lifecycle: idle → loading → loaded / failed → fallback.
- Procedural placeholder remains as fallback when either GLB fails to load.

## Asset Audit

Audit performed with a GLB parser (JSON chunk + node world transforms). "World bbox" includes node matrix transforms.

### cat.glb

| Field | Value |
|-------|-------|
| File size | 276.7 KB |
| GLB version | 2 |
| Meshes / primitives | 1 / 1 |
| Vertices | 415 |
| Nodes | 5 (1 TRS, 2 matrix) |
| Materials / textures | 1 / 1 |
| Animations / skins | 1 (MorphBake, transform only) / 0 |
| World bbox (min) | (-1.187, -0.995, -0.970) |
| World bbox (max) | (1.065, 1.491, 0.901) |
| World dims [X,Y,Z] | [2.252, 2.486, 1.871] — Y tallest, stands upright |
| Ground Y | -0.995 (feet below origin) |
| Root | `Sketchfab_model` at origin |

Notes: no skeleton; the single animation is a baked morph/transform — never started by the loader (kept idle). Material is `doubleSided`, roughness 1, non-metal. Faces assumed +Z; if facing backward, flip `cat.rotationDegrees.y` to 180.

### skateboard.glb

| Field | Value |
|-------|-------|
| File size | 2329.6 KB |
| GLB version | 2 |
| Meshes / primitives | 5 / 5 |
| Vertices | 7574 |
| Nodes | 13 (7 matrix) |
| Materials / textures | 1 / 3 |
| Animations / skins | 0 / 0 |
| World bbox (min) | (-0.380, 0.000, -0.097) |
| World bbox (max) | (0.380, 0.108, 0.097) |
| World dims [X,Y,Z] | [0.760, 0.108, 0.194] — length along X |
| Ground Y | 0.000 (wheels rest on ground) |
| Meshes | Board, Rubber, Metal, Wheels, Bolts |

Notes: length is along X, so the board is rotated +90° around Y to run along the track (+Z). 3 textures (~2.3 MB) are from the material; acceptable for a single player. No animation, no skeleton.

## Calibration (see src/config/visual/player-model.config.ts)

Model reference dimensions (world bbox, scale = 1): cat 2.25 x 2.49 x 1.87 (feet at Y -0.995); board 0.76 (length along X) x 0.19 (width) x 0.11 (height, ground at Y 0).

- skateboard: `rotationDegrees.y = 90`, `scale = 3.0`, `position.y = 0` (wheels on ground)
  - Resulting size: length ~2.28, width ~0.58, deck top ~0.32 above ground
  - Board extends ~0.5 beyond the dog's body each end; dog's feet stay centered on the deck
- cat: `scale = 0.66`, `rotationDegrees.y = 0` (faces +Z), `position.y = 0.981`
  - Resulting height ~1.64; feet rest on the board deck (`catSeatHeight = boardDeckHeight + catFootOffset`)
- Crouch uses foot-locked squash so feet stay on the deck (`boardDeckHeight + catFootOffset * crouchScaleY`).

## Architecture

### Loader flow

```
main.ts
 └─ PlayerAssetLoader (owns AssetContainer cache + load states)
     ├─ preload(id)             // LoadAssetContainerAsync, once per asset
     └─ createCatInstance / createBoardInstance(parent)
         // addAllToScene + reparent top-level nodes under instance root,
         // preserving imported node hierarchy (matrix/TRS intact)
PlayerModelView
 ├─ BoardMount → BoardCalibration → ImportedBoardRoot
 └─ CatMount   → CatCalibration   → ImportedCatRoot
PlayerVisualController  (dual-mode: real model OR procedural fallback)
```

### Files

| File | Responsibility |
|------|----------------|
| `src/assets/AssetRegistry.ts` | Stable asset IDs + centralized URL manifest |
| `src/assets/PlayerAssetLoader.ts` | AssetContainer load, cache, instance attach, dispose, load states |
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

## Performance (after integration)

- Cat: 1 mesh / 415 verts; Board: 5 meshes / 7574 verts. Total added draw calls: 6 (+shadow pass).
- No materials created in the update loop; animation groups are never started.
- Shadow casting limited to the model meshes (see `getShadowMeshes`).

## Not Done / Next Steps

- Visual orientation verification in-browser (cat assumed facing +Z; board rotated +90° around Y).
- Optional: texture resolution reduction if memory becomes a concern (currently ~2.3 MB board).

