import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";

export class LandingDustEffect {
  private particles: Mesh[] = [];
  private material!: StandardMaterial;
  private remainingSeconds = 0;

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
      p.scaling.setAll(1);
    }
    this.material.alpha = 0.5;
    this.remainingSeconds = 0.3;
  }

  update(deltaSeconds: number, _playerY: number): void {
    if (this.remainingSeconds <= 0) {
      return;
    }

    this.remainingSeconds = Math.max(0, this.remainingSeconds - deltaSeconds);
    this.material.alpha = 0.5 * (this.remainingSeconds / 0.3);

    for (const particle of this.particles) {
      particle.position.y = 0.03;
      particle.scaling.setAll(1 + (0.3 - this.remainingSeconds) * 2);
    }

    if (this.remainingSeconds === 0) {
      for (const particle of this.particles) {
        particle.setEnabled(false);
      }
    }
  }

  dispose(): void {
    this.remainingSeconds = 0;
    this.material?.dispose();
    for (const p of this.particles) {
      p?.dispose();
    }
    this.particles = [];
  }
}
