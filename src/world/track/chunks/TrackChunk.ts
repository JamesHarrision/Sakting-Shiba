import type { Scene } from "@babylonjs/core/scene";
import type { MaterialsRegistry } from "../../../assets/MaterialsRegistry";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WORLD_VISUAL_CONFIG } from "../../../config/visual/world-visual.config";
import { GAMEPLAY_CONFIG } from "../../../config/gameplay/gameplayConfig";
import type { PropKind } from "../../../config/visual/props.config";
import type { PropFactory, PropInstance } from "../../props/PropFactory";

const CFG = WORLD_VISUAL_CONFIG;
const HALF_TRACK = CFG.trackWidth / 2;

export interface TrackChunkContext {
  readonly scene: Scene;
  readonly materials: MaterialsRegistry;
  readonly props: PropFactory;
}

export function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

/**
 * Base recycled track chunk. Every variant shares the exact same width, lane
 * positions, ground height and connection edges, so chunks always line up.
 *
 * Chunk local Z spans [0, chunkLength); each chunk is centered at z = len/2.
 */
export abstract class TrackChunk {
  readonly root: TransformNode;

  protected readonly meshes: Mesh[] = [];
  protected readonly propInstances: PropInstance[] = [];
  protected readonly chunkLength = CFG.trackChunkLength;
  private propSeed = 0;

  constructor(protected readonly ctx: TrackChunkContext) {
    this.root = new TransformNode("track-chunk", ctx.scene);
  }

  /** Builds the chunk meshes ONCE. seedOffset varies prop placement per chunk. */
  build(seedOffset: number): void {
    this.propSeed = seedOffset;
    this.buildTrackBase();
    this.buildVariantProps(seedOffset);
  }

  /**
   * Rebuilds only the props (after real GLB assets finish loading).
   * Track geometry stays untouched.
   */
  rebuildProps(): void {
    for (const instance of this.propInstances) {
      instance.dispose();
    }
    this.propInstances.length = 0;
    this.buildVariantProps(this.propSeed);
  }

  protected buildTrackBase(): void {
    const { scene, materials } = this.ctx;
    const len = this.chunkLength;
    const thickness = CFG.trackThickness;

    // Road surface
    const matTrack = materials.createMaterial("track.surface", "#3D3A40");
    const surface = MeshBuilder.CreateGround(
      "track-surface",
      { width: CFG.trackWidth, height: len + 0.06, subdivisions: 2 },
      scene
    );
    surface.position.set(0, thickness, len / 2);
    surface.material = matTrack;
    surface.receiveShadows = true;
    surface.parent = this.root;
    this.meshes.push(surface);

    // Road edges
    const matBorder = materials.createMaterial("track.border", "#4A4750");
    const bw = 0.22;
    for (const side of [-1, 1] as const) {
      const border = MeshBuilder.CreateBox(
        "track-border",
        { width: bw, height: 0.08, depth: len + 0.04 },
        scene
      );
      border.position.set(side * (HALF_TRACK - bw / 2), thickness + 0.04, len / 2);
      border.material = matBorder;
      border.parent = this.root;
      this.meshes.push(border);
    }

    // Lane divider markers (between the three lanes)
    const matLane = materials.createMaterial("track.laneMarker", "#7A7880", 0.65);
    for (const side of [-1, 1] as const) {
      const marker = MeshBuilder.CreateBox(
        "lane-marker",
        { width: CFG.laneMarkerWidth, height: 0.012, depth: len - 0.4 },
        scene
      );
      marker.position.set(
        side * (GAMEPLAY_CONFIG.laneWidth / 2),
        thickness + 0.01,
        len / 2
      );
      marker.material = matLane;
      marker.parent = this.root;
      this.meshes.push(marker);
    }

    // Guard rails use sparse posts; the long top bar carries the silhouette
    // while keeping repeated geometry inside the performance budget.
    const matRail = materials.createMaterial("track.guardRail", "#6E6B75");
    const gh = CFG.guardRailHeight;
    const y0 = thickness + 0.08;
    for (const side of [-1, 1] as const) {
      const x = side * (HALF_TRACK + 0.18);
      for (let z = 4; z < len - 2; z += 16) {
        const post = MeshBuilder.CreateBox(
          "rail-post",
          { width: 0.08, height: gh, depth: 0.08 },
          scene
        );
        post.position.set(x, y0 + gh / 2, z);
        post.material = matRail;
        post.parent = this.root;
        this.meshes.push(post);
      }
      const bar = MeshBuilder.CreateBox(
        "rail-bar",
        { width: 0.06, height: 0.06, depth: len - 0.4 },
        scene
      );
      bar.position.set(x, y0 + gh, len / 2);
      bar.material = matRail;
      bar.parent = this.root;
      this.meshes.push(bar);
    }

    // Rooftop base slabs (outside the track, props live on these)
    const matRoof = materials.createMaterial("rooftop.surface", "#615D66");
    for (const side of [-1, 1] as const) {
      const roof = MeshBuilder.CreateGround(
        "rooftop-base",
        { width: CFG.cityFringeWidth, height: len + 0.06, subdivisions: 2 },
        scene
      );
      roof.position.set(
        side * (HALF_TRACK + CFG.cityFringeWidth / 2 + 0.35),
        0,
        len / 2
      );
      roof.material = matRoof;
      roof.receiveShadows = true;
      roof.parent = this.root;
      this.meshes.push(roof);
    }
  }

  /**
   * Rooftop-edge X used by all variants (never overlaps the lanes).
   * Props are placed on the rooftop slabs or in the fogged city fringe.
   */
  protected readonly rooftopX = HALF_TRACK + CFG.rooftopEdgeHalfWidth / 2 + 0.35;

  /** Places one prop via the PropFactory (real GLB when loaded, else procedural). */
  protected placeProp(
    kind: PropKind,
    x: number,
    z: number,
    seed: number
  ): void {
    this.propInstances.push(
      this.ctx.props.create(kind, this.root, new Vector3(x, 0, z), seed)
    );
  }

  /** Variant-specific environment props. */
  protected abstract buildVariantProps(seedOffset: number): void;

  setEnabled(enabled: boolean): void {
    for (const m of this.meshes) {
      m.setEnabled(enabled);
    }
  }

  dispose(): void {
    this.root?.dispose();
  }
}
