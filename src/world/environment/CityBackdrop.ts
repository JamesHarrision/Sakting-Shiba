import type { Scene } from "@babylonjs/core/scene";
import type { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";

interface BuildingDef {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export class CityBackdrop {
  private buildingMeshes: Mesh[] = [];
  private backdropRoot!: TransformNode;

  constructor(
    private readonly scene: Scene,
    private readonly materials: MaterialsRegistry
  ) {}

  build(parent: TransformNode): void {
    const { TransformNode } = require("@babylonjs/core/Meshes/transformNode");
    this.backdropRoot = new TransformNode("city-backdrop-root", this.scene);
    this.backdropRoot.parent = parent;

    this.buildLayer("city.near", "#5A6070", 6.5, 11.5, 0.8, 3.4, 12, 5, 90);
    this.buildLayer("city.mid", "#6A7080", 11.5, 17, 0.55, 2.8, 16, 6, 130);
    this.buildLayer("city.far", "#828898", 17, 25, 0.35, 2.0, 20, 7, 180);
  }

  private buildLayer(
    matKey: string,
    color: string,
    zMin: number,
    zMax: number,
    minH: number,
    maxH: number,
    count: number,
    seed: number,
    xSpread: number
  ): void {
    const mat = this.materials.createMaterial(matKey, color);
    const rand = seededRandom(seed);

    for (let i = 0; i < count; i++) {
      const z = zMin + rand() * (zMax - zMin);
      const w = 0.8 + rand() * 2.5;
      const h = minH + rand() * (maxH - minH);
      const d = 0.7 + rand() * 2.2;
      const xOffset = (rand() - 0.5) * xSpread;

      for (const side of [-1, 1]) {
        const x = side * (4.8 + xOffset);
        const b = MeshBuilder.CreateBox("city-bld", { width: w, height: h, depth: d }, this.scene);
        b.position.set(x, h / 2, z);
        b.material = mat;
        b.parent = this.backdropRoot;
        this.buildingMeshes.push(b);
      }
    }
  }

  dispose(): void {
    this.backdropRoot?.dispose();
  }
}
