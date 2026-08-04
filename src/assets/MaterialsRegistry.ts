import type { Scene } from "@babylonjs/core/scene";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { hexToColor3 } from "../config/visual/world-visual.config";

export interface MaterialEntry {
  readonly name: string;
  readonly material: StandardMaterial;
}

export class MaterialsRegistry {
  private readonly materials = new Map<string, StandardMaterial>();

  constructor(private readonly scene: Scene) {}

  get(key: string): StandardMaterial | undefined {
    return this.materials.get(key);
  }

  createMaterial(key: string, hexColor: string, alpha = 1): StandardMaterial {
    const existing = this.materials.get(key);
    if (existing) {
      return existing;
    }

    const mat = new StandardMaterial(`mat-${key}`, this.scene);
    mat.diffuseColor = hexToColor3(hexColor);
    mat.specularColor = new Color3(0.03, 0.03, 0.03);
    mat.alpha = alpha;
    this.materials.set(key, mat);
    return mat;
  }

  dispose(): void {
    for (const mat of this.materials.values()) {
      mat.dispose();
    }
    this.materials.clear();
  }
}
