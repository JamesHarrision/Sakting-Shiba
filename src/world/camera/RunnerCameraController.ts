import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";
import type { CameraTargetSnapshot } from "../../contracts/player-visual.contract";

export function dampTowards(current: number, target: number, smoothing: number, deltaSeconds: number): number {
  if (deltaSeconds <= 0) return current;
  const blend = 1 - Math.exp(-smoothing * deltaSeconds);
  return current + (target - current) * blend;
}

export class RunnerCameraController {
  private camera!: FreeCamera;
  private readonly cfg = WORLD_VISUAL_CONFIG;
  private baseX = 0;
  private baseY = this.cfg.cameraHeight;
  private baseZ = -this.cfg.cameraDistance;
  private impact = 0;
  private impactTime = 0;

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

    this.baseX = dampTowards(
      this.baseX, desiredX,
      this.cfg.cameraXSmoothing, deltaSeconds
    );
    this.baseY = dampTowards(
      this.baseY, desiredY,
      this.cfg.cameraYSmoothing, deltaSeconds
    );
    this.baseZ = dampTowards(
      this.baseZ, desiredZ,
      this.cfg.cameraYSmoothing, deltaSeconds
    );

    this.impactTime += deltaSeconds;
    this.impact *= Math.exp(-11 * deltaSeconds);
    const shakeX = Math.sin(this.impactTime * 61) * this.impact;
    const shakeY = Math.sin(this.impactTime * 47) * this.impact * 0.55;
    this.camera.position.set(
      this.baseX + shakeX,
      this.baseY + shakeY,
      this.baseZ
    );

    this.camera.setTarget(new Vector3(
      target.targetX,
      target.targetY + this.cfg.cameraTargetYOffset,
      target.targetY * 0.1 + this.cfg.cameraLookAhead
    ));
  }

  reset(): void {
    this.baseX = 0;
    this.baseY = this.cfg.cameraHeight;
    this.baseZ = -this.cfg.cameraDistance;
    this.impact = 0;
    this.impactTime = 0;
    this.camera.position.set(0, this.cfg.cameraHeight, -this.cfg.cameraDistance);
    this.camera.setTarget(new Vector3(0, this.cfg.cameraTargetYOffset, this.cfg.cameraLookAhead));
  }

  addImpact(amount: number): void {
    this.impact = Math.min(0.45, this.impact + Math.max(0, amount));
  }

  dispose(): void {
    this.camera?.dispose();
  }
}
