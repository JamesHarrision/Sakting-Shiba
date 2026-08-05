import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GameEventBus } from "../../events/GameEventBus";
import { PlayerController } from "../../gameplay/PlayerController";
import { createEmptyInputSnapshot } from "../../input/inputSnapshot";
import { PlayerColliderController } from "../../player/PlayerColliderController";
import { PlayerRig } from "../../player/PlayerRig";

interface TestScene {
  readonly engine: NullEngine;
  readonly scene: Scene;
}

const activeScenes: TestScene[] = [];

function createTestScene(): TestScene {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const result = { engine, scene };
  activeScenes.push(result);
  return result;
}

afterEach(() => {
  for (const { scene, engine } of activeScenes.splice(0)) {
    scene.dispose();
    engine.dispose();
  }
});

describe("PlayerRig", () => {
  it("creates the required hierarchy", () => {
    const { scene } = createTestScene();
    const rig = new PlayerRig(scene);
    const { nodes } = rig;

    expect(nodes.colliderRoot.parent).toBe(nodes.playerRoot);
    expect(nodes.visualRoot.parent).toBe(nodes.playerRoot);
    expect(nodes.catMount.parent).toBe(nodes.visualRoot);
    expect(nodes.boardMount.parent).toBe(nodes.visualRoot);
    expect(nodes.importedVisualContainer.parent).toBe(nodes.visualRoot);
    expect(nodes.groundAnchor.parent).toBe(nodes.playerRoot);
    expect(nodes.shadowAnchor.parent).toBe(nodes.playerRoot);
    expect(nodes.effectAnchor.parent).toBe(nodes.playerRoot);
    expect(nodes.cameraTargetAnchor.parent).toBe(nodes.playerRoot);
    expect(nodes.debugRoot.parent).toBe(nodes.playerRoot);
  });

  it("resets gameplay and visual roots while preserving mount calibration", () => {
    const { scene } = createTestScene();
    const rig = new PlayerRig(scene, { groundY: 0.15 });

    rig.nodes.playerRoot.position.set(4, 3, 2);
    rig.nodes.visualRoot.rotation.set(1, 2, 3);
    rig.nodes.visualRoot.scaling.set(0.5, 0.6, 0.7);
    rig.nodes.catMount.position.set(0.2, 0.4, 0.6);
    rig.nodes.boardMount.position.set(-0.1, 0.3, 0.5);
    rig.reset();

    expect(rig.nodes.playerRoot.position.asArray()).toEqual([0, 0.15, 0]);
    expect(rig.nodes.visualRoot.rotation.asArray()).toEqual([0, 0, 0]);
    expect(rig.nodes.visualRoot.scaling.asArray()).toEqual([1, 1, 1]);
    expect(rig.nodes.catMount.position.asArray()).toEqual([0.2, 0.4, 0.6]);
    expect(rig.nodes.boardMount.position.asArray()).toEqual([-0.1, 0.3, 0.5]);
  });

  it("moves only PlayerRoot from gameplay snapshots", () => {
    const { scene } = createTestScene();
    const rig = new PlayerRig(scene);
    const player = new PlayerController(new GameEventBus());
    const collider = new PlayerColliderController();

    player.update({ ...createEmptyInputSnapshot(), moveRight: true }, 0.09);
    const visualSnapshot = player.getVisualSnapshot();
    rig.applyGameplayState(
      visualSnapshot,
      collider.update(player.getSnapshot())
    );

    expect(rig.nodes.playerRoot.position.x).toBe(visualSnapshot.positionX);
    expect(rig.nodes.visualRoot.position.asArray()).toEqual([0, 0, 0]);
    expect(rig.nodes.colliderRoot.position.asArray()).toEqual([0, 0, 0]);
  });

  it("keeps ground and shadow anchors on the ground during a jump", () => {
    const { scene } = createTestScene();
    const rig = new PlayerRig(scene, { groundY: 0.15 });
    const player = new PlayerController(new GameEventBus());
    const collider = new PlayerColliderController({ groundY: 0.15 });

    player.update({ ...createEmptyInputSnapshot(), jump: true }, 1 / 60);
    const visualSnapshot = player.getVisualSnapshot();
    rig.applyGameplayState(
      visualSnapshot,
      collider.update(player.getSnapshot())
    );

    expect(rig.nodes.playerRoot.position.y).toBeGreaterThan(0.15);
    expect(rig.nodes.groundAnchor.getAbsolutePosition().y).toBeCloseTo(0.15);
    expect(rig.nodes.shadowAnchor.getAbsolutePosition().y).toBeCloseTo(0.15);
  });

  it("attaches each visual once and supports externally managed roots", () => {
    const { scene } = createTestScene();
    const rig = new PlayerRig(scene);
    const cat = new TransformNode("test-cat", scene);
    const board = new TransformNode("test-board", scene);

    rig.attachCat(cat, { disposeOnDetach: false });
    rig.attachCat(cat, { disposeOnDetach: false });
    rig.attachBoard(board, { disposeOnDetach: false });

    expect(cat.parent).toBe(rig.nodes.catMount);
    expect(board.parent).toBe(rig.nodes.boardMount);
    expect(scene.getTransformNodeByName("test-cat")).toBe(cat);

    rig.detachVisuals();

    expect(cat.parent).toBeNull();
    expect(board.parent).toBeNull();
    expect(cat.isDisposed()).toBe(false);
    expect(board.isDisposed()).toBe(false);
  });

  it("does not create duplicate nodes across repeated resets", () => {
    const { scene } = createTestScene();
    const rig = new PlayerRig(scene);
    const transformCount = scene.transformNodes.length;
    const meshCount = scene.meshes.length;

    for (let restart = 0; restart < 10; restart += 1) {
      rig.reset();
    }

    expect(scene.transformNodes.length).toBe(transformCount);
    expect(scene.meshes.length).toBe(meshCount);
  });

  it("falls back once without stopping gameplay", () => {
    const { scene } = createTestScene();
    const rig = new PlayerRig(scene);
    const player = new PlayerController(new GameEventBus());
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    rig.setVisualLoadState("loading");
    rig.reportVisualLoadFailure(new Error("missing cat.glb"));
    rig.reportVisualLoadFailure(new Error("missing cat.glb"));
    player.update({ ...createEmptyInputSnapshot(), moveLeft: true }, 0.01);

    expect(rig.visualLoadState).toBe("fallback");
    expect(consoleError).toHaveBeenCalledTimes(1);
    expect(player.getSnapshot().lane).toBe(0);

    consoleError.mockRestore();
  });

  it("disposes safely without touching the scene", () => {
    const { scene } = createTestScene();
    const rig = new PlayerRig(scene);

    expect(() => rig.dispose()).not.toThrow();
    expect(() => rig.dispose()).not.toThrow();
    expect(rig.isDisposed()).toBe(true);
    expect(scene.isDisposed).toBe(false);
  });
});
