import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it } from "vitest";

import { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import { LANE_X_POSITIONS } from "../../config/gameplay/gameplayConfig";
import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";
import type { SpawnItem } from "../../contracts/gameplay";
import type { SpawnRequest } from "../../contracts/track.contract";
import { TrackManager } from "../../world/track/TrackManager";

const OBSTACLE: SpawnItem = { type: "obstacle", assetId: "obstacle.box" };
const PICKUP: SpawnItem = { type: "pickup", assetId: "pickup.fish" };

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
  manager.build(parent);

  return {
    scene,
    manager,
    dispose: () => {
      manager.dispose();
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
          lanes: [OBSTACLE, PICKUP, null]
        }
      ]
    };
    manager.submitSpawnRequests([request]);

    let stats = manager.getDebugStats();
    expect(stats.activeObstacles).toBe(1);
    expect(stats.activePickups).toBe(1);

    const obstacle = scene.meshes.find(
      (m) => m.name === "debug-obstacle" && m.isEnabled()
    );
    const pickup = scene.meshes.find(
      (m) => m.name === "debug-pickup" && m.isEnabled()
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

  it("ignores spawn requests outside the active track window", () => {
    const { manager, dispose } = createFixture();

    manager.submitSpawnRequests([
      {
        patternId: "far",
        startZ: 4000,
        rows: [{ offsetZ: 0, lanes: [OBSTACLE, null, null] }]
      }
    ]);

    expect(manager.getDebugStats().activeObstacles).toBe(0);
    dispose();
  });

  it("reset() restores initial state without creating or duplicating meshes", () => {
    const { scene, manager, dispose } = createFixture();

    manager.submitSpawnRequests([
      {
        patternId: "test",
        startZ: 20,
        rows: [{ offsetZ: 0, lanes: [OBSTACLE, null, PICKUP] }]
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
