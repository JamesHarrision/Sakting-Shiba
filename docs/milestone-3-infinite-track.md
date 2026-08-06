# Milestone 3 - Infinite Track (Chunk Recycling & Object Pooling)

## Goal

Replace the single fixed-length track with an infinite track built from recycled
chunks and object pools. The world scrolls toward the player (the player never
moves along Z — exactly one track movement system).

## Architecture

### Chunks

- `src/world/track/chunks/TrackChunk.ts` — base chunk: road surface, borders,
  lane markers, guard rails, rooftop slabs, spawn root + shared prop factory.
- `StraightChunkA/B/C.ts` — three variants that only differ in environment props
  (vent / AC / pipe / antenna / warning light / barrier / building silhouette).
- All variants share identical width, lane positions, ground height and butt-joint
  edges, so chunks always line up (no gaps, no lane offset).

### TrackManager

- `src/world/track/TrackManager.ts` — owns a scroll root + a ring of pooled chunks.
- Chunks are created once at build time (5 x 32 units = 160 units coverage,
  from behind the camera up to the fogged spawn zone).
- Each frame: `scrollRoot.z -= speed * dt`. When the root drifts one full chunk
  length, the back chunk is moved to the front (`baseZ += totalLength`) — the
  chunk is never disposed/recreated.
- Chunks recycled behind the camera; new front chunks appear at 128-160 units
  (~91-97% fogged), so the recycle teleport is hidden by fog.
- `pause() / resume() / reset() / dispose()` provided.

### Object pooling

- `src/world/pool/ObjectPool.ts` — generic pool (acquire/release, no allocation
  in update).
- `src/world/pool/SpawnItemPool.ts` — pooled debug placeholder meshes.
- Track chunks themselves are pooled (the recycle ring); no mesh is created in
  the update loop; mesh count is stable (verified by test).

### SpawnRequest rendering

- `src/contracts/track.contract.ts` — `SpawnRequest { patternId, startZ, rows }`.
- `TrackManager.submitSpawnRequests(requests)` renders pooled placeholders into
  the covering chunk's spawn root at the correct lane X (LANE_X_POSITIONS):
  - `obstacle` -> red box (`#D05545`)
  - `pickup` -> gold sphere (`#E8B048`)
  - `empty` / other kinds -> nothing
- Items scroll with their chunk and are returned to the pool when the chunk
  recycles (they have already passed the player).
- Requests outside the active window are skipped once (logged).

## Files

| File | Responsibility |
|------|----------------|
| `src/contracts/track.contract.ts` | SpawnRequest + TrackDebugStats contract |
| `src/world/pool/ObjectPool.ts` | Generic object pool |
| `src/world/pool/SpawnItemPool.ts` | Debug placeholder mesh pool |
| `src/world/track/chunks/TrackChunk.ts` | Base chunk (track base + props factory) |
| `src/world/track/chunks/StraightChunkA/B/C.ts` | Chunk variants |
| `src/world/track/TrackManager.ts` | Scroll + recycling + spawn rendering + stats |
| `src/world/WorldController.ts` | Wires TrackManager, drops static track/env |
| `src/scenes/RunScene.ts` | Orchestration: update/reset/debug stats |
| `src/ui/debug/DebugHud.ts` | Track debug counters |
| `src/config/visual/world-visual.config.ts` | Chunk length/count + spawn colors |
| `src/tests/world/trackManager.test.ts` | Recycling/pool/spawn/pause/reset tests |

## Notes / Decisions

- The static `CityBackdrop` and `RooftopEnvironment` were replaced by per-chunk
  props (including building silhouettes) so the skyline recycles with the track
  instead of sliding against it.
- Spawn items live under chunk spawn roots so they scroll with the track; they
  are pooled when their chunk recycles at the back. Requests must target the
  active track window (the M4 SpawnDirector will feed positions ahead of the
  camera, within the fogged zone).
