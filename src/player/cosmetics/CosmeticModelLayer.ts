import type { Scene } from "@babylonjs/core/scene";
import { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ensureGltfLoader } from "../../assets/registerGltfLoader";
import { COSMETICS, type CosmeticItem } from "../../config/visual/cosmeticsConfig";
import { PLAYER_MODEL_CONFIG } from "../../config/visual/player-model.config";
import {
  COSMETIC_OVERRIDES,
  type CosmeticOverride
} from "../../config/visual/cosmetic-tuning";

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
const BOARD_CAL = PLAYER_MODEL_CONFIG.skateboard;
const BOARD_SCALE = BOARD_CAL.scale;                  // 3.0
const BOARD_ROT_Y = (BOARD_CAL.rotationDegrees.y * Math.PI) / 180; // 90°
const DOG_FOOT_OFFSET = PLAYER_MODEL_CONFIG.catFootOffset;         // 0.657
const DOG_TARGET_HEIGHT = 1.64;
const DOG_TARGET_FOOTPRINT = 1.45;
const BOARD_TARGET_LENGTH = 0.76;
const BOARD_TARGET_WIDTH = 0.2;
const HAT_TARGET_SIZE = 0.45;

export class CosmeticModelLayer {
  private readonly containers = new Map<string, AssetContainer>();
  private readonly instances = new Map<string, CosmeticInstance>();
  private readonly pendingLoads = new Map<string, Promise<void>>();
  private readonly hatMount: TransformNode;
  private desiredDogId = "dog.default";
  private desiredBoardId = "board.default";
  private desiredHatId = "hat.default";

  constructor(
    private readonly scene: Scene,
    private readonly dogMount: TransformNode,
    private readonly boardMount: TransformNode,
    private readonly onCosmeticLoaded?: () => void
  ) {
    this.hatMount = new TransformNode("cosmetic-hat-mount", this.scene);
    this.hatMount.parent = dogMount;
    this.hatMount.position.set(0, 1.42, 0);
  }

  async preloadAll(): Promise<void> {
    await ensureGltfLoader();
    for (const item of COSMETICS) {
      if (isNonDefault(item)) await this.ensureLoaded(item);
    }
  }

  get hasLoaded(): boolean {
    return this.pendingLoads.size === 0;
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
    this.desiredDogId = dogId;
    this.desiredBoardId = boardId;
    this.desiredHatId = hatId;

    const dogItem = getItem("dog", dogId);
    const boardItem = getItem("board", boardId);
    const hatItem = getItem("hat", hatId);

    for (const instance of this.instances.values()) {
      instance.root.setEnabled(false);
    }

    if (isNonDefault(dogItem)) this.prepareSelected(dogItem, "dog");
    if (isNonDefault(boardItem)) this.prepareSelected(boardItem, "board");
    if (isNonDefault(hatItem)) this.prepareSelected(hatItem, "hat");

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

  private ensureLoaded(item: CosmeticItem): Promise<void> {
    if (!item.model || this.containers.has(item.id)) return Promise.resolve();
    const pending = this.pendingLoads.get(item.id);
    if (pending) return pending;

    const load = this.preload(item).finally(() => {
      this.pendingLoads.delete(item.id);
    });
    this.pendingLoads.set(item.id, load);
    return load;
  }

  private prepareSelected(
    item: CosmeticItem,
    category: "dog" | "board" | "hat"
  ): void {
    if (this.containers.has(item.id)) {
      if (category === "dog") this.instantiateDog(item);
      else if (category === "board") this.instantiateBoard(item);
      else this.instantiateHat(item);
      return;
    }

    void this.ensureLoaded(item).then(() => {
      const stillDesired =
        (category === "dog" && this.desiredDogId === item.id) ||
        (category === "board" && this.desiredBoardId === item.id) ||
        (category === "hat" && this.desiredHatId === item.id);
      if (!stillDesired) return;
      if (category === "dog") this.instantiateDog(item);
      else if (category === "board") this.instantiateBoard(item);
      else this.instantiateHat(item);
      this.onCosmeticLoaded?.();
    });
  }

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
      const assetRoot = new TransformNode(`cosmetic-fit-${item.id}`, this.scene);
      assetRoot.parent = root;

      const result = container.instantiateModelsToScene(
        (n) => `cosm-${item.id}-${n}`
      );
      for (const importedRoot of result.rootNodes) {
        importedRoot.parent = assetRoot;
      }
      const meshes = root.getDescendants(
        false,
        (node) => node instanceof AbstractMesh
      ) as AbstractMesh[];
      fitToGroundedBox(assetRoot, meshes, {
        targetHeight: DOG_TARGET_HEIGHT,
        targetFootprint: DOG_TARGET_FOOTPRINT
      });
      // DogMount sits DOG_FOOT_OFFSET above the deck, so offset fitted feet down.
      applyRootTransform(root, tune, [0, -DOG_FOOT_OFFSET, 0]);

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
      const assetRoot = new TransformNode(`cosmetic-fit-${item.id}`, this.scene);
      assetRoot.parent = root;

      const result = container.instantiateModelsToScene(
        (n) => `cosm-${item.id}-${n}`
      );
      for (const importedRoot of result.rootNodes) {
        importedRoot.parent = assetRoot;
      }
      const meshes = root.getDescendants(
        false,
        (node) => node instanceof AbstractMesh
      ) as AbstractMesh[];
      fitToGroundedBox(assetRoot, meshes, {
        targetLength: BOARD_TARGET_LENGTH,
        targetWidth: BOARD_TARGET_WIDTH
      });
      applyRootTransform(root, tune, [0, 0, 0], BOARD_ROT_Y, BOARD_SCALE);

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
      const assetRoot = new TransformNode(`cosmetic-fit-${item.id}`, this.scene);
      assetRoot.parent = root;

      const result = container.instantiateModelsToScene(
        (n) => `cosm-${item.id}-${n}`
      );
      for (const importedRoot of result.rootNodes) {
        importedRoot.parent = assetRoot;
      }
      const meshes = root.getDescendants(
        false,
        (node) => node instanceof AbstractMesh
      ) as AbstractMesh[];
      fitToGroundedBox(assetRoot, meshes, { targetSize: HAT_TARGET_SIZE });
      applyRootTransform(root, tune, [0, 0, 0]);

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

function applyRootTransform(
  root: TransformNode,
  tune: CosmeticOverride,
  basePosition: [number, number, number],
  baseRotationY = 0,
  baseScale = 1
): void {
  root.position.set(
    basePosition[0] + (tune.position?.[0] ?? 0),
    basePosition[1] + (tune.position?.[1] ?? 0),
    basePosition[2] + (tune.position?.[2] ?? 0)
  );
  root.rotation.set(
    ((tune.rotation?.[0] ?? 0) * Math.PI) / 180,
    baseRotationY + ((tune.rotation?.[1] ?? 0) * Math.PI) / 180,
    ((tune.rotation?.[2] ?? 0) * Math.PI) / 180
  );
  root.scaling.setAll((tune.scale ?? 1) * baseScale);
}

interface FitTarget {
  readonly targetHeight?: number;
  readonly targetFootprint?: number;
  readonly targetLength?: number;
  readonly targetWidth?: number;
  readonly targetSize?: number;
}

function fitToGroundedBox(
  assetRoot: TransformNode,
  meshes: readonly AbstractMesh[],
  target: FitTarget
): void {
  const bounds = computeMeshBounds(meshes);
  const size = bounds.max.subtract(bounds.min);
  const horizontalMax = Math.max(size.x, size.z);
  const horizontalMin = Math.max(Math.min(size.x, size.z), 0.001);
  const candidates: number[] = [];

  if (target.targetHeight && size.y > 0.001) {
    candidates.push(target.targetHeight / size.y);
  }
  if (target.targetFootprint && horizontalMax > 0.001) {
    candidates.push(target.targetFootprint / horizontalMax);
  }
  if (target.targetLength && horizontalMax > 0.001) {
    candidates.push(target.targetLength / horizontalMax);
  }
  if (target.targetWidth && horizontalMin > 0.001) {
    candidates.push(target.targetWidth / horizontalMin);
  }
  if (target.targetSize) {
    const maxAxis = Math.max(size.x, size.y, size.z);
    if (maxAxis > 0.001) candidates.push(target.targetSize / maxAxis);
  }

  const scale = candidates.length > 0 ? Math.min(...candidates) : 1;
  const centerX = (bounds.min.x + bounds.max.x) * 0.5;
  const centerZ = (bounds.min.z + bounds.max.z) * 0.5;
  assetRoot.scaling.setAll(scale);
  assetRoot.position.set(-centerX * scale, -bounds.min.y * scale, -centerZ * scale);
}

function computeMeshBounds(
  meshes: readonly AbstractMesh[]
): { min: Vector3; max: Vector3 } {
  const min = new Vector3(Infinity, Infinity, Infinity);
  const max = new Vector3(-Infinity, -Infinity, -Infinity);
  for (const mesh of meshes) {
    if (mesh.getTotalVertices() <= 0) continue;
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
  if (!Number.isFinite(min.x)) {
    min.set(0, 0, 0);
    max.set(1, 1, 1);
  }
  return { min, max };
}
