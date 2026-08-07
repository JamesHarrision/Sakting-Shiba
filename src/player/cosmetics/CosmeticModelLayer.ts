import type { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { ensureGltfLoader } from "../../assets/registerGltfLoader";
import { COSMETICS, type CosmeticItem } from "../../config/visual/cosmeticsConfig";
import { PLAYER_MODEL_CONFIG } from "../../config/visual/player-model.config";

/**
 * Identical calibration to the default player models so every cosmetic dog/board
 * lands in exactly the same spot as the built-in cat + skateboard.
 */
const DOG_SCALE = PLAYER_MODEL_CONFIG.cat.scale;
const DOG_POS_Y = PLAYER_MODEL_CONFIG.cat.position.y - PLAYER_MODEL_CONFIG.catSeatHeight;
const BOARD_SCALE = PLAYER_MODEL_CONFIG.skateboard.scale;
const BOARD_ROT_Y =
  (PLAYER_MODEL_CONFIG.skateboard.rotationDegrees.y * Math.PI) / 180;

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

  constructor(
    private readonly scene: Scene,
    private readonly dogMount: TransformNode,
    private readonly boardMount: TransformNode
  ) {
    this.hatMount = new TransformNode("cosmetic-hat-mount", this.scene);
    this.hatMount.parent = dogMount;
    this.hatMount.position.set(0, 1.5, 0);
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

  private instantiate(
    item: CosmeticItem,
    parent: TransformNode,
    scale: number,
    posX: number,
    posY: number,
    posZ: number,
    rotY: number
  ): void {
    if (this.instances.has(item.id)) return;
    const container = this.containers.get(item.id);
    if (!container) return;

    try {
      const root = new TransformNode(`cosmetic-${item.id}`, this.scene);
      root.parent = parent;
      root.position.set(posX, posY, posZ);
      root.rotation.y = rotY;
      root.scaling.setAll(scale);

      const result = container.instantiateModelsToScene(
        (name) => `cosm-${item.id}-${name}`
      );
      for (const importedRoot of result.rootNodes) {
        importedRoot.parent = root;
      }
      const meshes = root.getDescendants(
        false,
        (node) => node instanceof AbstractMesh
      ) as AbstractMesh[];

      // Center the imported hierarchy at the root's origin so the scale
      // and position from the calibration are applied cleanly.
      const bounds = computeWorldBounds(meshes);
      const cx = (bounds.min.x + bounds.max.x) / 2;
      const cy = bounds.min.y;
      const cz = (bounds.min.z + bounds.max.z) / 2;
      root.position.addInPlace(new Vector3(-cx, -cy, -cz));

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
    this.instantiate(item, this.dogMount, DOG_SCALE, 0, DOG_POS_Y, 0, 0);
  }

  private instantiateBoard(item: CosmeticItem): void {
    this.instantiate(
      item,
      this.boardMount,
      BOARD_SCALE,
      0,
      0,
      0,
      BOARD_ROT_Y
    );
  }

  private instantiateHat(item: CosmeticItem): void {
    // Hats are usually tiny; scale to ~0.3m tall
    this.instantiate(item, this.hatMount, 0.24, 0, 0, 0, 0);
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

function computeWorldBounds(
  meshes: readonly AbstractMesh[]
): { min: Vector3; max: Vector3 } {
  const min = new Vector3(
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY,
    Number.POSITIVE_INFINITY
  );
  const max = new Vector3(
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    Number.NEGATIVE_INFINITY
  );
  for (const mesh of meshes) {
    mesh.computeWorldMatrix(true);
    const box = mesh.getBoundingInfo().boundingBox;
    const lo = box.minimumWorld;
    const hi = box.maximumWorld;
    min.x = Math.min(min.x, lo.x);
    min.y = Math.min(min.y, lo.y);
    min.z = Math.min(min.z, lo.z);
    max.x = Math.max(max.x, hi.x);
    max.y = Math.max(max.y, hi.y);
    max.z = Math.max(max.z, hi.z);
  }
  return { min, max };
}

function rootCleanup(scene: Scene, itemId: string): void {
  for (const mesh of scene.meshes) {
    if (mesh.name.startsWith(`cosm-${itemId}-`)) {
      mesh.dispose();
    }
  }
}
