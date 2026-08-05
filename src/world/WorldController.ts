import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { MaterialsRegistry } from "../assets/MaterialsRegistry";
import { TrackManager } from "./track/TrackManager";
import { SpawnPlaceholderFeeder } from "./track/SpawnPlaceholderFeeder";
import { LightingRig } from "./lighting/LightingRig";

export class WorldController {
  readonly root: TransformNode;
  readonly trackManager: TrackManager;
  readonly lighting: LightingRig;
  private readonly spawnFeeder: SpawnPlaceholderFeeder;

  constructor(scene: Scene, materials: MaterialsRegistry) {
    this.root = new TransformNode("world-root", scene);
    this.lighting = new LightingRig(scene);
    this.trackManager = new TrackManager(scene, materials);
    this.spawnFeeder = new SpawnPlaceholderFeeder(this.trackManager);
  }

  build(): void {
    this.lighting.setup();
    this.trackManager.build(this.root);
  }

  update(deltaSeconds: number, speed: number): void {
    this.trackManager.update(deltaSeconds, speed);
    this.spawnFeeder.update();
  }

  reset(): void {
    this.trackManager.reset();
    this.spawnFeeder.reset();
  }

  dispose(): void {
    this.trackManager.dispose();
    this.lighting.dispose();
    this.root.dispose();
  }
}
