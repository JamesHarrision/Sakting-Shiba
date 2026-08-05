import { NullEngine } from "@babylonjs/core/Engines/nullEngine";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { describe, expect, it, vi } from "vitest";

import { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import type {
  PlayerAssetLoader,
  PlayerModelInstance
} from "../../assets/PlayerAssetLoader";
import { PLAYER_MODEL_CONFIG } from "../../config/visual/player-model.config";
import type { PlayerColliderSnapshot } from "../../contracts/player-collider.contract";
import type { PlayerVisualSnapshot } from "../../contracts/player-visual.contract";
import { PlayerRig } from "../../player/PlayerRig";
import { PlayerVisualController } from "../../world/player/PlayerVisualController";

const JUMP_SNAPSHOT: PlayerVisualSnapshot = {
  positionX: 2.6,
  positionY: 1.4,
  verticalVelocity: 3,
  state: "jumping",
  horizontalDirection: 0,
  laneIndex: 2,
  isGrounded: false,
  isCrouching: false,
  crouchProgress: 0
};

const COLLIDER_SNAPSHOT: PlayerColliderSnapshot = {
  centerX: 2.6,
  centerY: 2.225,
  centerZ: 0,
  width: 0.9,
  height: 1.65,
  depth: 1.05,
  pickupRadius: 1.2,
  isEnabled: true,
  isCrouching: false
};

describe("Player visual integration", () => {
  it("loads one cat and board under PlayerRig mounts without duplicate fallback", async () => {
    const fixture = createFixture(createSuccessfulLoader);

    try {
      await fixture.visual.startModelLoad();

      expect(fixture.rig.visualLoadState).toBe("loaded");
      expect(fixture.visual.isModelLoaded).toBe(true);
      expect(fixture.visual.player.meshes.every((mesh) => !mesh.isEnabled())).toBe(true);
      expect(fixture.visual.modelView.catMount).toBe(fixture.rig.nodes.catMount);
      expect(fixture.visual.modelView.boardMount).toBe(fixture.rig.nodes.boardMount);
      expect(fixture.rig.nodes.catMount.position.y).toBeCloseTo(
        PLAYER_MODEL_CONFIG.catSeatHeight
      );

      const meshCount = fixture.scene.meshes.length;
      const nodeCount = fixture.scene.transformNodes.length;
      for (let index = 0; index < 10; index += 1) {
        fixture.rig.reset();
        fixture.visual.reset();
      }
      expect(fixture.scene.meshes.length).toBe(meshCount);
      expect(fixture.scene.transformNodes.length).toBe(nodeCount);
    } finally {
      fixture.dispose();
    }
  });

  it("keeps the procedural fallback when either model fails", async () => {
    const warning = vi.spyOn(console, "warn").mockImplementation(() => {});
    const fixture = createFixture(() => ({
      createCatInstance: async () => {
        throw new Error("cat unavailable");
      },
      createBoardInstance: async () => {
        throw new Error("board unavailable");
      }
    }));

    try {
      await fixture.visual.startModelLoad();
      expect(fixture.rig.visualLoadState).toBe("fallback");
      expect(fixture.visual.isModelLoaded).toBe(false);
      expect(fixture.visual.player.meshes.every((mesh) => mesh.isEnabled())).toBe(true);
    } finally {
      warning.mockRestore();
      fixture.dispose();
    }
  });

  it("keeps PlayerRoot ownership in the rig and the blob shadow on the road", () => {
    const fixture = createFixture(createSuccessfulLoader);

    try {
      fixture.rig.applyGameplayState(JUMP_SNAPSHOT, COLLIDER_SNAPSHOT);
      const rootBeforeVisualUpdate = fixture.rig.nodes.playerRoot.position.clone();
      fixture.visual.applySnapshot(JUMP_SNAPSHOT);
      fixture.visual.update(1 / 60);

      expect(fixture.rig.nodes.playerRoot.position.asArray()).toEqual(
        rootBeforeVisualUpdate.asArray()
      );

      const shadow = fixture.scene.getMeshByName("player-blob-shadow");
      shadow?.computeWorldMatrix(true);
      expect(shadow?.getAbsolutePosition().y).toBeCloseTo(0.155, 3);
    } finally {
      fixture.dispose();
    }
  });

  it("does not reattach models when disposal wins the loading race", async () => {
    const resolvers: Array<() => void> = [];
    const fixture = createFixture((scene) => ({
      createCatInstance: (parent) => deferredInstance(scene, parent, "late-cat", resolvers),
      createBoardInstance: (parent) =>
        deferredInstance(scene, parent, "late-board", resolvers)
    }));
    const pendingLoad = fixture.visual.startModelLoad();

    fixture.visual.dispose();
    for (const resolve of resolvers) resolve();
    await pendingLoad;

    expect(fixture.scene.getMeshByName("late-cat")).toBeNull();
    expect(fixture.scene.getMeshByName("late-board")).toBeNull();
    fixture.dispose();
  });
});

function createFixture(
  loaderFactory: (scene: Scene) => Pick<
    PlayerAssetLoader,
    "createCatInstance" | "createBoardInstance"
  >
) {
  const engine = new NullEngine();
  const scene = new Scene(engine);
  const materials = new MaterialsRegistry(scene);
  const rig = new PlayerRig(scene, { groundY: 0.15 });
  const loader = loaderFactory(scene) as PlayerAssetLoader;
  const visual = new PlayerVisualController(scene, materials, rig, loader);

  return {
    engine,
    scene,
    materials,
    rig,
    visual,
    dispose: () => {
      visual.dispose();
      rig.dispose();
      materials.dispose();
      scene.dispose();
      engine.dispose();
    }
  };
}

function createSuccessfulLoader(scene: Scene) {
  return {
    createCatInstance: async (parent: TransformNode) =>
      createModelInstance(scene, parent, "audit-cat"),
    createBoardInstance: async (parent: TransformNode) =>
      createModelInstance(scene, parent, "audit-board")
  };
}

function createModelInstance(
  scene: Scene,
  parent: TransformNode,
  name: string
): PlayerModelInstance {
  const root = new TransformNode(`${name}-root`, scene);
  root.parent = parent;
  const mesh = MeshBuilder.CreateBox(name, { size: 1 }, scene);
  mesh.parent = root;

  return {
    root,
    meshes: [mesh],
    animationGroups: [],
    dispose: () => root.dispose()
  };
}

function deferredInstance(
  scene: Scene,
  parent: TransformNode,
  name: string,
  resolvers: Array<() => void>
): Promise<PlayerModelInstance> {
  const instance = createModelInstance(scene, parent, name);
  return new Promise((resolve) => {
    resolvers.push(() => resolve(instance));
  });
}
