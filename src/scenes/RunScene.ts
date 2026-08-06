import type { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";

import { MaterialsRegistry } from "../assets/MaterialsRegistry";
import type { PlayerAssetLoader } from "../assets/PlayerAssetLoader";
import { WORLD_VISUAL_CONFIG } from "../config/visual/world-visual.config";
import type { PlayerCameraTargetSnapshot } from "../contracts/player-camera-target.contract";
import type { PlayerColliderSnapshot } from "../contracts/player-collider.contract";
import type { PlayerRigContract } from "../contracts/player-rig.contract";
import type { PlayerVisualSnapshot } from "../contracts/player-visual.contract";
import type { TrackManager } from "../world/track/TrackManager";
import { PlayerRig } from "../player/PlayerRig";
import { DebugHud } from "../ui/debug/DebugHud";
import { WorldController } from "../world/WorldController";
import { RunnerCameraController } from "../world/camera/RunnerCameraController";
import { PlayerVisualController } from "../world/player/PlayerVisualController";

export class RunScene {
  private scene!: Scene;
  private worldController!: WorldController;
  private cameraController!: RunnerCameraController;
  private playerVisual!: PlayerVisualController;
  private playerRig!: PlayerRig;
  private playerAssetLoader!: PlayerAssetLoader;
  private debugHud!: DebugHud;
  private materials!: MaterialsRegistry;
  private fpsFrames = 0;
  private fpsTime = 0;
  private currentFps = 60;
  private isPlayerRigDebugVisible = false;

  create(engine: Engine, loader: PlayerAssetLoader): Scene {
    this.scene = new Scene(engine);
    this.scene.skipPointerMovePicking = true;
    this.materials = new MaterialsRegistry(this.scene);
    this.playerAssetLoader = loader;
    this.playerAssetLoader.setScene(this.scene);

    this.worldController = new WorldController(this.scene, this.materials);
    this.worldController.build();

    this.playerRig = new PlayerRig(this.scene, {
      parent: this.worldController.root,
      groundY: WORLD_VISUAL_CONFIG.trackThickness,
      cameraTargetYOffset: WORLD_VISUAL_CONFIG.cameraTargetYOffset
    });

    this.playerVisual = new PlayerVisualController(
      this.scene,
      this.materials,
      this.playerRig,
      this.playerAssetLoader
    );

    this.cameraController = new RunnerCameraController(this.scene);
    this.cameraController.initialize(this.playerVisual.getCheckerboardMesh());

    for (const mesh of this.playerVisual.getShadowMeshes()) {
      this.worldController.lighting.addShadowCaster(mesh);
    }

    this.debugHud = new DebugHud();
    return this.scene;
  }

  async startAssetLoad(): Promise<void> {
    await Promise.all([
      this.worldController.startAssetLoad(),
      this.playerVisual.startModelLoad()
    ]);

    if (this.playerVisual.isModelLoaded) {
      for (const mesh of this.playerVisual.getShadowMeshes()) {
        this.worldController.lighting.addShadowCaster(mesh);
      }
    }
  }

  update(
    deltaSeconds: number,
    playerSnap: Readonly<PlayerVisualSnapshot>,
    colliderSnap: Readonly<PlayerColliderSnapshot>,
    cameraSnap: Readonly<PlayerCameraTargetSnapshot>,
    speed: number
  ): void {
    this.playerRig.applyGameplayState(playerSnap, colliderSnap);
    this.playerVisual.applySnapshot(playerSnap);
    this.playerVisual.update(deltaSeconds);
    this.worldController.update(deltaSeconds, speed);

    this.cameraController.update(deltaSeconds, {
      targetX: cameraSnap.targetX,
      targetY: cameraSnap.targetY,
      playerState: playerSnap.state
    });

    this.fpsFrames += 1;
    this.fpsTime += deltaSeconds;
    if (this.fpsTime >= WORLD_VISUAL_CONFIG.debugHudRefreshSeconds) {
      this.currentFps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;

      this.debugHud.update(
        this.currentFps,
        playerSnap,
        this.scene.getActiveMeshes().length,
        {
          catLoaded: this.playerVisual.catAssetLoaded,
          boardLoaded: this.playerVisual.boardAssetLoaded,
          isModelFull: this.playerVisual.isModelLoaded,
          catState: this.playerAssetLoader.getLoadState("player.cat"),
          boardState: this.playerAssetLoader.getLoadState("player.skateboard")
        },
        this.worldController.trackManager.getDebugStats()
      );
    }
  }

  reset(): void {
    this.playerRig.reset();
    this.playerVisual.reset();
    this.cameraController.reset();
    this.worldController.reset();
  }

  getTrackManager(): TrackManager {
    return this.worldController.trackManager;
  }

  applyCosmetics(catColor: string, boardColor: string): void {
    this.playerVisual.applyCosmetics(catColor, boardColor);
  }

  addCameraImpact(amount: number): void {
    this.cameraController.addImpact(amount);
  }

  toggleDebugHud(): void {
    this.debugHud.toggle();
  }

  togglePlayerRigDebug(): void {
    this.isPlayerRigDebugVisible = !this.isPlayerRigDebugVisible;
    this.playerRig.setDebugVisible(this.isPlayerRigDebugVisible);
  }

  getPlayerRig(): PlayerRigContract {
    return this.playerRig;
  }

  dispose(): void {
    this.debugHud.dispose();
    this.playerVisual.dispose();
    this.playerRig.dispose();
    this.cameraController.dispose();
    this.worldController.dispose();
    this.materials.dispose();
    this.playerAssetLoader.dispose();
    this.scene.dispose();
  }

  getScene(): Scene {
    return this.scene;
  }
}
