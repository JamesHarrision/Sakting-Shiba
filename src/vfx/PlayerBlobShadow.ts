import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";

export class PlayerBlobShadow {
  private blob!: Mesh;
  private material!: StandardMaterial;

  constructor(scene: Scene, parent: TransformNode) {
    this.material = new StandardMaterial("blob-shadow-mat", scene);
    this.material.diffuseColor = new Color3(0.05, 0.06, 0.08);
    this.material.specularColor = Color3.Black();
    this.material.alpha = 0.28;

    this.blob = MeshBuilder.CreateCylinder(
      "player-blob-shadow",
      { diameter: 1.55, height: 0.01, tessellation: 24 },
      scene
    );
    this.blob.scaling.z = 1.4;
    this.blob.material = this.material;
    this.blob.parent = parent;
    this.blob.position.set(0, 0.005, 0.1);
  }

  update(playerY: number): void {
    // Scale down and fade as player jumps higher
    const heightFactor = Math.max(0, Math.min(1, playerY / 2.8));
    const scale = 1 - heightFactor * 0.6;
    this.blob.scaling.x = scale;
    this.blob.scaling.y = 1;
    this.blob.scaling.z = scale * 1.4;
    this.material.alpha = 0.28 * (1 - heightFactor * 0.7);
  }

  dispose(): void {
    this.material?.dispose();
    this.blob?.dispose();
  }
}
