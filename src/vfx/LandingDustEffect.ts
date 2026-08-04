import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";

export class LandingDustEffect {
  private particles: Mesh[] = [];
  private material!: StandardMaterial;

  constructor(scene: Scene, parent: TransformNode) {
    this.material = new StandardMaterial("dust-mat", scene);
    this.material.diffuseColor = new Color3(0.6, 0.55, 0.5);
    this.material.specularColor = Color3.Black();
    this.material.alpha = 0;

    // Pre-create 6 dust particles
    for (let i = 0; i < 6; i++) {
      const p = MeshBuilder.CreateSphere("dust", { diameter: 0.08, segments: 4 }, scene);
      p.material = this.material;
      p.parent = parent;
      p.position.set(0, 0.02, 0);
      p.setEnabled(false);
      this.particles.push(p);
    }
  }

  trigger(): void {
    for (const p of this.particles) {
      p.setEnabled(true);
      p.position.set(
        (Math.random() - 0.5) * 1.2,
        0.03,
        (Math.random() - 0.5) * 0.8
      );
    }
    this.material.alpha = 0.5;

    // Fade out
    let elapsed = 0;
    const fadeOut = () => {
      elapsed += 16;
      this.material.alpha = 0.5 * (1 - elapsed / 300);
      if (elapsed >= 300) {
        this.material.alpha = 0;
        for (const p of this.particles) {
          p.setEnabled(false);
        }
      } else {
        requestAnimationFrame(fadeOut);
      }
    };
    requestAnimationFrame(fadeOut);
  }

  dispose(): void {
    this.material?.dispose();
    for (const p of this.particles) {
      p?.dispose();
    }
    this.particles = [];
  }
}
