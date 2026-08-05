import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import "@babylonjs/loaders/glTF";
import {
  getAssetEntry,
  PLAYER_ASSET_IDS,
  type PlayerAssetId,
} from "./AssetRegistry";

export type AssetLoadState =
  | "idle"
  | "loading"
  | "loaded"
  | "fallback"
  | "failed";

export interface PlayerModelInstance {
  root: TransformNode;
  meshes: AbstractMesh[];
  animationGroups: AnimationGroup[];
  dispose(): void;
}

/**
 * Loads player GLB assets once and re-attaches them into the scene,
 * preserving the imported node hierarchy (node matrix / TRS are kept).
 */
export class PlayerAssetLoader {
  private readonly containers = new Map<PlayerAssetId, AssetContainer>();
  private readonly instances = new Map<PlayerAssetId, PlayerModelInstance>();
  private readonly loadStates = new Map<PlayerAssetId, AssetLoadState>();
  private readonly loadErrors = new Map<PlayerAssetId, string>();

  private scene!: Scene;
  private disposed = false;

  constructor() {
    for (const id of Object.values(PLAYER_ASSET_IDS)) {
      this.loadStates.set(id as PlayerAssetId, "idle");
    }
  }

  /** Must be called before loading any asset */
  setScene(scene: Scene): void {
    this.assertActive();
    this.scene = scene;
  }

  getLoadState(id: PlayerAssetId): AssetLoadState {
    return this.loadStates.get(id) ?? "idle";
  }

  getLoadError(id: PlayerAssetId): string | undefined {
    return this.loadErrors.get(id);
  }

  async preloadAll(): Promise<void> {
    const ids = Object.values(PLAYER_ASSET_IDS) as PlayerAssetId[];
    const results = await Promise.allSettled(ids.map((id) => this.preload(id)));

    for (let i = 0; i < ids.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        console.warn(
          `[PlayerAssetLoader] Failed to preload ${ids[i]}: ${String(
            (result as PromiseRejectedResult).reason,
          )}`,
        );
      }
    }
  }

  async preload(id: PlayerAssetId): Promise<void> {
    this.assertActive();
    if (this.containers.has(id)) return;

    const entry = getAssetEntry(id);
    this.loadStates.set(id, "loading");
    this.loadErrors.delete(id);

    try {
      const container = await SceneLoader.LoadAssetContainerAsync(
        entry.url,
        undefined,
        this.scene,
      );
      if (this.disposed) {
        container.dispose();
        throw new Error("PlayerAssetLoader was disposed while loading.");
      }
      // Remove from scene: instances will be attached on demand
      container.removeAllFromScene();
      this.containers.set(id, container);
      this.loadStates.set(id, "loaded");
    } catch (err) {
      if (!this.disposed) {
        this.loadStates.set(id, "failed");
        this.loadErrors.set(id, String(err));
      }
      throw err;
    }
  }

  async createCatInstance(
    parent: TransformNode,
  ): Promise<PlayerModelInstance> {
    return this.createInstance(PLAYER_ASSET_IDS.cat as PlayerAssetId, parent);
  }

  async createBoardInstance(
    parent: TransformNode,
  ): Promise<PlayerModelInstance> {
    return this.createInstance(
      PLAYER_ASSET_IDS.skateboard as PlayerAssetId,
      parent,
    );
  }

  isLoaded(id: PlayerAssetId): boolean {
    return this.containers.has(id);
  }

  areAllLoaded(): boolean {
    return Object.values(PLAYER_ASSET_IDS).every((id) =>
      this.containers.has(id as PlayerAssetId),
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const [, instance] of this.instances) {
      instance.dispose();
    }
    this.instances.clear();
    for (const [, container] of this.containers) {
      container.dispose();
    }
    this.containers.clear();
    this.loadStates.clear();
    this.loadErrors.clear();
  }

  // ── private ─────────────────────────────────────────────────

  private async createInstance(
    id: PlayerAssetId,
    parent: TransformNode,
  ): Promise<PlayerModelInstance> {
    this.assertActive();
    if (!this.containers.has(id)) {
      await this.preload(id);
    }

    this.assertActive();

    const container = this.containers.get(id);
    if (!container) {
      throw new Error(
        `Asset ${id} not available. Load state: ${this.loadStates.get(id)}`,
      );
    }

    // Bring the whole imported hierarchy into the scene
    container.addAllToScene();

    // Fresh instance root under the calibration parent
    const instanceRoot = new TransformNode(`${id}-instance-root`, this.scene);
    instanceRoot.parent = parent;

    // Reparent top-level imported nodes under the instance root.
    // NOTE: use direct parent assignment (keeps local transform), NOT
    // setParent() — setParent preserves the OLD world transform (identity),
    // which would cancel the calibration hierarchy and gameplay root motion.
    const topLevel: TransformNode[] = [];
    for (const node of container.transformNodes) {
      if (!node.parent) topLevel.push(node);
    }
    for (const mesh of container.meshes) {
      if (!mesh.parent && !topLevel.includes(mesh)) {
        topLevel.push(mesh);
      }
    }
    for (const node of topLevel) {
      node.parent = instanceRoot;
    }

    let instanceDisposed = false;
    const instance: PlayerModelInstance = {
      root: instanceRoot,
      meshes: container.meshes as AbstractMesh[],
      animationGroups: container.animationGroups as AnimationGroup[],
      dispose: () => {
        if (instanceDisposed) return;
        instanceDisposed = true;
        container.removeAllFromScene();
        instanceRoot.dispose();
      },
    };

    this.instances.set(id, instance);
    return instance;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error("PlayerAssetLoader has already been disposed.");
    }
  }
}
