import type { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { ensureGltfLoader } from "../../assets/registerGltfLoader";
import {
  COSMETICS,
  type CosmeticFit,
  type CosmeticItem
} from "../../config/visual/cosmeticsConfig";

/** catFootOffset from the default player config: board deck -> mounting point. */
const CAT_FOOT_OFFSET = 0.657;

/** Hashed URLs of the cosmetic models under src/assets (built from glob). */
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

/**
 * Loads the real cosmetic GLBs (hats, dogs, boards) and swaps the equipped one
 * into the player rig. Every model is auto-scaled to its fit target and
 * positioned so the dog's feet rest on the board deck, the board runs along
 * the track (Z), and the hat sits on the dog's head.
 */
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
      await this.preload(item);
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
    this.instantiateIfNeeded(dogItem, this.dogMount, "dog");
    this.instantiateIfNeeded(boardItem, this.boardMount, "board");
    this.instantiateIfNeeded(hatItem, this.hatMount, "hat");

    this.instances.get(dogItem.id)?.root.setEnabled(true);
    this.instances.get(boardItem.id)?.root.setEnabled(true);
    this.instances.get(hatItem.id)?.root.setEnabled(true);

    return {
      showDefaultDog: !this.instances.has(dogItem.id),
      showDefaultBoard: !this.instances.has(boardItem.id),
      showDefaultHat: !this.instances.has(hatItem.id)
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
      // Missing/broken model -> item keeps the color-swatch fallback
    }
  }

  private instantiateIfNeeded(
    item: CosmeticItem,
    parent: TransformNode,
    kind: "dog" | "board" | "hat"
  ): void {
    if (this.instances.has(item.id)) return;
    const container = this.containers.get(item.id);
    if (!container) return;

    try {
      const root = new TransformNode(`cosmetic-${item.id}`, this.scene);
      root.parent = parent;

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

      this.fitToTarget(root, meshes, item.fit, kind);
      this.instances.set(item.id, {
        root,
        meshes,
        dispose: () => root.dispose()
      });
    } catch {
      rootCleanup(this.scene, item.id);
    }
  }

  /**
   * Auto-scale from the world bbox, then apply a kind-specific offset so
   * the model is correctly positioned on the rig:
   *  - dogs: feet rest on the board deck (catMount is ~0.66 above deck)
   *  - boards: length along Z, centered under the dog
   *  - hats: sit on the dog's head
   */
  private fitToTarget(
    root: TransformNode,
    meshes: readonly AbstractMesh[],
    fit: CosmeticFit,
    kind: "dog" | "board" | "hat"
  ): void {
    if (!meshes.length) return;

    // Scale to target height/width
    root.scaling.setAll(1);
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);

    const bounds = computeWorldBounds(meshes);
    const spanX = bounds.max.x - bounds.min.x;
    const spanY = bounds.max.y - bounds.min.y;
    const spanZ = bounds.max.z - bounds.min.z;
    const targetHeight = fit.height;
    const targetWidth = fit.width;

    if (targetHeight && spanY > 0) {
      root.scaling.setAll(targetHeight / spanY);
    } else if (targetWidth && spanX > 0 && spanZ > 0) {
      root.scaling.setAll(targetWidth / Math.max(spanX, spanZ));
    }

    // Boards: align the longest horizontal axis to the track direction (Z)
    if (kind === "board" && spanX > spanZ) {
      root.rotation.y = Math.PI / 2;
    }

    // Re-compute bounds after scaling + rotation
    const fitted = computeWorldBounds(meshes);

    // Center horizontally
    root.position.x = -(fitted.min.x + fitted.max.x) / 2;
    root.position.z = -(fitted.min.z + fitted.max.z) / 2;

    // Vertical positioning depends on model kind
    if (kind === "dog") {
      // Dog feet at the board deck. The dogMount (catMount) is
      // catFootOffset above the board, so offset the model down.
      root.position.y = -fitted.min.y - CAT_FOOT_OFFSET;
    } else if (kind === "hat") {
      // Hat sits at the mount point (top of head)
      root.position.y = -fitted.min.y;
    } else {
      // Board: center vertically
      root.position.y = -(fitted.min.y + fitted.max.y) / 2;
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
