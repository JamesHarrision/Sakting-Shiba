import type { Scene } from "@babylonjs/core/scene";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import { GAMEPLAY_CONFIG, LANE_X_POSITIONS } from "../../config/gameplay/gameplayConfig";
import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";
import type { SpawnRequest, TrackDebugStats } from "../../contracts/track.contract";
import type { PropFactory } from "../props/PropFactory";
import type { PropKind } from "../../config/visual/props.config";
import { SpawnItemPool } from "../pool/SpawnItemPool";
import { StraightChunkA } from "./chunks/StraightChunkA";
import { StraightChunkB } from "./chunks/StraightChunkB";
import { StraightChunkC } from "./chunks/StraightChunkC";
import type { TrackChunk } from "./chunks/TrackChunk";

const CFG = WORLD_VISUAL_CONFIG;

interface ActiveSpawnItem {
  /** Returns the item to its pool / disposes its asset instance */
  readonly release: () => void;
  /** Local Z in scroll space (world Z at placement) */
  readonly localZ: number;
}

/** Maps gameplay obstacle assetIds to real prop kinds (fallback: debug box). */
const OBSTACLE_KIND_BY_ASSET: Readonly<Record<string, PropKind>> = {
  "obstacle.box": "box",
  "obstacle.cone": "cone",
  "obstacle.dumpster": "dumpster",
  "obstacle.fence": "fence"
};

export interface ChunkWorldRange {
  readonly index: number;
  readonly start: number;
  readonly end: number;
}

/**
 * Manages the infinite track by recycling pooled chunks.
 *
 * Movement model:
 * - `scrollDistance` grows with speed*dt; `trackRoot.z = -scrollDistance` moves
 *   the whole track smoothly toward the player (the player never moves along Z).
 * - Chunks recycle individually (local Z += totalLength) only when their far
 *   edge has fully passed behind the camera — no whole-track jumps, so there is
 *   no visible jolt and never a visible track end.
 * - Debug spawn placeholders live in a scroll-space container (spawnRoot) so
 *   they scroll with the world and recycle independently of chunks.
 */
export class TrackManager {
  readonly root: TransformNode;
  /** Scroll-space container for pooled debug spawn placeholders */
  readonly spawnRoot: TransformNode;

  private readonly trackRoot: TransformNode;
  private readonly chunks: TrackChunk[] = [];
  private readonly obstaclePool: SpawnItemPool;
  private readonly pickupPool: SpawnItemPool;
  private readonly activeItems: ActiveSpawnItem[] = [];

  private readonly chunkLength = CFG.trackChunkLength;
  private readonly chunkCount = CFG.trackChunkCount;
  private readonly totalLength = CFG.trackChunkLength * CFG.trackChunkCount;
  private readonly recycleBehindZ = -CFG.trackChunkLength;

  private scrollDistance = 0;
  private paused = false;
  private lastSpeed: number = GAMEPLAY_CONFIG.initialSpeed;
  private poolExhaustedWarned = false;
  private readonly reusePosition = new Vector3();
  private props?: PropFactory;

  constructor(
    private readonly scene: Scene,
    private readonly materials: MaterialsRegistry
  ) {
    this.root = new TransformNode("track-manager", scene);
    this.trackRoot = new TransformNode("track-scroll-root", scene);
    this.trackRoot.parent = this.root;
    this.spawnRoot = new TransformNode("track-spawn-root", scene);
    this.spawnRoot.parent = this.trackRoot;

    const obstacleMat = materials.createMaterial(
      "spawn.obstacle",
      CFG.spawnObstacleColor
    );
    const pickupMat = materials.createMaterial(
      "spawn.pickup",
      CFG.spawnPickupColor
    );

    this.obstaclePool = new SpawnItemPool(scene, 24, () => {
      const mesh = MeshBuilder.CreateBox(
        "debug-obstacle",
        { width: 1.4, height: 1.8, depth: 1.2 },
        scene
      );
      mesh.material = obstacleMat;
      return mesh;
    });

    this.pickupPool = new SpawnItemPool(scene, 24, () => {
      const mesh = MeshBuilder.CreateSphere(
        "debug-pickup",
        { diameter: 0.55, segments: 8 },
        scene
      );
      mesh.material = pickupMat;
      return mesh;
    });
  }

  build(parent: TransformNode, props: PropFactory): void {
    this.root.parent = parent;

    const variantCtors = [StraightChunkA, StraightChunkB, StraightChunkC];
    for (let i = 0; i < this.chunkCount; i++) {
      const ctor = variantCtors[i % variantCtors.length];
      const chunk = new ctor({
        scene: this.scene,
        materials: this.materials,
        props
      });
      chunk.build(i);
      chunk.root.parent = this.trackRoot;
      // Initial locals cover [-chunkLength, (chunkCount-1) * chunkLength]
      chunk.root.position.z = (i - 1) * this.chunkLength;
      this.chunks.push(chunk);
    }
  }

  /**
   * Replaces chunk props with the real GLB assets once they finish loading
   * (no-op when assets are absent — procedural props stay).
   */
  applyLoadedProps(): void {
    for (const chunk of this.chunks) {
      chunk.rebuildProps();
    }
  }

  update(deltaSeconds: number, speed: number): void {
    if (this.paused || deltaSeconds <= 0) {
      return;
    }

    this.lastSpeed = speed;
    this.scrollDistance += speed * deltaSeconds;
    this.trackRoot.position.z = -this.scrollDistance;

    this.recycleChunks();
    this.recycleSpawnItems();
  }

  getScrollDistance(): number {
    return this.scrollDistance;
  }

  /** Renders world-space spawn requests as pooled debug placeholders. */
  submitSpawnRequests(requests: readonly SpawnRequest[]): void {
    for (const request of requests) {
      for (const row of request.rows) {
        const worldZ = request.startZ + row.offsetZ;
        row.lanes.forEach((item, lane) => {
          if (!item) {
            return;
          }
          if (item.type === "obstacle") {
            this.placeObstacle(lane, worldZ, item.assetId);
          } else if (item.type === "pickup") {
            this.placePickup(lane, worldZ);
          }
          // ramp/rail/other kinds are not rendered by the M3 placeholder policy
        });
      }
    }
  }

  reset(): void {
    this.paused = false;
    this.scrollDistance = 0;
    this.trackRoot.position.z = 0;
    this.releaseAllSpawnItems();
    for (const chunk of this.chunks) {
      chunk.root.position.z =
        (this.chunks.indexOf(chunk) - 1) * this.chunkLength;
    }
    this.lastSpeed = GAMEPLAY_CONFIG.initialSpeed;
    this.poolExhaustedWarned = false;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  /** Chunk world ranges (sorted by start). Used by debug + tests. */
  getChunkWorldRanges(): ChunkWorldRange[] {
    const ranges = this.chunks.map((chunk, index) => ({
      index,
      start: chunk.root.position.z + this.trackRoot.position.z,
      end:
        chunk.root.position.z +
        this.trackRoot.position.z +
        this.chunkLength
    }));
    ranges.sort((a, b) => a.start - b.start);
    return ranges;
  }

  getDebugStats(): TrackDebugStats {
    let furthestEnd = 0;
    for (const chunk of this.chunks) {
      furthestEnd = Math.max(
        furthestEnd,
        chunk.root.position.z + this.trackRoot.position.z + this.chunkLength
      );
    }
    return {
      activeChunks: this.chunks.length,
      pooledChunks: 0,
      activeObstacles: this.obstaclePool.activeCount,
      activePickups: this.pickupPool.activeCount,
      speed: this.lastSpeed,
      furthestChunkZ: furthestEnd
    };
  }

  dispose(): void {
    this.releaseAllSpawnItems();
    this.obstaclePool.dispose();
    this.pickupPool.dispose();
    for (const chunk of this.chunks) {
      chunk.dispose();
    }
    this.chunks.length = 0;
    this.trackRoot.dispose();
    this.root.dispose();
  }

  // ── private ─────────────────────────────────────────────────

  private recycleChunks(): void {
    for (const chunk of this.chunks) {
      const worldEnd =
        chunk.root.position.z + this.chunkLength + this.trackRoot.position.z;
      if (worldEnd < this.recycleBehindZ) {
        chunk.root.position.z += this.totalLength;
      }
    }
  }

  private recycleSpawnItems(): void {
    for (let i = this.activeItems.length - 1; i >= 0; i--) {
      const entry = this.activeItems[i];
      const worldZ = entry.localZ + this.trackRoot.position.z;
      if (worldZ < this.recycleBehindZ) {
        entry.release();
        this.activeItems.splice(i, 1);
      }
    }
  }

  private placeObstacle(lane: number, worldZ: number, assetId: string): void {
    const kind = OBSTACLE_KIND_BY_ASSET[assetId];
    const laneX = LANE_X_POSITIONS[lane as keyof typeof LANE_X_POSITIONS];

    // Prefer the real prop asset when it is loaded
    if (kind && this.props?.canRender(kind)) {
      const instance = this.props.create(
        kind,
        this.spawnRoot,
        this.reusePosition.set(laneX, CFG.trackThickness, worldZ),
        9000 + this.activeItems.length
      );
      this.activeItems.push({
        release: () => instance.dispose(),
        localZ: worldZ
      });
      return;
    }

    const mesh = this.obstaclePool.acquire(
      this.spawnRoot,
      this.reusePosition.set(laneX, CFG.trackThickness + 0.9, worldZ)
    );
    if (!mesh) {
      this.warnPoolExhausted("obstacle");
      return;
    }
    this.activeItems.push({
      release: () => this.obstaclePool.release(mesh),
      localZ: worldZ
    });
  }

  private placePickup(lane: number, worldZ: number): void {
    const mesh = this.pickupPool.acquire(
      this.spawnRoot,
      this.reusePosition.set(
        LANE_X_POSITIONS[lane as keyof typeof LANE_X_POSITIONS],
        CFG.trackThickness + 0.4,
        worldZ
      )
    );
    if (!mesh) {
      this.warnPoolExhausted("pickup");
      return;
    }
    this.activeItems.push({
      release: () => this.pickupPool.release(mesh),
      localZ: worldZ
    });
  }

  private releaseAllSpawnItems(): void {
    for (const entry of this.activeItems) {
      entry.release();
    }
    this.activeItems.length = 0;
  }

  private warnPoolExhausted(kind: string): void {
    if (this.poolExhaustedWarned) {
      return;
    }
    this.poolExhaustedWarned = true;
    console.warn(
      `[TrackManager] ${kind} spawn pool exhausted; some placeholders skipped.`
    );
  }
}
