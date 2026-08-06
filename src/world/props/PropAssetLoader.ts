import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { ensureGltfLoader } from "../../assets/registerGltfLoader";
import { getPropEntry, PROP_KINDS, type PropKind } from "../../config/visual/props.config";

export type PropAssetState = "idle" | "loading" | "loaded" | "missing";

/**
 * Resolved URLs of every prop GLB that actually exists (Vite import.meta.glob).
 * Missing files simply don't appear here -> the procedural builder stays active
 * with zero console noise.
 */
const PROPS_URLS = import.meta.glob([
  "/src/assets/models/props/*.glb"
], {
  query: "?url",
  import: "default",
  eager: true
}) as Record<string, string>;

/**
 * Loads real prop GLB assets once. A missing file is treated as "missing"
 * (the procedural builder stays active) without console noise.
 */
export class PropAssetLoader {
  private readonly containers = new Map<PropKind, AssetContainer[]>();
  private readonly optimizedTemplates = new Map<PropKind, Mesh[]>();
  private readonly states = new Map<PropKind, PropAssetState>();
  private scene!: Scene;

  constructor() {
    for (const kind of PROP_KINDS) {
      this.states.set(kind, "idle");
    }
  }

  setScene(scene: Scene): void {
    this.scene = scene;
  }

  async prefetchAll(): Promise<void> {
    await ensureGltfLoader();
    await Promise.all(PROP_KINDS.map((kind) => this.prefetch(kind)));
  }

  getState(kind: PropKind): PropAssetState {
    return this.states.get(kind) ?? "missing";
  }

  has(kind: PropKind): boolean {
    return (this.containers.get(kind)?.length ?? 0) > 0 ||
      (this.optimizedTemplates.get(kind)?.length ?? 0) > 0;
  }

  getContainer(kind: PropKind, variant = 0): AssetContainer | undefined {
    return pickVariant(this.containers.get(kind), variant);
  }

  getOptimizedTemplate(kind: PropKind, variant = 0): Mesh | undefined {
    return pickVariant(this.optimizedTemplates.get(kind), variant);
  }

  dispose(): void {
    for (const containers of this.containers.values()) {
      for (const container of containers) container.dispose();
    }
    for (const templates of this.optimizedTemplates.values()) {
      for (const template of templates) template.dispose(false, true);
    }
    this.containers.clear();
    this.optimizedTemplates.clear();
    this.states.clear();
  }

  // ── private ─────────────────────────────────────────────────

  private async prefetch(kind: PropKind): Promise<void> {
    const entry = getPropEntry(kind);

    // Procedural-only kinds (no asset path) never attempt a load
    if (!entry.assetPath || !entry.useAsset) {
      this.states.set(kind, "missing");
      return;
    }

    const paths = [entry.assetPath, ...(entry.assetVariants ?? [])];
    const urls = paths.flatMap((path) => {
      const url = PROPS_URLS[path];
      return url ? [url] : [];
    });
    if (urls.length === 0) {
      this.states.set(kind, "missing");
      return;
    }

    this.states.set(kind, "loading");
    const loaded = await Promise.all(urls.map(async (url) => {
      try {
        const container = await SceneLoader.LoadAssetContainerAsync(
          url,
          undefined,
          this.scene
        );
        container.removeAllFromScene();
        return container;
      } catch {
        return undefined;
      }
    }));
    const containers = loaded.filter(
      (container): container is AssetContainer => container !== undefined
    );
    if (containers.length === 0) {
      this.states.set(kind, "missing");
      return;
    }
    if (entry.mergeMeshes) {
      this.optimizedTemplates.set(
        kind,
        containers.map((container) => optimizePropContainer(container, kind))
      );
    } else {
      this.containers.set(kind, containers);
    }
    this.states.set(kind, "loaded");
  }
}

function pickVariant<T>(variants: readonly T[] | undefined, seed: number): T | undefined {
  if (!variants || variants.length === 0) return undefined;
  return variants[Math.abs(Math.trunc(seed)) % variants.length];
}

export function optimizePropContainer(
  container: AssetContainer,
  kind: PropKind
): Mesh {
  const sourceMeshes = container.meshes.filter(
    (mesh): mesh is Mesh => mesh instanceof Mesh && mesh.getTotalVertices() > 0
  );
  if (sourceMeshes.length === 0) {
    container.dispose();
    throw new Error(`Prop asset ${kind} has no mergeable meshes.`);
  }

  const commonVertexKinds = sourceMeshes[0]
    .getVerticesDataKinds()
    .filter((vertexKind) =>
      sourceMeshes.every((mesh) => mesh.isVerticesDataPresent(vertexKind))
    );
  for (const mesh of sourceMeshes) {
    for (const vertexKind of mesh.getVerticesDataKinds()) {
      if (!commonVertexKinds.includes(vertexKind)) {
        mesh.removeVerticesData(vertexKind);
      }
    }
    mesh.computeWorldMatrix(true);
  }
  const merged = Mesh.MergeMeshes(
    sourceMeshes,
    false,
    true,
    undefined,
    false,
    false
  );
  if (!merged) {
    container.dispose();
    throw new Error(`Prop asset ${kind} could not be optimized.`);
  }

  const sourceMaterial = merged.material;
  const clonedMaterial = sourceMaterial?.clone(`prop-${kind}-optimized-material`);
  if (clonedMaterial) merged.material = clonedMaterial;
  merged.name = `prop-${kind}-optimized-template`;
  merged.isPickable = false;
  merged.receiveShadows = false;
  merged.setEnabled(false);
  container.dispose();
  return merged;
}
