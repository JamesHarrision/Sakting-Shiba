import type { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { ensureGltfLoader } from "../../assets/registerGltfLoader";
import { COSMETICS, type CosmeticItem } from "../../config/visual/cosmeticsConfig";
import { PLAYER_MODEL_CONFIG } from "../../config/visual/player-model.config";
import { COSMETIC_OVERRIDES } from "../../config/visual/cosmetic-tuning";

const SRC_MODEL_URLS = import.meta.glob("/src/assets/models/player/*.glb", {
  query: "?url",
  import: "default",
  eager: true
}) as Record<string, string>;

function resolveModelUrl(path: string): string | undefined {
  if (path.startsWith("/src/")) return SRC_MODEL_URLS[path];
  return path;
}

interface CosmeticInstance {
  readonly root: TransformNode;
  readonly meshes: readonly AbstractMesh[];
  dispose(): void;
}

export interface CosmeticEquipResult {
  readonly showDefaultDog: boolean;
  readonly showDefaultBoard: boolean;
  readonly showDefaultHat: boolean;
}

function isNonDefault(item: CosmeticItem): boolean {
  return !item.id.endsWith(".default");
}

/** PlayerModelView calibration (identical to what the default models use). */
const CAT_CAL = PLAYER_MODEL_CONFIG.cat;
const BOARD_CAL = PLAYER_MODEL_CONFIG.skateboard;
const BOARD_SCALE = BOARD_CAL.scale;                  // 3.0
const BOARD_ROT_Y = (BOARD_CAL.rotationDegrees.y * Math.PI) / 180; // 90°
const DOG_FOOT_OFFSET = PLAYER_MODEL_CONFIG.catFootOffset;         // 0.657

export class CosmeticModelLayer {
  private readonly containers = new Map<string, AssetContainer>();
  private readonly instances = new Map<string, CosmeticInstance>();
  private readonly hatMount: TransformNode;
  private loaded = false;

  constructor(
    private readonly scene: Scene,
    private readonly dogMount: TransformNode,
    private readonly boardMount: TransformNode
  ) {
    this.hatMount = new TransformNode("cosmetic-hat-mount", this.scene);
    this.hatMount.parent = dogMount;
    this.hatMount.position.set(0, 1.42, 0);
  }

  async preloadAll(): Promise<void> {
    if (this.loaded) return;
    await ensureGltfLoader();
    for (const item of COSMETICS) {
      if (isNonDefault(item)) await this.preload(item);
    }
    this.loaded = true;
  }

  get hasLoaded(): boolean {
    return this.loaded;
  }

  setAllEnabled(enabled: boolean): void {
    for (const instance of this.instances.values()) {
      instance.root.setEnabled(enabled);
    }
  }

  applyEquipped(
    dogId: string,
    boardId: string,
    hatId: string
  ): CosmeticEquipResult {
    const dogItem = getItem("dog", dogId);
    const boardItem = getItem("board", boardId);
    const hatItem = getItem("hat", hatId);

    for (const instance of this.instances.values()) {
      instance.root.setEnabled(false);
    }

    if (isNonDefault(dogItem)) this.instantiateDog(dogItem);
    if (isNonDefault(boardItem)) this.instantiateBoard(boardItem);
    if (isNonDefault(hatItem)) this.instantiateHat(hatItem);

    this.instances.get(dogItem.id)?.root.setEnabled(true);
    this.instances.get(boardItem.id)?.root.setEnabled(true);
    this.instances.get(hatItem.id)?.root.setEnabled(true);

    return {
      showDefaultDog: !isNonDefault(dogItem) || !this.instances.has(dogItem.id),
      showDefaultBoard:
        !isNonDefault(boardItem) || !this.instances.has(boardItem.id),
      showDefaultHat: !isNonDefault(hatItem) || !this.instances.has(hatItem.id)
    };
  }

  dispose(): void {
    for (const instance of this.instances.values()) instance.dispose();
    this.instances.clear();
    for (const container of this.containers.values()) container.dispose();
    this.containers.clear();
    this.hatMount.dispose();
  }

  // ── private ─────────────────────────────────────────────────

  private async preload(item: CosmeticItem): Promise<void> {
    if (!item.model || this.containers.has(item.id)) return;
    const url = resolveModelUrl(item.model);
    if (!url) {
      console.warn(`[CosmeticLayer] preload SKIP ${item.id}: no url for model ${item.model}`);
      return;
    }
    try {
      const container = await SceneLoader.LoadAssetContainerAsync(
        url,
        undefined,
        this.scene
      );
      container.removeAllFromScene();
      this.containers.set(item.id, container);
      console.warn(`[CosmeticLayer] preload OK ${item.id} (${container.meshes.length} meshes)`);
    } catch (err) {
      console.warn(`[CosmeticLayer] preload FAIL ${item.id}: ${String(err)}`);
    }
  }

  private instantiateDog(item: CosmeticItem): void {
    if (this.instances.has(item.id)) return;
    const container = this.containers.get(item.id);
    if (!container) return;

    const tune = COSMETIC_OVERRIDES[item.id] ?? {};
    try {
      const root = new TransformNode(`cosmetic-${item.id}`, this.scene);
      root.parent = this.dogMount;
      // Auto-normalized model has feet at local Y=0. DogMount sits
      // DOG_FOOT_OFFSET above the deck → offset dog down.
      root.position.set(
        tune.position?.[0] ?? 0,
        (tune.position?.[1] ?? 0) - DOG_FOOT_OFFSET,
        tune.position?.[2] ?? 0
      );
      root.rotation.set(
        (tune.rotation?.[0] ?? 0) * Math.PI / 180,
        (tune.rotation?.[1] ?? 0) * Math.PI / 180,
        (tune.rotation?.[2] ?? 0) * Math.PI / 180
      );
      root.scaling.setAll(tune.scale ?? 1);

      const result = container.instantiateModelsToScene(
        (n) => `cosm-${item.id}-${n}`
      );
      for (const importedRoot of result.rootNodes) {
        importedRoot.parent = root;
      }
      const meshes = root.getDescendants(
        false,
        (node) => node instanceof AbstractMesh
      ) as AbstractMesh[];

      this.instances.set(item.id, {
        root,
        meshes,
        dispose: () => root.dispose()
      });
    } catch {
      rootCleanup(this.scene, item.id);
    }
  }

  /** Boards use the SAME calibration as the default skateboard. */
  private instantiateBoard(item: CosmeticItem): void {
    if (this.instances.has(item.id)) return;
    const container = this.containers.get(item.id);
    if (!container) return;

    const tune = COSMETIC_OVERRIDES[item.id] ?? {};
    try {
      const root = new TransformNode(`cosmetic-${item.id}`, this.scene);
      root.parent = this.boardMount;
      root.position.set(
        tune.position?.[0] ?? 0,
        tune.position?.[1] ?? 0,
        tune.position?.[2] ?? 0
      );
      root.rotation.set(
        (tune.rotation?.[0] ?? 0) * Math.PI / 180,
        (tune.rotation?.[1] ?? 0) * Math.PI / 180 + BOARD_ROT_Y,
        (tune.rotation?.[2] ?? 0) * Math.PI / 180
      );
      root.scaling.setAll((tune.scale ?? 1) * BOARD_SCALE);

      const result = container.instantiateModelsToScene(
        (n) => `cosm-${item.id}-${n}`
      );
      for (const importedRoot of result.rootNodes) {
        importedRoot.parent = root;
      }
      const meshes = root.getDescendants(
        false,
        (node) => node instanceof AbstractMesh
      ) as AbstractMesh[];

      this.instances.set(item.id, {
        root,
        meshes,
        dispose: () => root.dispose()
      });
    } catch {
      rootCleanup(this.scene, item.id);
    }
  }

  /** Hats sit on the dog's head. */
  private instantiateHat(item: CosmeticItem): void {
    if (this.instances.has(item.id)) return;
    const container = this.containers.get(item.id);
    if (!container) return;

    const tune = COSMETIC_OVERRIDES[item.id] ?? {};
    try {
      const root = new TransformNode(`cosmetic-${item.id}`, this.scene);
      root.parent = this.hatMount;
      root.position.set(
        tune.position?.[0] ?? 0,
        tune.position?.[1] ?? 0,
        tune.position?.[2] ?? 0
      );
      root.rotation.set(
        (tune.rotation?.[0] ?? 0) * Math.PI / 180,
        (tune.rotation?.[1] ?? 0) * Math.PI / 180,
        (tune.rotation?.[2] ?? 0) * Math.PI / 180
      );
      root.scaling.setAll(tune.scale ?? 1);

      const result = container.instantiateModelsToScene(
        (n) => `cosm-${item.id}-${n}`
      );
      for (const importedRoot of result.rootNodes) {
        importedRoot.parent = root;
      }
      const meshes = root.getDescendants(
        false,
        (node) => node instanceof AbstractMesh
      ) as AbstractMesh[];

      this.instances.set(item.id, {
        root,
        meshes,
        dispose: () => root.dispose()
      });
    } catch {
      rootCleanup(this.scene, item.id);
    }
  }
}

function getItem(
  category: "hat" | "dog" | "board",
  id: string
): CosmeticItem {
  return (
    COSMETICS.find((item) => item.category === category && item.id === id) ??
    COSMETICS.find(
      (item) => item.category === category && item.id.endsWith(".default")
    ) ??
    COSMETICS[0]
  );
}

function rootCleanup(scene: Scene, itemId: string): void {
  for (const mesh of scene.meshes) {
    if (mesh.name.startsWith(`cosm-${itemId}-`)) {
      mesh.dispose();
    }
  }
}
