# Milestone 2 Integration Audit

Date: 2026-08-05  
Branch: `integration/milestone-2`  
Verdict: **BLOCKED** pending browser visual acceptance and screenshots.

## 1. Commits integrated

- Gameplay/Core: `4ad827e` through `a77398f` from `feature/m2-player-rig`.
- Asset/Visual: `1b30274` through `f8e4d8d` from `feature/m2-player-assets`.
- Common Milestone 1 base: `119e09f`.

## 2. Conflicts encountered

Manual content conflicts occurred in:

- `src/main.ts`
- `src/scenes/RunScene.ts`
- `src/world/player/PlayerVisualController.ts`

## 3. Conflict resolutions

- Kept the single Engine, render loop, RunScene, input controller, gameplay
  controller, collider controller, PlayerRig, camera controller, visual
  controller, asset loader, and procedural fallback.
- Removed the asset branch's duplicate gameplay root, collider, mounts, and
  shadow anchor.
- Reused `PlayerRig`'s `CatMount`, `BoardMount`, `VisualRoot`, shadow anchor,
  and effect anchor for imported assets and visual effects.
- Kept gameplay as the only writer of `PlayerRoot.position` through
  `PlayerRig.applyGameplayState`.
- Corrected skateboard scale from the inconsistent `5.0` value to the
  documented and derived `3.0` value.
- Prevented asynchronous asset loads from reattaching resources after
  disposal during reload or HMR.

## 4. Final architecture

Frame order is:

1. Read one input snapshot.
2. Update `PlayerController` once.
3. Update `PlayerColliderController` once.
4. Apply gameplay and collider snapshots through `PlayerRig`.
5. Apply the current snapshot and update `PlayerVisualController`.
6. Update `RunnerCameraController`.
7. Update debug HUD and render once.

All delta values passed to gameplay, visual, camera, VFX, and HUD timing are
seconds. `PlayerRig` owns gameplay hierarchy and world position.
`PlayerVisualController` owns only local visual transforms, VFX, and shadow.

## 5. Regression tests

- 40 tests pass across 11 files.
- Includes lane switching, input spam guards, jump/crouch guards, pause,
  collider snapshots, fallback, transform ownership, ground shadow, asset
  load/disposal race, three simulated minutes, and ten stable restarts.
- Mesh and transform-node counts remain stable across repeated resets.

## 6. Asset runtime results

- `cat.glb`: valid glTF 2.0, 283,324 bytes, 2 Babylon meshes, 4 transform
  nodes, 1 material, and 1 animation group.
- `skateboard.glb`: valid glTF 2.0, 2,385,508 bytes, 6 Babylon meshes,
  8 transform nodes, 1 material, and no animation groups.
- Both assets load through Babylon's glTF loader in `NullEngine`.
- Dev HTTP serves both assets with status 200 and `model/gltf-binary`.
- Derived board dimensions at scale 3 are approximately 0.58 x 0.32 x 2.28.
- Derived cat feet Y is approximately 0.324, matching board deck Y 0.324.

## 7. Commands and outputs

- `pnpm install`: pass; lockfile verified, loader dependency installed.
- `pnpm run typecheck`: pass.
- `pnpm run test`: pass, 40/40 tests.
- `pnpm run build`: pass, 871 modules transformed.
- `pnpm run dev`: pass; Vite started and asset HTTP checks returned 200.

## 8. Performance

- Main production chunk: about 2,226 KB minified, 533 KB gzip.
- Vite reports a non-blocking chunk-size warning above 500 KB.
- The automated three-minute simulation completes without mesh growth or
  console errors.
- Browser FPS/GPU memory were not captured in this environment.

## 9. Remaining limitations

- Manual browser confirmation is still required for cat forward direction,
  final camera framing, model scale appearance, lane lean appearance, landing
  animation appearance, and real-device resize behavior.
- Browser console zero-error acceptance and the complete screenshot set are
  not captured because localhost browser control is unavailable in this run.
- The main JavaScript chunk is large; code splitting can be considered later
  without blocking Milestone 2 behavior.

## 10. Final checklist

- [x] M1 gameplay and visual-world automated regressions pass.
- [x] Cat and skateboard files load through Babylon glTF runtime.
- [x] PlayerRoot, VisualRoot, collider, fallback, shadow, restart, pause, and
  disposal ownership tests pass.
- [x] Typecheck, tests, build, dev server, and three-minute simulation pass.
- [ ] Manual visual acceptance and browser console inspection.
- [ ] Screenshot acceptance set.

Do not merge into `develop` until the two unchecked acceptance items pass.
