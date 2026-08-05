import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it, vi } from "vitest";

import { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import { PlayerAssetLoader } from "../../assets/PlayerAssetLoader";
import type { PlayerVisualSnapshot } from "../../contracts/player-visual.contract";
import { GameEventBus } from "../../events/GameEventBus";
import { PlayerController } from "../../gameplay/PlayerController";
import { createEmptyInputSnapshot } from "../../input/inputSnapshot";
import { PlayerColliderController } from "../../player/PlayerColliderController";
import { PlayerRig } from "../../player/PlayerRig";
import { PlayerVisualController } from "../../world/player/PlayerVisualController";

describe("Player runtime acceptance", () => {
  it("runs three simulated minutes with pause and ten stable restarts", () => {
    const engine = new NullEngine();
    const scene = new Scene(engine);
    const materials = new MaterialsRegistry(scene);
    const rig = new PlayerRig(scene, { groundY: 0.15 });
    const loader = new PlayerAssetLoader();
    const visual = new PlayerVisualController(
      scene,
      materials,
      rig,
      loader
    );
    const player = new PlayerController(new GameEventBus());
    const collider = new PlayerColliderController({ groundY: 0.15 });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const initialTransformCount = scene.transformNodes.length;
    const initialMeshCount = scene.meshes.length;
    const deltaSeconds = 1 / 60;
    const totalFrames = 180 * 60;
    const pauseStart = 30 * 60;
    const pauseEnd = pauseStart + 3 * 60;
    let pausedSnapshot = player.getSnapshot();
    let restartCount = 0;

    rig.setVisualLoadState("fallback");

    try {
      for (let frame = 0; frame < totalFrames; frame += 1) {
        const paused = frame >= pauseStart && frame < pauseEnd;
        const input = createEmptyInputSnapshot();

        if (frame % 240 === 0) {
          input.moveLeft = player.getSnapshot().lane > 0;
          input.moveRight = !input.moveLeft;
        }

        if (frame % 180 === 30) {
          input.jump = true;
        }

        if (frame % 300 === 60) {
          input.crouch = true;
        }

        if (frame === pauseStart) {
          pausedSnapshot = player.getSnapshot();
        }

        if (!paused) {
          player.update(input, deltaSeconds);
        }

        if (frame === pauseEnd - 1) {
          expect(player.getSnapshot()).toEqual(pausedSnapshot);
        }

        const playerSnapshot = player.getSnapshot();
        const visualSnapshot = player.getVisualSnapshot();
        const frameVisualSnapshot: PlayerVisualSnapshot = paused
          ? { ...visualSnapshot, state: "paused" }
          : visualSnapshot;
        const colliderSnapshot = collider.update(playerSnapshot);

        rig.applyGameplayState(frameVisualSnapshot, colliderSnapshot);
        visual.applySnapshot(frameVisualSnapshot);
        visual.update(paused ? 0 : deltaSeconds);

        expect(rig.nodes.playerRoot.position.x).toBeCloseTo(
          visualSnapshot.positionX
        );
        expect(rig.nodes.visualRoot.position.asArray()).toEqual([0, 0, 0]);

        if ((frame + 1) % 1080 === 0) {
          player.reset();
          collider.reset();
          rig.reset();
          visual.reset();
          restartCount += 1;

          expect(scene.transformNodes.length).toBe(initialTransformCount);
          expect(scene.meshes.length).toBe(initialMeshCount);
        }
      }

      expect(restartCount).toBe(10);
      expect(consoleError).not.toHaveBeenCalled();
      expect(rig.visualLoadState).toBe("fallback");
    } finally {
      consoleError.mockRestore();
      visual.dispose();
      loader.dispose();
      rig.dispose();
      materials.dispose();
      scene.dispose();
      engine.dispose();
    }
  }, 15_000);
});
