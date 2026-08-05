import type { Scene } from "@babylonjs/core/scene";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import type { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import { GAMEPLAY_CONFIG, LANE_X_POSITIONS } from "../../config/gameplay/gameplayConfig";
import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";
import type { SpawnRequest, TrackDebugStats } from "../../contracts/track.contract";
import { SpawnItemPool } from "../pool/SpawnItemPool";
import { StraightChunkA } from "./chunks/StraightChunkA";
import { StraightChunkB } from "./chunks/StraightChunkB";
import { StraightChunkC } from "./chunks/StraightChunkC";
import type { TrackChunk } from "./chunks/TrackChunk";

const CFG = WORLD_VISUAL_CONFIG;

interface ChunkSpawnEntry {
  readonly pool: SpawnItemPool;
  readonly mesh: Mesh;
}

/**
 * Manages the infinite track by recycling pooled chunks.
 *
 * - Chunks are created once and reused (no dispose/recreate per frame).
 * - The whole track scrolls toward -Z (toward the player/camera); the player
 *   never moves along Z — there is exactly one track movement system.
 * - A chunk is recycled to the front when it fully passes behind the camera.
 * - Debug spawn placeholders are pooled and live under chunk spawn roots,
 *   so they scroll with the track and are returned to the pool on recycle.
 */
export class TrackManager {
  readonly root: TransformNode;

  private readonly trackRoot: TransformNode;
  private readonly chunks: TrackChunk[] = [];
  private readonly chunkSpawns = new Map<TrackChunk, ChunkSpawnEntry[]>();
  private readonly obstaclePool: SpawnItemPool;
  private readonly pickupPool: SpawnItemPool;

  private readonly chunkLength = CFG.trackChunkLength;
  private readonly chunkCount = CFG.trackChunkCount;
  private readonly totalLength = CFG.trackChunkLength * CFG.trackChunkCount;

  private paused = false;
  private lastSpeed: number = GAMEPLAY_CONFIG.initialSpeed;
  private poolExhaustedWarned = false;
  private outOfWindowWarned = false;
  private readonly reusePosition = new Vector3();

  constructor(
    private readonly scene: Scene,
    private readonly materials: MaterialsRegistry
  ) {
    this.root = new TransformNode("track-manager", scene);
    this.trackRoot = new TransformNode("track-scroll-root", scene);
    this.trackRoot.parent = this.root;

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

  build(parent: TransformNode): void {
    this.root.parent = parent;

    const variantCtors = [StraightChunkA, StraightChunkB, StraightChunkC];
    for (let i = 0; i < this.chunkCount; i++) {
      const ctor = variantCtors[i % variantCtors.length];
      const chunk = new ctor({ scene: this.scene, materials: this.materials });
      chunk.build(i);
      chunk.root.parent = this.trackRoot;
      // Initial slots cover [-chunkLength, (chunkCount-1) * chunkLength]
      chunk.root.position.z = (i - 1) * this.chunkLength;
      this.chunks.push(chunk);
      this.chunkSpawns.set(chunk, []);
    }
  }

  update(deltaSeconds: number, speed: number): void {
    if (this.paused || deltaSeconds <= 0) {
      return;
    }

    this.lastSpeed = speed;
    this.trackRoot.position.z -= speed * deltaSeconds;

    // Wrap whole chunks that fully passed behind the camera
    while (this.trackRoot.position.z <= -this.chunkLength) {
      this.trackRoot.position.z += this.chunkLength;
      this.recycleBackChunk();
    }
  }

  /** Renders world-space spawn requests as pooled debug placeholders. */
  submitSpawnRequests(requests: readonly SpawnRequest[]): void {
    const coverageStart =
      this.chunks[0].root.position.z + this.trackRoot.position.z;

    for (const request of requests) {
      for (const row of request.rows) {
        const worldZ = request.startZ + row.offsetZ;
        const offsetFromCoverageStart = worldZ - coverageStart;
        const slot = Math.floor(offsetFromCoverageStart / this.chunkLength);

        if (slot < 0 || slot >= this.chunkCount) {
          if (!this.outOfWindowWarned) {
            console.warn(
              `[TrackManager] SpawnRequest "${request.patternId}" at Z=${worldZ.toFixed(1)} ` +
                `is outside the active track window; skipped.`
            );
            this.outOfWindowWarned = true;
          }
          continue;
        }

        const chunk = this.chunks[slot];
        const localZ =
          worldZ - (chunk.root.position.z + this.trackRoot.position.z);

        row.lanes.forEach((item, lane) => {
          if (!item) {
            return;
          }
          if (item.type === "obstacle") {
            this.placeObstacle(chunk, lane, localZ);
          } else if (item.type === "pickup") {
            this.placePickup(chunk, lane, localZ);
          }
          // ramp/rail/other kinds are not rendered by the M3 placeholder policy
        });
      }
    }
  }

  reset(): void {
    this.paused = false;
    this.trackRoot.position.z = 0;

    // Return every spawn item to its pool and restore initial slots
    for (const chunk of this.chunks) {
      this.releaseChunkSpawns(chunk);
      chunk.root.position.z =
        (this.chunks.indexOf(chunk) - 1) * this.chunkLength;
    }
    this.lastSpeed = GAMEPLAY_CONFIG.initialSpeed;
    this.poolExhaustedWarned = false;
    this.outOfWindowWarned = false;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  getDebugStats(): TrackDebugStats {
    const last = this.chunks[this.chunks.length - 1];
    return {
      activeChunks: this.chunks.length,
      pooledChunks: 0,
      activeObstacles: this.obstaclePool.activeCount,
      activePickups: this.pickupPool.activeCount,
      speed: this.lastSpeed,
      furthestChunkZ:
        last.root.position.z + this.trackRoot.position.z + this.chunkLength
    };
  }

  dispose(): void {
    for (const chunk of this.chunks) {
      this.releaseChunkSpawns(chunk);
    }
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

  private recycleBackChunk(): void {
    const back = this.chunks.shift();
    if (!back) {
      return;
    }
    // Items in the back chunk have already been passed — return them to pool
    this.releaseChunkSpawns(back);
    back.root.position.z += this.totalLength;
    this.chunks.push(back);
  }

  private placeObstacle(chunk: TrackChunk, lane: number, localZ: number): void {
    const mesh = this.obstaclePool.acquire(
      chunk.spawnRoot,
      this.reusePosition.set(
        LANE_X_POSITIONS[lane as keyof typeof LANE_X_POSITIONS],
        CFG.trackThickness + 0.9,
        localZ
      )
    );
    if (!mesh) {
      this.warnPoolExhausted("obstacle");
      return;
    }
    this.chunkSpawns.get(chunk)?.push({ pool: this.obstaclePool, mesh });
  }

  private placePickup(chunk: TrackChunk, lane: number, localZ: number): void {
    const mesh = this.pickupPool.acquire(
      chunk.spawnRoot,
      this.reusePosition.set(
        LANE_X_POSITIONS[lane as keyof typeof LANE_X_POSITIONS],
        CFG.trackThickness + 0.4,
        localZ
      )
    );
    if (!mesh) {
      this.warnPoolExhausted("pickup");
      return;
    }
    this.chunkSpawns.get(chunk)?.push({ pool: this.pickupPool, mesh });
  }

  private releaseChunkSpawns(chunk: TrackChunk): void {
    const entries = this.chunkSpawns.get(chunk);
    if (!entries) {
      return;
    }
    for (const entry of entries) {
      entry.pool.release(entry.mesh);
    }
    entries.length = 0;
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
