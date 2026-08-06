import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import { getPropEntry, type PropKind } from "../../config/visual/props.config";
import { seededRandom } from "../track/chunks/TrackChunk";
import type { PropAssetLoader } from "./PropAssetLoader";

export interface PropInstance {
  readonly dispose: () => void;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

/**
 * Builds one environment prop. Uses the real GLB when the PropAssetLoader has
 * it cached, otherwise falls back to a low-poly procedural composite.
 * Materials come from the shared registry (no material creation per prop).
 */
export class PropFactory {
  constructor(
    private readonly scene: Scene,
    private readonly materials: MaterialsRegistry,
    private readonly loader: PropAssetLoader
  ) {}

  /** Whether a real GLB is available for this kind (else procedural). */
  canRender(kind: PropKind): boolean {
    return this.loader.has(kind);
  }

  /** Creates a prop at `position` (parent-local space). Returns a dispose handle. */
  create(
    kind: PropKind,
    parent: TransformNode,
    position: Vector3,
    seed: number
  ): PropInstance {
    if (this.loader.has(kind)) {
      return this.instantiateAsset(kind, parent, position);
    }
    return this.buildProcedural(kind, parent, position, seed);
  }

  // ── real asset path ─────────────────────────────────────────

  private instantiateAsset(
    kind: PropKind,
    parent: TransformNode,
    position: Vector3
  ): PropInstance {
    const entry = getPropEntry(kind);
    const optimizedTemplate = this.loader.getOptimizedTemplate(kind);
    const container = this.loader.getContainer(kind);
    if (!optimizedTemplate && !container) {
      return { dispose: () => {} };
    }

    const instanceRoot = new TransformNode(`prop-${kind}-instance`, this.scene);
    instanceRoot.parent = parent;
    instanceRoot.position.copyFrom(position);
    // Calibration offset (raises center-pivoted models so they sit on the ground)
    instanceRoot.position.x += entry.calibration.position.x;
    instanceRoot.position.y += entry.calibration.position.y;
    instanceRoot.position.z += entry.calibration.position.z;
    instanceRoot.rotation.set(
      degToRad(entry.calibration.rotationDegrees.x),
      degToRad(entry.calibration.rotationDegrees.y),
      degToRad(entry.calibration.rotationDegrees.z)
    );
    instanceRoot.scaling.setAll(entry.calibration.scale);

    if (optimizedTemplate) {
      const clone = optimizedTemplate.clone(`prop-${kind}-optimized-instance`);
      if (!clone) {
        instanceRoot.dispose();
        return { dispose: () => {} };
      }
      clone.parent = instanceRoot;
      clone.position.setAll(0);
      clone.rotation.setAll(0);
      clone.scaling.setAll(1);
      clone.setEnabled(true);
      return { dispose: () => instanceRoot.dispose() };
    }

    if (!container) return { dispose: () => instanceRoot.dispose() };
    const result = container.instantiateModelsToScene(
      (name) => `prop-${kind}-${name}`
    );
    for (const root of result.rootNodes) {
      // Direct parent assignment keeps the imported local transform intact
      root.parent = instanceRoot;
    }

    return {
      dispose: () => instanceRoot.dispose()
    };
  }

  // ── procedural fallback path ────────────────────────────────

  private buildProcedural(
    kind: PropKind,
    parent: TransformNode,
    position: Vector3,
    seed: number
  ): PropInstance {
    const rand = seededRandom(seed);
    const meshes: Mesh[] = [];

    const push = (mesh: Mesh, offsetY = 0): void => {
      mesh.position.copyFrom(position);
      mesh.position.y += offsetY;
      mesh.parent = parent;
      mesh.isPickable = false;
      mesh.receiveShadows = false;
      meshes.push(mesh);
    };

    switch (kind) {
      case "building": {
        const h = 3 + rand() * 3.5;
        const w = 1.4 + rand() * 1.4;
        const depth = 1.2 + rand();
        const palette = ["#4E5968", "#675765", "#4D6661", "#6B6253", "#47546B"];
        const colorIndex = Math.min(
          palette.length - 1,
          Math.floor(rand() * palette.length)
        );
        const body = MeshBuilder.CreateBox(
          "prop-building",
          { width: w, height: h, depth },
          this.scene
        );
        body.material = this.materials.createMaterial(
          `prop.building.${colorIndex}`,
          palette[colorIndex]
        );
        push(body, h / 2);
        if (rand() > 0.45) {
          const cap = MeshBuilder.CreateBox(
            "prop-building-cap",
            { width: w * 0.45, height: 0.32, depth: depth * 0.55 },
            this.scene
          );
          cap.material = this.materials.createMaterial("rooftop.prop", "#484550");
          push(cap, h + 0.16);
        }
        break;
      }
      case "lamp": {
        const pole = MeshBuilder.CreateCylinder(
          "prop-lamp-pole",
          { diameter: 0.08, height: 2.1, tessellation: 6 },
          this.scene
        );
        pole.material = this.materials.createMaterial("prop.lamp", "#6E6B75");
        push(pole, 1.05);

        const head = MeshBuilder.CreateBox(
          "prop-lamp-head",
          { width: 0.42, height: 0.1, depth: 0.16 },
          this.scene
        );
        head.material = pole.material;
        push(head, 2.1);

        const glow = MeshBuilder.CreateSphere(
          "prop-lamp-glow",
          { diameter: 0.14, segments: 6 },
          this.scene
        );
        glow.material = this.materials.createMaterial("prop.lampLight", "#F5D76E");
        push(glow, 2.1);
        break;
      }
      case "fence": {
        const railMat = this.materials.createMaterial("prop.fence", "#6E6B75");
        const half = 1.1;
        for (const z of [-half, half]) {
          const post = MeshBuilder.CreateBox(
            "prop-fence-post",
            { width: 0.08, height: 0.7, depth: 0.08 },
            this.scene
          );
          post.material = railMat;
          push(post, 0.35);
          post.position.z += z;
        }
        for (const y of [0.25, 0.55]) {
          const bar = MeshBuilder.CreateBox(
            "prop-fence-bar",
            { width: 0.05, height: 0.05, depth: 2.2 },
            this.scene
          );
          bar.material = railMat;
          push(bar, y);
        }
        break;
      }
      case "box": {
        const s = 0.7 + rand() * 0.4;
        const box = MeshBuilder.CreateBox(
          "prop-box",
          { width: s, height: s, depth: s },
          this.scene
        );
        box.material = this.materials.createMaterial("prop.box", "#6A5A4A");
        push(box, s / 2);
        break;
      }
      case "cone": {
        const base = MeshBuilder.CreateBox(
          "prop-cone-base",
          { width: 0.42, height: 0.06, depth: 0.42 },
          this.scene
        );
        base.material = this.materials.createMaterial("prop.cone", "#E07040");
        push(base, 0.03);

        const cone = MeshBuilder.CreateCylinder(
          "prop-cone",
          { diameterTop: 0.08, diameterBottom: 0.3, height: 0.55, tessellation: 8 },
          this.scene
        );
        cone.material = base.material;
        push(cone, 0.33);
        break;
      }
      case "dumpster": {
        const body = MeshBuilder.CreateBox(
          "prop-dumpster",
          { width: 1.1, height: 0.85, depth: 0.7 },
          this.scene
        );
        body.material = this.materials.createMaterial("prop.dumpster", "#3E4A3E");
        push(body, 0.425);

        const lid = MeshBuilder.CreateBox(
          "prop-dumpster-lid",
          { width: 1.14, height: 0.06, depth: 0.74 },
          this.scene
        );
        lid.material = this.materials.createMaterial("prop.dumpsterLid", "#59684F");
        push(lid, 0.88);
        break;
      }
      case "tree": {
        const trunk = MeshBuilder.CreateCylinder(
          "prop-tree-trunk",
          { diameter: 0.18, height: 0.9, tessellation: 6 },
          this.scene
        );
        trunk.material = this.materials.createMaterial("prop.treeTrunk", "#7A5A3A");
        push(trunk, 0.45);

        const foliage = MeshBuilder.CreateSphere(
          "prop-tree-foliage",
          { diameter: 1.1 + rand() * 0.4, segments: 8 },
          this.scene
        );
        foliage.material = this.materials.createMaterial("prop.treeLeaf", "#4E7A4E");
        push(foliage, 1.35 + rand() * 0.3);
        break;
      }
      case "plant": {
        const pot = MeshBuilder.CreateCylinder(
          "prop-plant-pot",
          { diameterTop: 0.34, diameterBottom: 0.26, height: 0.3, tessellation: 6 },
          this.scene
        );
        pot.material = this.materials.createMaterial("prop.plantPot", "#8A5A3A");
        push(pot, 0.15);

        const leaves = MeshBuilder.CreateSphere(
          "prop-plant-leaves",
          { diameter: 0.55 + rand() * 0.15, segments: 6 },
          this.scene
        );
        leaves.material = this.materials.createMaterial("prop.treeLeaf", "#4E7A4E");
        push(leaves, 0.5 + rand() * 0.15);
        break;
      }
      case "vent": {
        const v = MeshBuilder.CreateBox(
          "prop-vent",
          { width: 0.55, height: 0.45, depth: 0.5 },
          this.scene
        );
        v.material = this.materials.createMaterial("rooftop.prop", "#484550");
        push(v, 0.25);
        break;
      }
      case "ac": {
        const ac = MeshBuilder.CreateBox(
          "prop-ac",
          { width: 0.45, height: 0.35, depth: 0.7 },
          this.scene
        );
        ac.material = this.materials.createMaterial("rooftop.prop", "#484550");
        push(ac, 0.18);
        break;
      }
      case "pipe": {
        const pipe = MeshBuilder.CreateCylinder(
          "prop-pipe",
          { diameter: 0.12, height: 0.7 + rand() * 0.5, tessellation: 8 },
          this.scene
        );
        pipe.material = this.materials.createMaterial("rooftop.prop", "#484550");
        push(pipe, 0.35);
        break;
      }
      case "antenna": {
        const ant = MeshBuilder.CreateCylinder(
          "prop-antenna",
          { diameter: 0.04, height: 1.1 + rand() * 0.8, tessellation: 6 },
          this.scene
        );
        ant.material = this.materials.createMaterial("rooftop.prop", "#484550");
        push(ant, 0.6);
        break;
      }
      case "warningLight": {
        const wl = MeshBuilder.CreateSphere(
          "prop-warningLight",
          { diameter: 0.18, segments: 8 },
          this.scene
        );
        wl.material = this.materials.createMaterial("accent.warning", "#E8983E");
        push(wl, 0.62);
        break;
      }
      case "barrier": {
        const b = MeshBuilder.CreateBox(
          "prop-barrier",
          { width: 0.5, height: 0.3, depth: 1.4 },
          this.scene
        );
        b.material = this.materials.createMaterial("rooftop.prop", "#484550");
        push(b, 0.15);
        break;
      }
    }

    return {
      dispose: () => {
        for (const mesh of meshes) {
          mesh.dispose();
        }
      }
    };
  }
}
