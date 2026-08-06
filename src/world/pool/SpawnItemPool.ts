import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import type { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { ObjectPool } from "./ObjectPool";

/**
 * Pool of procedural fallback meshes (box obstacles / sphere pickups).
 * Meshes are created once and reused; acquired items are parented to the
 * requesting chunk's spawn root so they scroll with the track.
 */
export class SpawnItemPool {
  private readonly pool: ObjectPool<Mesh>;
  private readonly factory: (index: number) => Mesh;

  constructor(
    scene: Scene,
    initialSize: number,
    factory: (index: number) => Mesh
  ) {
    this.factory = factory;
    this.pool = new ObjectPool<Mesh>(
      () => {
        const mesh = this.factory(0);
        mesh.setEnabled(false);
        mesh.isPickable = false;
        mesh.receiveShadows = false;
        return mesh;
      },
      {
        initialSize,
        reset: (mesh) => {
          mesh.setEnabled(false);
          mesh.parent = null;
        }
      }
    );
  }

  /** Acquire an item, parent it and place it. Returns null if pool exhausted. */
  acquire(
    parent: TransformNode,
    position: Vector3,
    scale?: Vector3
  ): Mesh | null {
    const mesh = this.pool.acquire();
    if (!mesh) {
      return null;
    }
    mesh.parent = parent;
    mesh.position.copyFrom(position);
    if (scale) {
      mesh.scaling.copyFrom(scale);
    } else {
      mesh.scaling.setAll(1);
    }
    mesh.setEnabled(true);
    return mesh;
  }

  release(mesh: Mesh): void {
    this.pool.release(mesh);
  }

  get activeCount(): number {
    return this.pool.activeCount;
  }

  get pooledCount(): number {
    return this.pool.pooledCount;
  }

  dispose(): void {
    this.pool.dispose((mesh) => mesh.dispose());
  }
}
