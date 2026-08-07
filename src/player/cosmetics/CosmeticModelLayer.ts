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

/** Hashed URLs of the cosmetic models under src/assets (built from glob). */
const SRC_MODEL_URLS = import.meta.glob("/src/assets/models/player/*.glb", {
  query: "?url",
  import: "default",
  eager: true
}) as Record<string, string>;

function resolveModelUrl(path: string): string | undefined {
  if (path.startsWith("/src/")) return SRC_MODEL_URLS[path];
  return path; // public folder URL
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
 * into the player rig. Every model is auto-calibrated from its world bbox to a
 * fit target (height for dogs/hats, length along Z for boards), so any
 * downloaded model lands at the right size and stands on the ground.
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
    // Sits on top of the dog's head; child of catMount so crouch squash applies
    this.hatMount = new TransformNode("cosmetic-hat-mount", this.scene);
    this.hatMount.parent = dogMount;
    this.hatMount.position.set(0, 1.5, 0);
  }

  /** Loads every cosmetic model with a GLB (silently skips missing files). */
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

  /** Hides every cosmetic instance (used while the procedural fallback shows). */
  setAllEnabled(enabled: boolean): void {
    for (const instance of this.instances.values()) {
      instance.root.setEnabled(enabled);
    }
  }

  /** Shows the equipped non-default cosmetics, hides the rest. */
  applyEquipped(dogId: string, boardId: string, hatId: string): CosmeticEquipResult {
    const dogItem = getItem("dog", dogId);
    const boardItem = getItem("board", boardId);
    const hatItem = getItem("hat", hatId);

    for (const [id, instance] of this.instances) {
      instance.root.setEnabled(false);
      void id;
    }
    this.instantiateIfNeeded(dogItem, this.dogMount);
    this.instantiateIfNeeded(boardItem, this.boardMount);
    this.instantiateIfNeeded(hatItem, this.hatMount);

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

  private instantiateIfNeeded(item: CosmeticItem, parent: TransformNode): void {
    if (this.instances.has(item.id)) return;
    const container = this.containers.get(item.id);
    if (!container) return;

    const root = new TransformNode(`cosmetic-${item.id}`, this.scene);
    root.parent = parent;

    const result = container.instantiateModelsToScene((name) => `cosm-${item.id}-${name}`);
    for (const importedRoot of result.rootNodes) {
      importedRoot.parent = root;
    }
    const meshes = root.getDescendants(
      false,
      (node) => node instanceof AbstractMesh
    ) as AbstractMesh[];

    this.fitToTarget(root, meshes, item.fit);

    this.instances.set(item.id, {
      root,
      meshes,
      dispose: () => root.dispose()
    });
  }

  /**
   * Two-pass fit from the world bbox: scale to the target, rotate boards so
   * their length runs along Z, then recenter and ground them.
   */
  private fitToTarget(
    root: TransformNode,
    meshes: readonly AbstractMesh[],
    fit: CosmeticFit
  ): void {
    if (!meshes.length || (!fit.height && !fit.width)) return;

    root.scaling.setAll(1);
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);

    let bounds = computeWorldBounds(meshes);
    const spanX = bounds.max.x - bounds.min.x;
    const spanY = bounds.max.y - bounds.min.y;
    const spanZ = bounds.max.z - bounds.min.z;
    const scale = fit.height
      ? fit.height / spanY
      : fit.width
        ? fit.width / Math.max(spanX, spanZ)
        : 1;
    root.scaling.setAll(scale);

    // Boards: align the longest horizontal axis to the track direction (Z)
    if (fit.width && !fit.height && spanX > spanZ) {
      root.rotation.y = Math.PI / 2;
    }

    bounds = computeWorldBounds(meshes);
    root.position.x = -(bounds.min.x + bounds.max.x) / 2;
    root.position.z = -(bounds.min.z + bounds.max.z) / 2;
    root.position.y = -bounds.min.y;
  }
}

function getItem(category: "hat" | "dog" | "board", id: string): CosmeticItem {
  return COSMETICS.find((item) => item.category === category && item.id === id)
    ?? COSMETICS.find((item) => item.category === category && item.id.endsWith(".default"))
    ?? COSMETICS[0];
}

function computeWorldBounds(
  meshes: readonly AbstractMesh[]
): { min: Vector3; max: Vector3 } {
  const min = new Vector3(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY);
  const max = new Vector3(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY);
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

/** Removes any half-instantiated cosmetic meshes after a failed clone. */
function rootCleanup(scene: Scene, itemId: string): void {
  for (const mesh of scene.meshes) {
    if (mesh.name.startsWith(`cosm-${itemId}-`)) {
      mesh.dispose();
    }
  }
}
