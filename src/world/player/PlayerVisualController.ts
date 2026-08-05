import type { Scene } from "@babylonjs/core/scene";
import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import type { MaterialsRegistry } from "../../assets/MaterialsRegistry";
import type { PlayerVisualSnapshot } from "../../contracts/player-visual.contract";
import type { PlayerAssetLoader } from "../../assets/PlayerAssetLoader";
import { ProceduralPlayer } from "./ProceduralPlayer";
import { PlayerModelView } from "../../player/visual/PlayerModelView";
import { PlayerBlobShadow } from "../../vfx/PlayerBlobShadow";
import { LandingDustEffect } from "../../vfx/LandingDustEffect";
import { PLAYER_MODEL_CONFIG } from "../../config/visual/player-model.config";
import { PLAYER_ASSET_IDS, type PlayerAssetId } from "../../assets/AssetRegistry";

const CFG = PLAYER_MODEL_CONFIG;
const RUN_BOB_SPEED = 8;
const RUN_BOB_AMOUNT = 0.035;
const LEAN_SPEED = 10;
const BOARD_TILT_SPEED = 12;
const SQUASH_RECOVER_SPEED = 14;

export class PlayerVisualController {
  /** Procedural fallback player (always available) */
  readonly player: ProceduralPlayer;
  /** Real model view (null until loaded) */
  readonly modelView: PlayerModelView;

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
    isCrouching: false,
  };
  private wasAirborne = false;
  private currentLean = 0;
  private currentTilt = 0;
  private squatScale = 1;

  private modelLoadStarted = false;
  private catLoaded = false;
  private boardLoaded = false;

  constructor(
    scene: Scene,
    materials: MaterialsRegistry,
    gameplayRoot: TransformNode,
    loader: PlayerAssetLoader,
  ) {
    // Procedural fallback
    this.player = new ProceduralPlayer(scene, materials);
    this.player.root.parent = gameplayRoot;
    this.player.root.position.set(0, 0, 0);

    // Real model view pipeline
    this.modelView = new PlayerModelView(scene, loader, gameplayRoot);
    // Hide model view until loaded
    this.modelView.hideModels();

    // Blob shadow & dust are always on gameplayRoot
    this.blobShadow = new PlayerBlobShadow(scene, gameplayRoot);
    this.dustEffect = new LandingDustEffect(scene, gameplayRoot);
  }

  /** Start async model load. Call after construction. Falls back gracefully. */
  startModelLoad(): void {
    if (this.modelLoadStarted) return;
    this.modelLoadStarted = true;

    this.modelView.loadAssets().then(() => {
      this.catLoaded = this.modelView.catLoaded;
      this.boardLoaded = this.modelView.boardLoaded;

      if (this.modelView.isFullyLoaded) {
        this.player.setEnabled(false);
        this.modelView.showModels();
      }
    }).catch(() => {
      // Fallback remains active
    });
  }

  get isModelLoaded(): boolean {
    return this.modelView.isFullyLoaded;
  }

  getLoadStates(): Record<string, { cat: boolean; board: boolean }> {
    return {
      [PLAYER_ASSET_IDS.cat]: { cat: this.catLoaded, board: this.boardLoaded },
    };
  }

  get catAssetLoaded(): boolean {
    return this.catLoaded;
  }
  get boardAssetLoaded(): boolean {
    return this.boardLoaded;
  }

  /** Mesh used for camera checkerboard (prevents flicker). Must always exist. */
  getCheckerboardMesh(): Mesh {
    return this.isModelLoaded
      ? (this.modelView.boardMeshes[0] as Mesh) ?? this.player.boardDeck
      : this.player.boardDeck;
  }

  /** Meshes eligible for shadow casting */
  getShadowMeshes(): readonly AbstractMesh[] {
    if (this.isModelLoaded) {
      const meshes: AbstractMesh[] = [];
      // Cast shadow from main cat mesh + board
      for (const m of this.modelView.catMeshes) {
        if (m.name.toLowerCase().includes("body") || m.name.toLowerCase().includes("cat")) {
          meshes.push(m);
        }
      }
      for (const m of this.modelView.boardMeshes) {
        meshes.push(m);
      }
      // Fallback to first mesh if none matched
      if (meshes.length === 0) {
        return [...this.modelView.allMeshes];
      }
      return meshes;
    }
    return this.player.meshes;
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
    // Reset procedural
    this.player.root.position.set(0, 0, 0);
    this.player.root.rotation.set(0, 0, 0);
    this.player.catBody.scaling.set(1, 1.3, 1);
    this.player.boardDeck.rotation.set(0, 0, 0);

    // Reset model view
    this.modelView.boardMount.rotation.set(0, 0, 0);
    this.modelView.catMount.rotation.set(0, 0, 0);

    this.currentLean = 0;
    this.currentTilt = 0;
    this.squatScale = 1;
    this.currentBob = 0;
    this.wasAirborne = false;
  }

  dispose(): void {
    this.modelView.dispose();
    this.player.dispose();
    this.blobShadow.dispose();
    this.dustEffect.dispose();
  }

  // ─── animation targets ────────────────────────────────────

  /** The board mount node to apply board animations to */
  private get boardTarget(): TransformNode {
    return this.isModelLoaded ? this.modelView.boardMount : this.player.root;
  }

  /** The cat mount / visual root for lean animations */
  private get visualRoot(): TransformNode {
    return this.isModelLoaded ? this.modelView.boardMount : this.player.root;
  }

  /** The cat body node for squash/bob */
  private get catBodyTarget(): TransformNode {
    return this.isModelLoaded ? this.modelView.catMount : this.player.catBody;
  }

  private get catHeadTarget(): TransformNode | null {
    return this.isModelLoaded ? null : this.player.catHead;
  }

  // ─── animations ────────────────────────────────────────────

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
      this.player.boardDeck.rotation.x = Math.sin(this.currentBob * 1.5) * 0.015;
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

    if (this.isModelLoaded) {
      this.modelView.boardMount.rotation.x = (this.currentTilt * Math.PI) / 180;
      const compressTarget = goingUp ? 0.92 : 1.0;
      this.squatScale = this.smoothTo(this.squatScale, compressTarget, 10, dt);
      this.modelView.catMount.scaling.y = this.squatScale;
    } else {
      this.player.boardDeck.rotation.x = (this.currentTilt * Math.PI) / 180;
      const compressTarget = goingUp ? 0.92 : 1.0;
      this.squatScale = this.smoothTo(this.squatScale, compressTarget, 10, dt);
      this.player.catBody.scaling.y = 1.3 * this.squatScale;
    }
  }

  private animateCrouching(dt: number): void {
    this.squatScale = this.smoothTo(this.squatScale, CFG.crouchScaleY, 10, dt);

    if (this.isModelLoaded) {
      this.modelView.catMount.scaling.y = this.squatScale;
      this.modelView.catMount.position.y = this.smoothTo(
        this.modelView.catMount.position.y,
        CFG.catSeatHeight * 0.55,
        12, dt,
      );
    } else {
      this.player.catBody.scaling.y = 1.3 * this.squatScale;
      this.player.catBody.position.y = this.smoothTo(
        this.player.catBody.position.y, 0.55, 12, dt,
      );
      this.player.catHead.position.y = this.smoothTo(
        this.player.catHead.position.y, 0.97, 12, dt,
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
      this.player.boardDeck.rotation.x = 0;
    }
    this.dustEffect.trigger();
  }

  // ─── recovery ──────────────────────────────────────────────

  private recoverToNeutral(dt: number): void {
    this.recoverRotationToNeutral(dt);
    this.recoverPose(dt);
  }

  private recoverRotationToNeutral(dt: number): void {
    this.currentLean = this.smoothTo(this.currentLean, 0, LEAN_SPEED * 0.6, dt);
    this.visualRoot.rotation.z = (this.currentLean * Math.PI) / 180;
    this.visualRoot.rotation.y = this.smoothTo(
      this.visualRoot.rotation.y * 180 / Math.PI, 0, LEAN_SPEED * 0.4, dt,
    ) * Math.PI / 180;

    this.currentTilt = this.smoothTo(this.currentTilt, 0, BOARD_TILT_SPEED * 0.7, dt);
    if (this.isModelLoaded) {
      this.modelView.boardMount.rotation.x = (this.currentTilt * Math.PI) / 180;
    } else {
      this.player.boardDeck.rotation.x = (this.currentTilt * Math.PI) / 180;
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
        SQUASH_RECOVER_SPEED, dt,
      );
    } else {
      this.player.catBody.position.y = this.smoothTo(
        this.player.catBody.position.y, 0.85, SQUASH_RECOVER_SPEED, dt,
      );
      this.player.catHead.position.y = this.smoothTo(
        this.player.catHead.position.y, 1.5, SQUASH_RECOVER_SPEED, dt,
      );
    }
  }

  private smoothTo(current: number, target: number, speed: number, dt: number): number {
    const blend = 1 - Math.exp(-speed * dt);
    return current + (target - current) * blend;
  }
}
