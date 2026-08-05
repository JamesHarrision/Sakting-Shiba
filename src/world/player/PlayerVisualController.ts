import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { Scene } from "@babylonjs/core/scene";

import type { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import type { PlayerAssetLoader } from "../../assets/PlayerAssetLoader";
import { PLAYER_MODEL_CONFIG } from "../../config/visual/player-model.config";
import type { PlayerRigContract } from "../../contracts/player-rig.contract";
import type { PlayerVisualSnapshot } from "../../contracts/player-visual.contract";
import { PlayerModelView } from "../../player/visual/PlayerModelView";
import { LandingDustEffect } from "../../vfx/LandingDustEffect";
import { PlayerBlobShadow } from "../../vfx/PlayerBlobShadow";
import { ProceduralPlayer } from "./ProceduralPlayer";

const CFG = PLAYER_MODEL_CONFIG;
const RUN_BOB_SPEED = 8;
const RUN_BOB_AMOUNT = 0.035;
const LEAN_SPEED = 10;
const BOARD_TILT_SPEED = 12;
const SQUASH_RECOVER_SPEED = 14;

export class PlayerVisualController {
  readonly player: ProceduralPlayer;
  readonly modelView: PlayerModelView;

  private readonly blobShadow: PlayerBlobShadow;
  private readonly dustEffect: LandingDustEffect;
  private modelLoadPromise?: Promise<void>;
  private currentBob = 0;
  private state: PlayerVisualSnapshot = {
    positionX: 0,
    positionY: 0,
    verticalVelocity: 0,
    state: "running",
    horizontalDirection: 0,
    laneIndex: 1,
    isGrounded: true,
    isCrouching: false,
    crouchProgress: 0
  };
  private wasAirborne = false;
  private currentLean = 0;
  private currentTilt = 0;
  private squatScale = 1;
  private catLoaded = false;
  private boardLoaded = false;
  private disposed = false;

  constructor(
    scene: Scene,
    materials: MaterialsRegistry,
    private readonly playerRig: PlayerRigContract,
    loader: PlayerAssetLoader
  ) {
    this.player = new ProceduralPlayer(scene, materials);
    this.player.root.parent = playerRig.nodes.importedVisualContainer;
    this.player.root.position.set(0, 0, 0);

    this.modelView = new PlayerModelView(
      scene,
      loader,
      playerRig.nodes.catMount,
      playerRig.nodes.boardMount
    );
    this.modelView.hideModels();

    this.blobShadow = new PlayerBlobShadow(scene, playerRig.nodes.shadowAnchor);
    this.dustEffect = new LandingDustEffect(scene, playerRig.nodes.effectAnchor);
    this.playerRig.setVisualLoadState("fallback");
  }

  startModelLoad(): Promise<void> {
    if (this.disposed) {
      return Promise.resolve();
    }
    if (this.modelLoadPromise) {
      return this.modelLoadPromise;
    }

    this.playerRig.setVisualLoadState("loading");
    this.modelLoadPromise = this.modelView.loadAssets().then((fullyLoaded) => {
      if (this.disposed) return;
      this.catLoaded = this.modelView.catLoaded;
      this.boardLoaded = this.modelView.boardLoaded;

      if (fullyLoaded) {
        this.player.setEnabled(false);
        this.modelView.showModels();
        this.playerRig.setVisualLoadState("loaded");
      } else {
        this.modelView.hideModels();
        this.player.setEnabled(true);
        this.playerRig.setVisualLoadState("fallback");
      }
    });

    return this.modelLoadPromise;
  }

  get isModelLoaded(): boolean {
    return this.modelView.isFullyLoaded;
  }

  get catAssetLoaded(): boolean {
    return this.catLoaded;
  }

  get boardAssetLoaded(): boolean {
    return this.boardLoaded;
  }

  getCheckerboardMesh(): Mesh {
    return this.player.boardDeck;
  }

  getShadowMeshes(): readonly AbstractMesh[] {
    return this.isModelLoaded ? this.modelView.allMeshes : this.player.meshes;
  }

  applySnapshot(snapshot: Readonly<PlayerVisualSnapshot>): void {
    this.state = snapshot;
    this.blobShadow.update(snapshot.positionY);
  }

  update(deltaSeconds: number): void {
    const dt = Math.min(deltaSeconds, 0.1);
    this.dustEffect.update(dt, this.state.positionY);

    switch (this.state.state) {
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
    this.player.catBody.position.y = 0.85;
    this.player.catBody.scaling.set(1, 1.3, 1);
    this.player.catHead.position.y = 1.5;
    this.player.boardRoot.rotation.set(0, 0, 0);

    this.modelView.boardMount.position.set(0, 0, 0);
    this.modelView.boardMount.rotation.set(0, 0, 0);
    this.modelView.boardMount.scaling.setAll(1);
    this.modelView.catMount.position.set(0, CFG.catSeatHeight, 0);
    this.modelView.catMount.rotation.set(0, 0, 0);
    this.modelView.catMount.scaling.setAll(1);

    this.currentLean = 0;
    this.currentTilt = 0;
    this.squatScale = 1;
    this.currentBob = 0;
    this.wasAirborne = false;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.modelView.dispose();
    this.player.dispose();
    this.blobShadow.dispose();
    this.dustEffect.dispose();
  }

  private get visualRoot(): TransformNode {
    return this.playerRig.nodes.visualRoot;
  }

  private animateRunning(dt: number): void {
    this.recoverToNeutral(dt);
    this.currentBob += dt * RUN_BOB_SPEED;
    const bob = Math.sin(this.currentBob) * RUN_BOB_AMOUNT;

    if (this.isModelLoaded) {
      this.modelView.catMount.position.y = CFG.catSeatHeight + bob;
      this.modelView.boardMount.rotation.x = Math.sin(this.currentBob * 1.5) * 0.015;
    } else {
      this.player.catBody.position.y = 0.85 + bob;
      this.player.catHead.position.y = 1.5 + bob;
      this.player.boardRoot.rotation.x = Math.sin(this.currentBob * 1.5) * 0.015;
    }

    if (this.wasAirborne) {
      this.triggerLanding();
    }
    this.wasAirborne = false;
  }

  private animateLaneSwitch(dt: number): void {
    this.recoverPose(dt);
    const targetLean = this.state.horizontalDirection * CFG.leanAngleDegrees;
    this.currentLean = this.smoothTo(this.currentLean, targetLean, LEAN_SPEED, dt);
    this.visualRoot.rotation.z = (this.currentLean * Math.PI) / 180;
    this.visualRoot.rotation.y = (this.currentLean * Math.PI) / 360;
  }

  private animateJumping(dt: number): void {
    this.wasAirborne = true;
    this.recoverBodyPosition(dt);
    this.currentLean = this.smoothTo(this.currentLean, 0, LEAN_SPEED, dt);
    this.visualRoot.rotation.z = (this.currentLean * Math.PI) / 180;

    const goingUp = this.state.verticalVelocity > 0;
    const targetTilt = goingUp ? -CFG.jumpPitchDegrees : CFG.jumpPitchDegrees * 0.6;
    this.currentTilt = this.smoothTo(this.currentTilt, targetTilt, BOARD_TILT_SPEED, dt);
    const compressTarget = goingUp ? 0.92 : 1;
    this.squatScale = this.smoothTo(this.squatScale, compressTarget, 10, dt);

    if (this.isModelLoaded) {
      this.modelView.boardMount.rotation.x = (this.currentTilt * Math.PI) / 180;
      this.modelView.catMount.scaling.y = this.squatScale;
    } else {
      this.player.boardRoot.rotation.x = (this.currentTilt * Math.PI) / 180;
      this.player.catBody.scaling.y = 1.3 * this.squatScale;
    }
  }

  private animateCrouching(dt: number): void {
    this.squatScale = this.smoothTo(this.squatScale, CFG.crouchScaleY, 10, dt);

    if (this.isModelLoaded) {
      this.modelView.catMount.scaling.y = this.squatScale;
      const targetY = CFG.boardDeckHeight + CFG.catFootOffset * this.squatScale;
      this.modelView.catMount.position.y = this.smoothTo(
        this.modelView.catMount.position.y,
        targetY,
        12,
        dt
      );
    } else {
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
    }

    this.recoverRotationToNeutral(dt);
  }

  private animateDead(dt: number): void {
    this.currentLean = this.smoothTo(this.currentLean, 0, 4, dt);
    this.visualRoot.rotation.z = (this.currentLean * Math.PI) / 180;
    this.visualRoot.rotation.y += dt * 3;
  }

  private triggerLanding(): void {
    this.currentTilt = 0;
    this.squatScale = CFG.landingSquashAmount;
    if (this.isModelLoaded) {
      this.modelView.boardMount.rotation.x = 0;
    } else {
      this.player.boardRoot.rotation.x = 0;
    }
    this.dustEffect.trigger();
  }

  private recoverToNeutral(dt: number): void {
    this.recoverRotationToNeutral(dt);
    this.recoverPose(dt);
  }

  private recoverRotationToNeutral(dt: number): void {
    this.currentLean = this.smoothTo(this.currentLean, 0, LEAN_SPEED * 0.6, dt);
    this.visualRoot.rotation.z = (this.currentLean * Math.PI) / 180;
    this.visualRoot.rotation.y =
      (this.smoothTo(
        (this.visualRoot.rotation.y * 180) / Math.PI,
        0,
        LEAN_SPEED * 0.4,
        dt
      ) *
        Math.PI) /
      180;

    this.currentTilt = this.smoothTo(this.currentTilt, 0, BOARD_TILT_SPEED * 0.7, dt);
    if (this.isModelLoaded) {
      this.modelView.boardMount.rotation.x = (this.currentTilt * Math.PI) / 180;
    } else {
      this.player.boardRoot.rotation.x = (this.currentTilt * Math.PI) / 180;
    }
  }

  private recoverPose(dt: number): void {
    this.squatScale = this.smoothTo(this.squatScale, 1, SQUASH_RECOVER_SPEED, dt);
    if (this.isModelLoaded) {
      this.modelView.catMount.scaling.y = this.squatScale;
    } else {
      this.player.catBody.scaling.y = 1.3 * this.squatScale;
    }
    this.recoverBodyPosition(dt);
  }

  private recoverBodyPosition(dt: number): void {
    if (this.isModelLoaded) {
      this.modelView.catMount.position.y = this.smoothTo(
        this.modelView.catMount.position.y,
        CFG.catSeatHeight,
        SQUASH_RECOVER_SPEED,
        dt
      );
    } else {
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
  }

  private smoothTo(current: number, target: number, speed: number, dt: number): number {
    const blend = 1 - Math.exp(-speed * dt);
    return current + (target - current) * blend;
  }
}
