import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import type { PlayerVisualSnapshot } from "../../contracts/player-visual.contract";
import { ProceduralPlayer } from "./ProceduralPlayer";
import { PlayerBlobShadow } from "../../vfx/PlayerBlobShadow";
import { LandingDustEffect } from "../../vfx/LandingDustEffect";

const RUN_BOB_SPEED = 8;
const RUN_BOB_AMOUNT = 0.035;
const LEAN_MAX_DEG = 12;
const LEAN_SPEED = 10;
const BOARD_TILT_SPEED = 12;
const LANDING_SQUASH = 0.85;
const SQUASH_RECOVER_SPEED = 14;

export class PlayerVisualController {
  readonly player!: ProceduralPlayer;
  private readonly blobShadow: PlayerBlobShadow;
  private readonly dustEffect: LandingDustEffect;

  private currentBob = 0;
  private state: PlayerVisualSnapshot = {
    positionX: 0,
    positionY: 0,
    verticalVelocity: 0,
    state: "running",
    horizontalDirection: 0,
    laneIndex: 1,
    isGrounded: true,
    isCrouching: false
  };
  private wasAirborne = false;
  private currentLean = 0;
  private currentTilt = 0;
  private squatScale = 1;

  constructor(
    scene: Scene,
    materials: MaterialsRegistry,
    gameplayRoot: TransformNode
  ) {
    this.player = new ProceduralPlayer(scene, materials);
    this.player.root.parent = gameplayRoot;
    this.blobShadow = new PlayerBlobShadow(scene, gameplayRoot);
    this.dustEffect = new LandingDustEffect(scene, gameplayRoot);
    this.player.root.position.set(0, 0, 0);
  }

  applySnapshot(snap: PlayerVisualSnapshot): void {
    this.state = snap;
    this.blobShadow.update(snap.positionY);
  }

  update(deltaSeconds: number): void {
    const dt = Math.min(deltaSeconds, 0.1);
    const s = this.state;
    this.dustEffect.update(dt, s.positionY);

    switch (s.state) {
      case "running":
        this.animateRunning(dt);
        break;
      case "switching_lane":
        this.animateLaneSwitch(dt);
        break;
      case "jumping":
        this.animateJumping(dt);
        break;
      case "crouching":
        this.animateCrouching(dt);
        break;
      case "paused":
        break;
      case "hit":
      case "dead":
        this.animateDead(dt);
        break;
    }
  }

  reset(): void {
    this.player.root.position.set(0, 0, 0);
    this.player.root.rotation.set(0, 0, 0);
    this.player.catBody.scaling.set(1, 1.3, 1);
    this.player.boardRoot.rotation.set(0, 0, 0);
    this.currentLean = 0;
    this.currentTilt = 0;
    this.squatScale = 1;
    this.currentBob = 0;
    this.wasAirborne = false;
  }

  dispose(): void {
    this.player.dispose();
    this.blobShadow.dispose();
    this.dustEffect.dispose();
  }

  getShadowMeshes() {
    return this.player.meshes;
  }

  private animateRunning(dt: number): void {
    this.recoverToNeutral(dt);
    // Subtle bob
    this.currentBob += dt * RUN_BOB_SPEED;
    const bob = Math.sin(this.currentBob) * RUN_BOB_AMOUNT;
    this.player.catBody.position.y = 0.85 + bob;
    this.player.catHead.position.y = 1.5 + bob;
    this.player.boardRoot.rotation.x = Math.sin(this.currentBob * 1.5) * 0.015;

    // Check for landing
    if (this.wasAirborne) {
      this.triggerLanding();
    }
    this.wasAirborne = false;
  }

  private animateLaneSwitch(dt: number): void {
    this.recoverPose(dt);
    const targetLean = this.state.horizontalDirection * LEAN_MAX_DEG;
    this.currentLean = this.smoothTo(this.currentLean, targetLean, LEAN_SPEED, dt);
    this.player.root.rotation.z = (this.currentLean * Math.PI) / 180;
    this.player.root.rotation.y = (this.currentLean * Math.PI) / 360;
  }

  private animateJumping(dt: number): void {
    this.wasAirborne = true;
    this.recoverBodyPosition(dt);
    // Recover lean
    this.currentLean = this.smoothTo(this.currentLean, 0, LEAN_SPEED, dt);
    this.player.root.rotation.z = (this.currentLean * Math.PI) / 180;

    // Board tilt
    const goingUp = this.state.verticalVelocity > 0;
    const targetTilt = goingUp ? -8 : 5;
    this.currentTilt = this.smoothTo(this.currentTilt, targetTilt, BOARD_TILT_SPEED, dt);
    this.player.boardRoot.rotation.x = (this.currentTilt * Math.PI) / 180;

    // Slight compress on takeoff
    const compressTarget = goingUp ? 0.92 : 1.0;
    this.squatScale = this.smoothTo(this.squatScale, compressTarget, 10, dt);
    this.player.catBody.scaling.y = 1.3 * this.squatScale;
  }

  private animateCrouching(dt: number): void {
    this.squatScale = this.smoothTo(this.squatScale, 0.55, 10, dt);
    this.player.catBody.scaling.y = 1.3 * this.squatScale;
    this.player.catBody.position.y = this.smoothTo(
      this.player.catBody.position.y,
      0.55,
      12,
      dt
    );
    this.player.catHead.position.y = this.smoothTo(
      this.player.catHead.position.y,
      0.97,
      12,
      dt
    );
    this.recoverRotationToNeutral(dt);
  }

  private animateDead(dt: number): void {
    this.currentLean = this.smoothTo(this.currentLean, 0, 4, dt);
    this.player.root.rotation.z = (this.currentLean * Math.PI) / 180;
    this.player.root.rotation.y += dt * 3;
  }

  private triggerLanding(): void {
    this.currentTilt = 0;
    this.squatScale = LANDING_SQUASH;
    this.dustEffect.trigger();
  }

  private recoverToNeutral(dt: number): void {
    this.recoverRotationToNeutral(dt);
    this.recoverPose(dt);
  }

  private recoverRotationToNeutral(dt: number): void {
    this.currentLean = this.smoothTo(this.currentLean, 0, LEAN_SPEED * 0.6, dt);
    this.player.root.rotation.z = (this.currentLean * Math.PI) / 180;
    this.player.root.rotation.y = this.smoothTo(this.player.root.rotation.y * 180 / Math.PI, 0, LEAN_SPEED * 0.4, dt) * Math.PI / 180;

    // Recover tilt
    this.currentTilt = this.smoothTo(this.currentTilt, 0, BOARD_TILT_SPEED * 0.7, dt);
    this.player.boardRoot.rotation.x = (this.currentTilt * Math.PI) / 180;
  }

  private recoverPose(dt: number): void {
    this.squatScale = this.smoothTo(this.squatScale, 1, SQUASH_RECOVER_SPEED, dt);
    this.player.catBody.scaling.y = 1.3 * this.squatScale;
    this.recoverBodyPosition(dt);
  }

  private recoverBodyPosition(dt: number): void {
    this.player.catBody.position.y = this.smoothTo(
      this.player.catBody.position.y,
      0.85,
      SQUASH_RECOVER_SPEED,
      dt
    );
    this.player.catHead.position.y = this.smoothTo(
      this.player.catHead.position.y,
      1.5,
      SQUASH_RECOVER_SPEED,
      dt
    );
  }

  private smoothTo(current: number, target: number, speed: number, dt: number): number {
    const blend = 1 - Math.exp(-speed * dt);
    return current + (target - current) * blend;
  }
}
