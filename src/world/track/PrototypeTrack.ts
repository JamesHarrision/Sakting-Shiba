import type { Scene } from "@babylonjs/core/scene";
import type { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";

const CFG = WORLD_VISUAL_CONFIG;
const HALF_TRACK = CFG.trackWidth / 2;
const EDGE = HALF_TRACK + CFG.rooftopEdgeHalfWidth / 2;
const L = CFG.trackLength;

export class PrototypeTrack {
  private surface!: Mesh;
  private borderLeft!: Mesh;
  private borderRight!: Mesh;
  private laneMarkers: Mesh[] = [];
  private guardRails: Mesh[] = [];
  private roofBases: Mesh[] = [];
  private trackRoot!: TransformNode;

  constructor(
    private readonly scene: Scene,
    private readonly materials: MaterialsRegistry
  ) {}

  build(parent: TransformNode): void {
    const { TransformNode } = require("@babylonjs/core/Meshes/transformNode");
    this.trackRoot = new TransformNode("track-root", this.scene);
    this.trackRoot.parent = parent;

    this.createSurface();
    this.createBorders();
    this.createLaneMarkers();
    this.createGuardRails();
    this.createRooftopBase();
  }

  private createSurface(): void {
    const matTrack = this.materials.createMaterial("track.surface", "#3D3A40");
    this.surface = MeshBuilder.CreateGround("track-surface", { width: CFG.trackWidth, height: L, subdivisions: 2 }, this.scene);
    this.surface.position.set(0, CFG.trackThickness, L / 2);
    this.surface.material = matTrack;
    this.surface.parent = this.trackRoot;
    this.surface.receiveShadows = true;
  }

  private createBorders(): void {
    const matBorder = this.materials.createMaterial("track.border", "#4A4750");
    const bw = 0.22;
    this.borderLeft = MeshBuilder.CreateBox("track-border-L", { width: bw, height: 0.08, depth: L, }, this.scene);
    this.borderLeft.position.set(-HALF_TRACK + bw / 2, CFG.trackThickness + 0.04, L / 2);
    this.borderLeft.material = matBorder;
    this.borderLeft.parent = this.trackRoot;

    this.borderRight = MeshBuilder.CreateBox("track-border-R", { width: bw, height: 0.08, depth: L, }, this.scene);
    this.borderRight.position.set(HALF_TRACK - bw / 2, CFG.trackThickness + 0.04, L / 2);
    this.borderRight.material = matBorder;
    this.borderRight.parent = this.trackRoot;
  }

  private createLaneMarkers(): void {
    const matLane = this.materials.createMaterial("track.laneMarker", "#7A7880", 0.65);
    const lanePositions = [-CFG.laneMarkerWidth * 8, CFG.laneMarkerWidth * 8];
    for (const lx of lanePositions) {
      const marker = MeshBuilder.CreateBox(
        "lane-marker", { width: CFG.laneMarkerWidth, height: 0.012, depth: L - 8 },
        this.scene
      );
      marker.position.set(lx, CFG.trackThickness + 0.01, L / 2);
      marker.material = matLane;
      marker.parent = this.trackRoot;
      this.laneMarkers.push(marker);
    }
  }

  private createGuardRails(): void {
    const matRail = this.materials.createMaterial("track.guardRail", "#6E6B75");
    const gh = CFG.guardRailHeight;
    const y0 = CFG.trackThickness + 0.08;
    for (const side of [-1, 1]) {
      const x = side * (HALF_TRACK + 0.18);
      // Posts
      for (let z = 4; z < L - 4; z += 8) {
        const post = MeshBuilder.CreateBox("rail-post", { width: 0.08, height: gh, depth: 0.08 }, this.scene);
        post.position.set(x, y0 + gh / 2, z);
        post.material = matRail;
        post.parent = this.trackRoot;
        this.guardRails.push(post);
      }
      // Top bar
      const bar = MeshBuilder.CreateBox("rail-bar", { width: 0.06, height: 0.06, depth: L - 8 }, this.scene);
      bar.position.set(x, y0 + gh, L / 2);
      bar.material = matRail;
      bar.parent = this.trackRoot;
      this.guardRails.push(bar);
    }
  }

  private createRooftopBase(): void {
    const matRoof = this.materials.createMaterial("rooftop.surface", "#585560");
    const rw = CFG.rooftopEdgeHalfWidth;
    for (const side of [-1, 1]) {
      const cx = side * (HALF_TRACK + rw / 2 + 0.35);
      const roof = MeshBuilder.CreateGround("rooftop-base", { width: rw, height: L, subdivisions: 2 }, this.scene);
      roof.position.set(cx, 0, L / 2);
      roof.material = matRoof;
      roof.parent = this.trackRoot;
      roof.receiveShadows = true;
      this.roofBases.push(roof);
    }
  }

  dispose(): void {
    this.trackRoot?.dispose();
  }
}
