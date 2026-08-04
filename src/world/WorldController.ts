import type { Scene } from "@babylonjs/core/scene";
import type { Engine } from "@babylonjs/core/Engines/engine";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { MaterialsRegistry } from "../assets/MaterialsRegistry";
import { PrototypeTrack } from "./track/PrototypeTrack";
import { CityBackdrop } from "./environment/CityBackdrop";
import { RooftopEnvironment } from "./environment/RooftopEnvironment";
import { LightingRig } from "./lighting/LightingRig";

export class WorldController {
  readonly root: TransformNode;
  private readonly track: PrototypeTrack;
  private readonly cityBackdrop: CityBackdrop;
  private readonly rooftopEnv: RooftopEnvironment;
  readonly lighting: LightingRig;

  constructor(scene: Scene, materials: MaterialsRegistry) {
    this.root = new TransformNode("world-root", scene);
    this.lighting = new LightingRig(scene);
    this.track = new PrototypeTrack(scene, materials);
    this.cityBackdrop = new CityBackdrop(scene, materials);
    this.rooftopEnv = new RooftopEnvironment(scene, materials);
  }

  build(): void {
    this.lighting.setup();
    this.track.build(this.root);
    this.cityBackdrop.build(this.root);
    this.rooftopEnv.build(this.root);
  }

  dispose(): void {
    this.track.dispose();
    this.cityBackdrop.dispose();
    this.rooftopEnv.dispose();
    this.lighting.dispose();
    this.root.dispose();
  }
}
