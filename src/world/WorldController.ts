import type { Scene } from "@babylonjs/core/scene";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { MaterialsRegistry } from "../assets/MaterialsRegistry";
import { TrackManager } from "./track/TrackManager";
import { LightingRig } from "./lighting/LightingRig";

export class WorldController {
  readonly root: TransformNode;
  readonly trackManager: TrackManager;
  readonly lighting: LightingRig;

  constructor(scene: Scene, materials: MaterialsRegistry) {
    this.root = new TransformNode("world-root", scene);
    this.lighting = new LightingRig(scene);
    this.trackManager = new TrackManager(scene, materials);
  }

  build(): void {
    this.lighting.setup();
    this.trackManager.build(this.root);
  }

  dispose(): void {
    this.trackManager.dispose();
    this.lighting.dispose();
    this.root.dispose();
  }
}
