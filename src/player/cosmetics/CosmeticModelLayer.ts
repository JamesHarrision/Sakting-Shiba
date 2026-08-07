import type { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { ensureGltfLoader } from "../../assets/registerGltfLoader";
import { COSMETICS, type CosmeticItem } from "../../config/visual/cosmeticsConfig";

/**
 * After normalize-player-glb.mjs, every cosmetic GLB contains a root
 * normalization node that already handles scale/position/rotation.
 * Non-default models can therefore use identity calibration.
 */

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

/** Only non-default GLB models are swapped in; the defaults stay as the built-in assets. */
function isNonDefault(item: CosmeticItem): boolean {
  return !item.id.endsWith(".default");
}

export class CosmeticModelLayer {
  private readonly containers = new Map<string, AssetContainer>();
  private readonly instances = new Map<string, CosmeticInstance>();
  private readonly hatMount: TransformNode;
  private loaded = false;

  /** The dogMount sits catFootOffset above the board deck; dogs must come down. */
  private static readonly DOG_FOOT_OFFSET = 0.657;
  /** Hat mount sits just above the dog's head (head is ~1.42 above dog feet). */
  private static readonly HAT_HEAD_Y = 1.42;

  constructor(
    private readonly scene: Scene,
    private readonly dogMount: TransformNode,
    private readonly boardMount: TransformNode
  ) {
    this.hatMount = new TransformNode("cosmetic-hat-mount", this.scene);
    this.hatMount.parent = dogMount;
    this.hatMount.position.set(0, CosmeticModelLayer.HAT_HEAD_Y, 0);
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

  applyEquipped(dogId: string, boardId: string, hatId: string): CosmeticEquipResult {
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
    if (!url) return;
    try {
      const container = await SceneLoader.LoadAssetContainerAsync(
        url,
        undefined,
        this.scene
      );
      container.removeAllFromScene();
      this.containers.set(item.id, container);
    } catch {
      // Missing/broken model
    }
  }

  private instantiateNonDefault(
    item: CosmeticItem,
    parent: TransformNode,
    name: string
  ): void {
    if (this.instances.has(item.id)) return;
    const container = this.containers.get(item.id);
    if (!container) return;

    try {
      const root = new TransformNode(`cosmetic-${item.id}`, this.scene);
      root.parent = parent;
      // The GLB already contains a root normalization node → identity placement
      root.position.set(0, 0, 0);
      root.rotation.set(0, 0, 0);
      root.scaling.setAll(1);

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

  private instantiateDog(item: CosmeticItem): void {
    const container = this.containers.get(item.id);
    if (!container || this.instances.has(item.id)) return;

    try {
      const root = new TransformNode(`cosmetic-${item.id}`, this.scene);
      root.parent = this.dogMount;
      // Normalized models have feet at their local Y=0.
      // The dogMount is catFootOffset above the deck, so offset down.
      root.position.set(0, -CosmeticModelLayer.DOG_FOOT_OFFSET, 0);
      root.rotation.set(0, 0, 0);
      root.scaling.setAll(1);

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

  private instantiateBoard(item: CosmeticItem): void {
    this.instantiateNonDefault(item, this.boardMount, "board");
  }

  private instantiateHat(item: CosmeticItem): void {
    this.instantiateNonDefault(item, this.hatMount, "hat");
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
