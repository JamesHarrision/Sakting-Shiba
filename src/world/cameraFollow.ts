import type { TargetCamera } from "@babylonjs/core/Cameras/targetCamera";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export function dampTowards(current: number, target: number, smoothing: number, deltaSeconds: number): number {
  if (deltaSeconds <= 0) {
    return current;
  }

  const blendFactor = 1 - Math.exp(-smoothing * deltaSeconds);
  return current + (target - current) * blendFactor;
}

export interface CameraFollowConfig {
  readonly height: number;
  readonly distance: number;
  readonly lookAhead: number;
  readonly xSmoothing: number;
  readonly ySmoothing: number;
  readonly zSmoothing: number;
}

export class CameraFollowController {
  public constructor(
    private readonly camera: TargetCamera,
    private readonly target: TransformNode,
    private readonly config: CameraFollowConfig
  ) {}

  public update(deltaSeconds: number): void {
    const desiredX = this.target.position.x;
    const desiredY = this.target.position.y + this.config.height;
    const desiredZ = this.target.position.z - this.config.distance;

    this.camera.position.x = dampTowards(
      this.camera.position.x,
      desiredX,
      this.config.xSmoothing,
      deltaSeconds
    );
    this.camera.position.y = dampTowards(
      this.camera.position.y,
      desiredY,
      this.config.ySmoothing,
      deltaSeconds
    );
    this.camera.position.z = dampTowards(
      this.camera.position.z,
      desiredZ,
      this.config.zSmoothing,
      deltaSeconds
    );

    this.camera.setTarget(
      new Vector3(
        this.target.position.x,
        this.target.position.y + 1,
        this.target.position.z + this.config.lookAhead
      )
    );
  }
}
