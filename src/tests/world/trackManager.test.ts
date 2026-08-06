import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";

import { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import { LANE_X_POSITIONS } from "../../config/gameplay/gameplayConfig";
import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";
import type { SpawnItemType } from "../../contracts/spawn-pattern.contract";
import type { SpawnRequest } from "../../contracts/track.contract";
import { RunGameplaySystem } from "../../gameplay/RunGameplaySystem";
import { TrackManager } from "../../world/track/TrackManager";
import { PropAssetLoader } from "../../world/props/PropAssetLoader";
import { PropFactory } from "../../world/props/PropFactory";

const OBSTACLE: SpawnItemType = "obstacle_box";
const PICKUP: SpawnItemType = "coin";

function createFixture(): {
  scene: Scene;
  manager: TrackManager;
  dispose: () => void;
} {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const materials = new MaterialsRegistry(scene);
  const manager = new TrackManager(scene, materials);
  const parent = new TransformNode("test-parent", scene);
  const propLoader = new PropAssetLoader();
  propLoader.setScene(scene);
  const propFactory = new PropFactory(scene, materials, propLoader);
  manager.build(parent, propFactory);

  return {
    scene,
    manager,
    dispose: () => {
      manager.dispose();
      propLoader.dispose();
      materials.dispose();
      scene.dispose();
      engine.dispose();
    }
  };
}

describe("TrackManager", () => {
  it("builds chunkCount chunks and keeps mesh count stable while scrolling", () => {
    const { scene, manager, dispose } = createFixture();
    const initialMeshCount = scene.meshes.length;

    expect(manager.getDebugStats().activeChunks).toBe(
      WORLD_VISUAL_CONFIG.trackChunkCount
    );
    expect(scene.meshes.length).toBeLessThan(240);

    // Scroll enough to recycle every chunk several times
    for (let i = 0; i < 500; i += 1) {
      manager.update(0.016, 20);
    }

    expect(scene.meshes.length).toBe(initialMeshCount);
    expect(manager.getDebugStats().activeChunks).toBe(
      WORLD_VISUAL_CONFIG.trackChunkCount
    );
    dispose();
  });

  it("renders spawn requests into the correct lanes and recycles them with chunks", () => {
    const { scene, manager, dispose } = createFixture();

    const request: SpawnRequest = {
      patternId: "test",
      startZ: 20,
      rows: [
        {
          offsetZ: 0,
          lanes: [OBSTACLE, PICKUP, "empty"]
        }
      ]
    };
    manager.submitSpawnRequests([request]);

    let stats = manager.getDebugStats();
    expect(stats.activeObstacles).toBe(1);
    expect(stats.activePickups).toBe(1);

    const obstacle = scene.meshes.find(
      (m) => m.name === "pooled-obstacle" && m.isEnabled()
    );
    const pickup = scene.meshes.find(
      (m) => m.name === "pooled-pickup" && m.isEnabled()
    );
    expect(obstacle).toBeDefined();
    expect(pickup).toBeDefined();

    if (obstacle && pickup) {
      // Lane 0 left, lane 1 center; both at world Z = startZ
      expect(obstacle.getAbsolutePosition().x).toBeCloseTo(LANE_X_POSITIONS[0]);
      expect(pickup.getAbsolutePosition().x).toBeCloseTo(LANE_X_POSITIONS[1]);
      expect(obstacle.getAbsolutePosition().z).toBeCloseTo(20, 3);
    }

    // Scroll far enough for the covering chunk to recycle -> items pooled
    for (let i = 0; i < 1000; i += 1) {
      manager.update(0.016, 20);
    }

    stats = manager.getDebugStats();
    expect(stats.activeObstacles).toBe(0);
    expect(stats.activePickups).toBe(0);
    dispose();
  });

  it("places spawn requests at any future Z and recycles them after scrolling past", () => {
    const { manager, dispose } = createFixture();

    manager.submitSpawnRequests([
      {
        patternId: "far",
        startZ: 4000,
        rows: [{ offsetZ: 0, lanes: [OBSTACLE, "empty", "empty"] }]
      }
    ]);

    expect(manager.getDebugStats().activeObstacles).toBe(1);

    // Scroll past the far item (4000) -> returned to the pool
    for (let i = 0; i < 220; i += 1) {
      manager.update(1, 20);
    }
    expect(manager.getDebugStats().activeObstacles).toBe(0);
    dispose();
  });

  it("keeps the track continuous with no gaps and no forward jolts", () => {
    const { manager, dispose } = createFixture();

    // Per-chunk world ranges from the previous frame (index is stable)
    const prevStart = new Map<number, number>();
    const prevEnd = new Map<number, number>();

    for (let frame = 0; frame < 800; frame += 1) {
      manager.update(0.016, 20);

      const ranges = manager.getChunkWorldRanges();
      expect(ranges).toHaveLength(WORLD_VISUAL_CONFIG.trackChunkCount);

      // No gaps: adjacent chunks butt-join
      for (let i = 1; i < ranges.length; i += 1) {
        expect(ranges[i].start).toBeCloseTo(ranges[i - 1].end, 2);
      }

      // The player position (world Z 0) is always covered
      expect(ranges.some((r) => r.start <= 0 && r.end >= 0)).toBe(true);

      // No forward end visible: track extends past the fog zone
      const furthestEnd = Math.max(...ranges.map((r) => r.end));
      expect(furthestEnd).toBeGreaterThan(WORLD_VISUAL_CONFIG.fogEnd);

      // A chunk may only jump forward (recycle) when it was fully behind
      // the camera in the previous frame — this catches whole-track jolts.
      for (const r of ranges) {
        const lastStart = prevStart.get(r.index);
        const lastEnd = prevEnd.get(r.index);
        if (lastStart !== undefined && r.start > lastStart + 1e-3) {
          expect(lastEnd).toBeLessThan(-WORLD_VISUAL_CONFIG.cameraDistance);
        }
        prevStart.set(r.index, r.start);
        prevEnd.set(r.index, r.end);
      }
    }
    dispose();
  });

  it("reset() restores initial state without creating or duplicating meshes", () => {
    const { scene, manager, dispose } = createFixture();

    manager.submitSpawnRequests([
      {
        patternId: "test",
        startZ: 20,
        rows: [{ offsetZ: 0, lanes: [OBSTACLE, "empty", PICKUP] }]
      }
    ]);
    for (let i = 0; i < 200; i += 1) {
      manager.update(0.016, 20);
    }

    const beforeReset = scene.meshes.length;
    manager.reset();
    const afterReset = scene.meshes.length;

    expect(afterReset).toBe(beforeReset);
    expect(manager.getDebugStats().activeObstacles).toBe(0);
    expect(manager.getDebugStats().activePickups).toBe(0);
    dispose();
  });

  it("clears tutorial items without resetting track progress", () => {
    const { manager, dispose } = createFixture();
    manager.submitSpawnRequests([
      {
        patternId: "tutorial-coin-route",
        startZ: 16,
        rows: [{ offsetZ: 0, lanes: [PICKUP, "empty", PICKUP] }]
      }
    ]);
    manager.update(0.5, 10);
    const distanceBeforeClear = manager.getScrollDistance();

    manager.clearSpawnItems();

    expect(manager.getDebugStats().activePickups).toBe(0);
    expect(manager.getScrollDistance()).toBe(distanceBeforeClear);
    dispose();
  });

  it("keeps the initial tutorial route within the pickup pool budget", () => {
    const { manager, dispose } = createFixture();
    const gameplay = new RunGameplaySystem();
    gameplay.setTutorialMode(true);

    const frame = gameplay.update(0, 0);
    manager.submitSpawnRequests(frame.spawnRequests);

    expect(manager.getDebugStats().activePickups).toBe(12);
    dispose();
  });

  it("pause() freezes the track and resume() continues without teleporting", () => {
    const { manager, dispose } = createFixture();

    manager.update(0.1, 10);
    const statsBeforePause = manager.getDebugStats();

    manager.pause();
    for (let i = 0; i < 60; i += 1) {
      manager.update(0.016, 10);
    }
    expect(manager.getDebugStats().furthestChunkZ).toBeCloseTo(
      statsBeforePause.furthestChunkZ,
      3
    );

    manager.resume();
    manager.update(0.016, 10);
    expect(manager.getDebugStats().furthestChunkZ).toBeLessThan(
      statsBeforePause.furthestChunkZ
    );
    dispose();
  });

});
