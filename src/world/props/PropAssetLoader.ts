import type { Scene } from "@babylonjs/core/scene";
import { SceneLoader } from "@babylonjs/core/Loading/sceneLoader";
import type { AssetContainer } from "@babylonjs/core/assetContainer";
import "@babylonjs/loaders/glTF";
import { getPropEntry, PROP_KINDS, type PropKind } from "../../config/visual/props.config";

export type PropAssetState = "idle" | "loading" | "loaded" | "missing";

/**
 * Resolved URLs of every prop GLB that actually exists (Vite import.meta.glob).
 * Missing files simply don't appear here -> the procedural builder stays active
 * with zero console noise.
 */
const PROPS_URLS = import.meta.glob("/src/assets/models/props/*.glb", {
  query: "?url",
  import: "default",
  eager: true
}) as Record<string, string>;

/**
 * Loads real prop GLB assets once. A missing file is treated as "missing"
 * (the procedural builder stays active) without console noise.
 */
export class PropAssetLoader {
  private readonly containers = new Map<PropKind, AssetContainer>();
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
    for (const kind of PROP_KINDS) {
      await this.prefetch(kind);
    }
  }

  getState(kind: PropKind): PropAssetState {
    return this.states.get(kind) ?? "missing";
  }

  has(kind: PropKind): boolean {
    return this.containers.has(kind);
  }

  getContainer(kind: PropKind): AssetContainer | undefined {
    return this.containers.get(kind);
  }

  dispose(): void {
    for (const container of this.containers.values()) {
      container.dispose();
    }
    this.containers.clear();
    this.states.clear();
  }

  // ── private ─────────────────────────────────────────────────

  private async prefetch(kind: PropKind): Promise<void> {
    const entry = getPropEntry(kind);

    // Procedural-only kinds (no asset path) never attempt a load
    if (!entry.assetPath) {
      this.states.set(kind, "missing");
      return;
    }

    // The glob only contains existing files — missing = procedural fallback
    const url = PROPS_URLS[entry.assetPath];
    if (!url) {
      this.states.set(kind, "missing");
      return;
    }

    this.states.set(kind, "loading");
    try {
      const container = await SceneLoader.LoadAssetContainerAsync(
        url,
        undefined,
        this.scene
      );
      container.removeAllFromScene();
      this.containers.set(kind, container);
      this.states.set(kind, "loaded");
    } catch {
      this.states.set(kind, "missing");
    }
  }
}
