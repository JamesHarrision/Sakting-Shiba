import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { MaterialsRegistry } from "../assets/MaterialsRegistry";
import { TrackManager } from "./track/TrackManager";
import { PropAssetLoader } from "./props/PropAssetLoader";
import { PropFactory } from "./props/PropFactory";
import { LightingRig } from "./lighting/LightingRig";

export class WorldController {
  readonly root: TransformNode;
  readonly trackManager: TrackManager;
  readonly lighting: LightingRig;
  private readonly propLoader: PropAssetLoader;
  private readonly propFactory: PropFactory;

  constructor(scene: Scene, materials: MaterialsRegistry) {
    this.root = new TransformNode("world-root", scene);
    this.lighting = new LightingRig(scene);
    this.propLoader = new PropAssetLoader();
    this.propLoader.setScene(scene);
    this.propFactory = new PropFactory(scene, materials, this.propLoader);
    this.trackManager = new TrackManager(scene, materials);
  }

  build(): void {
    this.lighting.setup();
    this.trackManager.build(this.root, this.propFactory);
  }

  /** Prefetches real prop GLBs; chunk props upgrade to them when present. */
  async startAssetLoad(): Promise<void> {
    await this.propLoader.prefetchAll();
    this.trackManager.applyLoadedProps();
  }

  update(deltaSeconds: number, speed: number): void {
    this.trackManager.update(deltaSeconds, speed);
  }

  reset(): void {
    this.trackManager.reset();
  }

  dispose(): void {
    // Chunks dispose their prop instances before the shared containers go away
    this.trackManager.dispose();
    this.propLoader.dispose();
    this.lighting.dispose();
    this.root.dispose();
  }
}
