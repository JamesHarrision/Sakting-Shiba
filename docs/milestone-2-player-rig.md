# Milestone 2 - Player Rig and Gameplay Integration

## Scope

Milestone 2 separates gameplay transforms, collision data, and replaceable player
visuals. It does not add obstacles, pickups, spawning, physics, or GLB loading.

`PlayerController` remains the only source of lane, jump, crouch, and movement
state. Babylon nodes mirror readonly snapshots after gameplay has updated.

## Runtime Hierarchy

```text
player-root
|- player-collider-root
|  |- player-body-collider-debug
|  `- player-pickup-radius-debug
|- player-visual-root
|  |- player-cat-mount
|  |- player-board-mount
|  `- player-imported-visual-container
|- player-ground-anchor
|- player-shadow-anchor
|- player-effect-anchor
|- player-camera-target-anchor
`- player-debug-root
```

The M1 procedural catboard is parented below
`player-imported-visual-container` and is the active fallback visual. It does not
provide collision dimensions.

## Transform Ownership

- `player-root.position.x`: lane position from `PlayerController`.
- `player-root.position.y`: track ground plus kinematic jump height.
- `player-collider-root`: collider debug representation only.
- `player-visual-root`: local visual calibration, lean, rotation, and scaling.
- `player-cat-mount`: local cat model calibration.
- `player-board-mount`: local skateboard model calibration.
- `player-ground-anchor` and `player-shadow-anchor`: remain on the track while
  the player jumps.
- `player-camera-target-anchor`: stable model-independent camera target point.

Visual code must not write to `player-root`, `player-collider-root`, or gameplay
snapshots.

## Shared Contracts

- `PlayerVisualSnapshot`: readonly lane, position, velocity, movement state,
  grounded state, and crouch progress.
- `PlayerColliderSnapshot`: readonly asset-independent AABB dimensions and
  pickup radius.
- `PlayerCameraTargetSnapshot`: readonly minimal camera target and pause state.
- `PlayerRigContract`: hierarchy, attachment, fallback, debug, reset, and
  disposal API.

Snapshots are frozen before crossing the gameplay-to-visual boundary. Mutating
a received snapshot cannot mutate `PlayerController` state.

## Collider

Collider dimensions live in
`src/config/gameplay/playerColliderConfig.ts`. Standing and crouching heights
are explicit and never derived from a cat or skateboard mesh bounding box.

The collider controller outputs data only. The debug meshes are wireframe,
non-pickable, do not cast or receive shadows, and are disabled by default.

## Visual Agent Integration

Get the rig through `RunScene.getPlayerRig()` and parent imported roots through
the attachment API:

```ts
const rig = runScene.getPlayerRig();

rig.setVisualLoadState("loading");

try {
  rig.attachCat(catAssetRoot, { disposeOnDetach: true });
  rig.attachBoard(boardAssetRoot, { disposeOnDetach: true });
  rig.setVisualLoadState("loaded");
} catch (error) {
  rig.reportVisualLoadFailure(error);
}
```

Use `disposeOnDetach: false` when an external `AssetContainer` owns disposal.
In that case detached roots are unparented but not destroyed.

Do not parent imported roots to the scene, `player-root`, or
`player-collider-root`. Keep imported asset roots at identity and calibrate
local offsets on `catMount` and `boardMount`. Mount calibration survives
`PlayerRig.reset()`.

The attachment API rejects using the same root for both mounts, ignores a
duplicate attach to the same mount, and disposes the previous owned attachment
when it is replaced.

## Fallback Flow

Supported load states are `idle`, `loading`, `loaded`, `fallback`, and `failed`.
`reportVisualLoadFailure()` logs one contextual error per loading attempt and
selects `fallback` by default. Gameplay, input, collider updates, and restart
continue while the M1 procedural visual remains available.

## Update Order

The single render loop uses seconds throughout:

1. Read and drain input.
2. Update `PlayerController` when not paused.
3. Update `PlayerColliderController` from the gameplay snapshot.
4. Apply rig gameplay and collider snapshots.
5. Update the player visual.
6. Update the runner camera.
7. Update the debug HUD and render the scene.

`GameClock.tick()` is the only milliseconds-to-seconds conversion point and
clamps large deltas. A paused frame does not advance gameplay or visual motion.

## Reset and Debug

Press `R` in the M2 debug build to reset the run. Reset does not create a new
controller, rig, model, listener, or update loop. It restores center lane,
ground height, standing collider, visual baseline, camera, and run score.

Press `F3` to toggle the existing HUD and PlayerRig debug helpers. PlayerRig
debug meshes are disabled by default.

## Verification

```bash
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run dev
```

The PlayerRig tests use Babylon `NullEngine`; no DOM mock or physics package is
required.

## Milestone Boundary

GLB loading, model calibration values, skeleton animation, obstacle collision,
pickup collection, score changes, and endless spawning belong to later work.
