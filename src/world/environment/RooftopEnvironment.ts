import type { Scene } from "@babylonjs/core/scene";
import type { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class RooftopEnvironment {
  private props: Mesh[] = [];
  private envRoot!: TransformNode;

  constructor(
    private readonly scene: Scene,
    private readonly materials: MaterialsRegistry
  ) {}

  build(parent: TransformNode): void {
    const { TransformNode } = require("@babylonjs/core/Meshes/transformNode");
    this.envRoot = new TransformNode("rooftop-env-root", this.scene);
    this.envRoot.parent = parent;

    const matProp = this.materials.createMaterial("rooftop.prop", "#484550");
    const matAccent = this.materials.createMaterial("accent.warning", "#E8983E");
    const rand = seededRandom(420);
    const rw = WORLD_VISUAL_CONFIG.rooftopEdgeHalfWidth;
    const halfTrack = WORLD_VISUAL_CONFIG.trackWidth / 2;

    const L = WORLD_VISUAL_CONFIG.trackLength;

    for (let z = 4; z < L - 4; z += 9 + rand() * 5) {
      for (const side of [-1, 1]) {
        const cx = side * (halfTrack + rw / 2 + 0.35);
        const r2 = rand();
        if (r2 < 0.35) {
          // Ventilation box
          const v = MeshBuilder.CreateBox("vent", { width: 0.55, height: 0.45, depth: 0.5 }, this.scene);
          v.position.set(cx + (rand() - 0.5) * 0.6, 0.25, z);
          v.material = matProp;
          v.parent = this.envRoot;
          this.props.push(v);
        } else if (r2 < 0.55) {
          // AC unit (box + small pipe)
          const ac = MeshBuilder.CreateBox("ac-unit", { width: 0.45, height: 0.35, depth: 0.7 }, this.scene);
          ac.position.set(cx + (rand() - 0.5) * 0.6, 0.18, z);
          ac.material = matProp;
          ac.parent = this.envRoot;
          this.props.push(ac);
        } else if (r2 < 0.7) {
          // Small pipe (cylinder vertical)
          const pipe = MeshBuilder.CreateCylinder("pipe", { diameter: 0.12, height: 0.7 + rand() * 0.5, tessellation: 8 }, this.scene);
          pipe.position.set(cx + (rand() - 0.5) * 0.5, 0.35, z);
          pipe.material = matProp;
          pipe.parent = this.envRoot;
          this.props.push(pipe);
        } else if (r2 < 0.85) {
          // Antenna
          const ant = MeshBuilder.CreateCylinder("antenna", { diameter: 0.04, height: 1.1 + rand() * 0.8, tessellation: 6 }, this.scene);
          ant.position.set(cx + (rand() - 0.5) * 0.4, 0.6, z);
          ant.material = matProp;
          ant.parent = this.envRoot;
          this.props.push(ant);
        } else {
          // Warning light (small accent-colored sphere)
          const wl = MeshBuilder.CreateSphere("warn-light", { diameter: 0.18, segments: 8 }, this.scene);
          wl.position.set(cx, 0.62, z);
          wl.material = matAccent;
          wl.parent = this.envRoot;
          this.props.push(wl);
        }
      }
    }
  }

  dispose(): void {
    this.envRoot?.dispose();
  }
}
