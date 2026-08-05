import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { AnimationGroup } from "@babylonjs/core/Animations/animationGroup";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import "@babylonjs/loaders/glTF";
import {
  getAssetEntry,
  PLAYER_ASSET_IDS,
  type PlayerAssetId,
} from "./AssetRegistry";

export type AssetLoadState = "idle" | "loading" | "loaded" | "fallback" | "failed";

export interface PlayerModelInstance {
  root: TransformNode;
  meshes: AbstractMesh[];
  animationGroups: AnimationGroup[];
  dispose(): void;
}

export class PlayerAssetLoader {
  private readonly cache = new Map<PlayerAssetId, PlayerModelInstance>();
  private readonly loadStates = new Map<PlayerAssetId, AssetLoadState>();
  private readonly loadErrors = new Map<PlayerAssetId, string>();

  private scene!: Scene;

  constructor() {
    for (const id of Object.values(PLAYER_ASSET_IDS)) {
      this.loadStates.set(id as PlayerAssetId, "idle");
    }
  }

  /** Must be called before loading any asset */
  setScene(scene: Scene): void {
    this.scene = scene;
  }

  getLoadState(id: PlayerAssetId): AssetLoadState {
    return this.loadStates.get(id) ?? "idle";
  }

  getLoadError(id: PlayerAssetId): string | undefined {
    return this.loadErrors.get(id);
  }

  getAllLoadStates(): Record<string, AssetLoadState> {
    const states: Record<string, AssetLoadState> = {};
    for (const [id, state] of this.loadStates) {
      states[id] = state;
    }
    return states;
  }

  async preloadAll(): Promise<void> {
    const ids = Object.values(PLAYER_ASSET_IDS) as PlayerAssetId[];
    const results = await Promise.allSettled(
      ids.map((id) => this.preload(id)),
    );

    for (let i = 0; i < ids.length; i++) {
      const result = results[i];
      if (result.status === "rejected") {
        console.warn(
          `[PlayerAssetLoader] Failed to preload ${ids[i]}: ${String(result.reason)}`,
        );
      }
    }
  }

  async preload(id: PlayerAssetId): Promise<void> {
    if (this.cache.has(id)) return;

    const entry = getAssetEntry(id);
    this.loadStates.set(id, "loading");
    this.loadErrors.delete(id);

    try {
      const container = await SceneLoader.LoadAssetContainerAsync(
        entry.url,
        undefined,
        this.scene,
      );

      const instance: PlayerModelInstance = {
        root: container.transformNodes[0] ?? container.meshes[0],
        meshes: container.meshes as AbstractMesh[],
        animationGroups: container.animationGroups as AnimationGroup[],
        dispose: () => {
          container.removeAllFromScene();
          container.dispose();
        },
      };

      // Remove from scene so we can manually add later
      container.removeAllFromScene();

      this.cache.set(id, instance);
      this.loadStates.set(id, "loaded");
    } catch (err) {
      this.loadStates.set(id, "failed");
      this.loadErrors.set(id, String(err));
      throw err;
    }
  }

  async createCatInstance(parent: TransformNode): Promise<PlayerModelInstance> {
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

  private async createInstance(
    id: PlayerAssetId,
    parent: TransformNode,
  ): Promise<PlayerModelInstance> {
    const cached = this.cache.get(id);
    if (!cached) {
      await this.preload(id);
    }

    const source = this.cache.get(id);
    if (!source) {
      throw new Error(
        `Asset ${id} not available. Load state: ${this.loadStates.get(id)}`,
      );
    }

    // Clone into the scene at the parent with a clean instance root
    const instanceRoot = new TransformNode(`${id}-instance-root`, this.scene);
    instanceRoot.parent = parent;

    const newMeshes: AbstractMesh[] = [];
    for (const mesh of source.meshes) {
      const clone = mesh.clone(mesh.name, instanceRoot) as AbstractMesh;
      newMeshes.push(clone);
    }

    const instance: PlayerModelInstance = {
      root: instanceRoot,
      meshes: newMeshes,
      animationGroups: source.animationGroups.map((ag) =>
        ag.clone(`${ag.name}-instance`),
      ),
      dispose: () => {
        for (const m of newMeshes) {
          m.dispose();
        }
        instanceRoot.dispose();
      },
    };

    return instance;
  }

  isLoaded(id: PlayerAssetId): boolean {
    return this.cache.has(id);
  }

  areAllLoaded(): boolean {
    return Object.values(PLAYER_ASSET_IDS).every((id) =>
      this.cache.has(id as PlayerAssetId),
    );
  }

  dispose(): void {
    for (const [, instance] of this.cache) {
      instance.dispose();
    }
    this.cache.clear();
    this.loadStates.clear();
    this.loadErrors.clear();
  }
}
