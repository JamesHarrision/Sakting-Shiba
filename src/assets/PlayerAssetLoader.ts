import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import {
  ImportMeshAsync,
  type ISceneLoaderAsyncResult
} from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import "./registerGltfLoader";
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
  private readonly loadedAssets = new Map<PlayerAssetId, ISceneLoaderAsyncResult>();
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
    if (this.loadedAssets.has(id)) return;

    const entry = getAssetEntry(id);
    this.loadStates.set(id, "loading");
    this.loadErrors.delete(id);

    try {
      const loaded = await ImportMeshAsync(entry.url, this.scene);
      if (this.disposed) {
        disposeLoadedAssets(loaded);
        throw new Error("PlayerAssetLoader was disposed while loading.");
      }
      for (const mesh of loaded.meshes) mesh.setEnabled(false);
      this.loadedAssets.set(id, loaded);
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
    return this.loadedAssets.has(id);
  }

  areAllLoaded(): boolean {
    return Object.values(PLAYER_ASSET_IDS).every((id) =>
      this.loadedAssets.has(id as PlayerAssetId),
    );
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    const instantiatedIds = new Set(this.instances.keys());
    for (const [, instance] of this.instances) {
      instance.dispose();
    }
    this.instances.clear();
    for (const [id, loaded] of this.loadedAssets) {
      if (!instantiatedIds.has(id)) disposeLoadedAssets(loaded);
    }
    this.loadedAssets.clear();
    this.loadStates.clear();
    this.loadErrors.clear();
  }

  // ── private ─────────────────────────────────────────────────

  private async createInstance(
    id: PlayerAssetId,
    parent: TransformNode,
  ): Promise<PlayerModelInstance> {
    this.assertActive();
    if (!this.loadedAssets.has(id)) {
      await this.preload(id);
    }

    this.assertActive();

    const loaded = this.loadedAssets.get(id);
    if (!loaded) {
      throw new Error(
        `Asset ${id} not available. Load state: ${this.loadStates.get(id)}`,
      );
    }

    // Fresh instance root under the calibration parent
    const instanceRoot = new TransformNode(`${id}-instance-root`, this.scene);
    instanceRoot.parent = parent;

    // Reparent top-level imported nodes under the instance root.
    // NOTE: use direct parent assignment (keeps local transform), NOT
    // setParent() — setParent preserves the OLD world transform (identity),
    // which would cancel the calibration hierarchy and gameplay root motion.
    const topLevel: TransformNode[] = [];
    const importedNodes = new Set<TransformNode>([
      ...loaded.transformNodes,
      ...loaded.meshes
    ]);
    for (const node of loaded.transformNodes) {
      if (!node.parent || !importedNodes.has(node.parent as TransformNode)) {
        topLevel.push(node);
      }
    }
    for (const mesh of loaded.meshes) {
      if (
        (!mesh.parent || !importedNodes.has(mesh.parent as TransformNode)) &&
        !topLevel.includes(mesh)
      ) {
        topLevel.push(mesh);
      }
    }
    for (const node of topLevel) {
      node.parent = instanceRoot;
    }

    let instanceDisposed = false;
    const instance: PlayerModelInstance = {
      root: instanceRoot,
      meshes: loaded.meshes as AbstractMesh[],
      animationGroups: loaded.animationGroups as AnimationGroup[],
      dispose: () => {
        if (instanceDisposed) return;
        instanceDisposed = true;
        for (const group of loaded.animationGroups) group.dispose();
        instanceRoot.dispose(false, false);
      },
    };

    for (const mesh of loaded.meshes) mesh.setEnabled(true);
    this.instances.set(id, instance);
    return instance;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error("PlayerAssetLoader has already been disposed.");
    }
  }
}

function disposeLoadedAssets(loaded: ISceneLoaderAsyncResult): void {
  for (const group of loaded.animationGroups) group.dispose();
  const importedNodes = new Set<TransformNode>([
    ...loaded.transformNodes,
    ...loaded.meshes
  ]);
  for (const node of importedNodes) {
    if (!node.parent || !importedNodes.has(node.parent as TransformNode)) {
      node.dispose(false, false);
    }
  }
}
