import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it, vi } from "vitest";

import { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import { RunGameplaySystem } from "../../gameplay/RunGameplaySystem";
import { PropAssetLoader } from "../../world/props/PropAssetLoader";
import { PropFactory } from "../../world/props/PropFactory";
import { TrackManager } from "../../world/track/TrackManager";

describe("release runtime acceptance", () => {
  it("runs three simulated minutes with pause and ten clean restarts", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const materials = new MaterialsRegistry(scene);
    const manager = new TrackManager(scene, materials);
    const parent = new TransformNode("release-test-parent", scene);
    const propLoader = new PropAssetLoader();
    propLoader.setScene(scene);
    const propFactory = new PropFactory(scene, materials, propLoader);
    const gameplay = new RunGameplaySystem();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    manager.build(parent, propFactory);
    const initialMeshCount = scene.meshes.length;
    const initialTransformCount = scene.transformNodes.length;
    const deltaSeconds = 1 / 60;
    const totalFrames = 180 * 60;
    const restartInterval = totalFrames / 10;
    let emittedRequests = 0;
    let restartCount = 0;

    try {
      for (let frame = 0; frame < totalFrames; frame += 1) {
        if (frame === 1800) {
          gameplay.pause();
          manager.pause();
        } else if (frame === 1980) {
          gameplay.resume();
          manager.resume();
        }

        const runFrame = gameplay.update(
          deltaSeconds,
          manager.getScrollDistance()
        );
        emittedRequests += runFrame.spawnRequests.length;
        manager.submitSpawnRequests(runFrame.spawnRequests);
        manager.update(deltaSeconds, runFrame.speed);

        if ((frame + 1) % restartInterval === 0) {
          gameplay.reset();
          manager.reset();
          restartCount += 1;

          expect(manager.getDebugStats().activeObstacles).toBe(0);
          expect(manager.getDebugStats().activePickups).toBe(0);
          expect(scene.meshes.length).toBe(initialMeshCount);
          expect(scene.transformNodes.length).toBe(initialTransformCount);
        }
      }

      expect(restartCount).toBe(10);
      expect(emittedRequests).toBeGreaterThan(20);
      expect(consoleError).not.toHaveBeenCalled();
      expect(consoleWarn).not.toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
      consoleWarn.mockRestore();
      manager.dispose();
      propLoader.dispose();
      materials.dispose();
      scene.dispose();
      engine.dispose();
    }
  }, 15_000);
});
