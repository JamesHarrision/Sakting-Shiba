import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";
import type { CameraTargetSnapshot } from "../../contracts/player-visual.contract";

function dampTowards(current: number, target: number, smoothing: number, deltaSeconds: number): number {
  if (deltaSeconds <= 0) return current;
  const blend = 1 - Math.exp(-smoothing * deltaSeconds);
  return current + (target - current) * blend;
}

export class RunnerCameraController {
  private camera!: FreeCamera;
  private readonly cfg = WORLD_VISUAL_CONFIG;

  constructor(private readonly scene: Scene) {}

  initialize(checkerboardMesh: AbstractMesh): void {
    this.camera = new FreeCamera(
      "runner-camera",
      new Vector3(0, this.cfg.cameraHeight, -this.cfg.cameraDistance),
      this.scene
    );
    this.camera.fov = this.cfg.cameraFov;
    this.camera.minZ = 0.1;
    this.camera.maxZ = 300;
    this.camera.setTarget(new Vector3(0, this.cfg.cameraTargetYOffset, this.cfg.cameraLookAhead));
    // Ensure checkerboard renders in camera
    checkerboardMesh.alwaysSelectAsActiveMesh = true;
  }

  update(deltaSeconds: number, target: CameraTargetSnapshot): void {
    const desiredX = target.targetX;
    // Camera Y barely follows jump
    const desiredY = this.cfg.cameraHeight + target.targetY * 0.08;
    const desiredZ = target.targetY * 0.15 - this.cfg.cameraDistance;

    this.camera.position.x = dampTowards(
      this.camera.position.x, desiredX,
      this.cfg.cameraXSmoothing, deltaSeconds
    );
    this.camera.position.y = dampTowards(
      this.camera.position.y, desiredY,
      this.cfg.cameraYSmoothing, deltaSeconds
    );
    this.camera.position.z = dampTowards(
      this.camera.position.z, desiredZ,
      this.cfg.cameraYSmoothing, deltaSeconds
    );

    this.camera.setTarget(new Vector3(
      target.targetX,
      target.targetY + this.cfg.cameraTargetYOffset,
      target.targetY * 0.1 + this.cfg.cameraLookAhead
    ));
  }

  reset(): void {
    this.camera.position.set(0, this.cfg.cameraHeight, -this.cfg.cameraDistance);
    this.camera.setTarget(new Vector3(0, this.cfg.cameraTargetYOffset, this.cfg.cameraLookAhead));
  }

  dispose(): void {
    this.camera?.dispose();
  }
}
