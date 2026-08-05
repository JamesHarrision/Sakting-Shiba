import type { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { MaterialsRegistry } from "../assets/MaterialsRegistry";
import { WorldController } from "../world/WorldController";
import { RunnerCameraController } from "../world/camera/RunnerCameraController";
import { PlayerVisualController } from "../world/player/PlayerVisualController";
import { DebugHud } from "../ui/debug/DebugHud";
import type { PlayerVisualSnapshot } from "../contracts/player-visual.contract";
import type { PlayerColliderSnapshot } from "../contracts/player-collider.contract";
import type { PlayerCameraTargetSnapshot } from "../contracts/player-camera-target.contract";
import type { PlayerRigContract } from "../contracts/player-rig.contract";
import { PlayerRig } from "../player/PlayerRig";
import { WORLD_VISUAL_CONFIG } from "../config/visual/world-visual.config";

export class RunScene {
  private scene!: Scene;
  private worldController!: WorldController;
  private cameraController!: RunnerCameraController;
  private playerVisual!: PlayerVisualController;
  private playerRig!: PlayerRig;
  private debugHud!: DebugHud;
  private materials!: MaterialsRegistry;
  private fpsFrames = 0;
  private fpsTime = 0;
  private currentFps = 60;
  private isPlayerRigDebugVisible = false;

  create(engine: Engine): Scene {
    this.scene = new Scene(engine);
    this.materials = new MaterialsRegistry(this.scene);

    // Build world
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
      this.playerRig.nodes.importedVisualContainer
    );
    this.playerRig.setVisualLoadState("fallback");

    // Camera
    this.cameraController = new RunnerCameraController(this.scene);
    // Use the board deck as the "checkerboard" to prevent flicker
    this.cameraController.initialize(this.playerVisual.player.boardDeck);

    // Shadow casters
    for (const mesh of this.playerVisual.getShadowMeshes()) {
      this.worldController.lighting.addShadowCaster(mesh);
    }

    // Debug HUD
    this.debugHud = new DebugHud();

    return this.scene;
  }

  update(
    deltaSeconds: number,
    playerSnap: Readonly<PlayerVisualSnapshot>,
    colliderSnap: Readonly<PlayerColliderSnapshot>,
    cameraSnap: Readonly<PlayerCameraTargetSnapshot>
  ): void {
    this.playerRig.applyGameplayState(playerSnap, colliderSnap);

    this.playerVisual.applySnapshot(playerSnap);
    this.playerVisual.update(deltaSeconds);

    // Update camera
    this.cameraController.update(deltaSeconds, {
      targetX: cameraSnap.targetX,
      targetY: cameraSnap.targetY,
      playerState: playerSnap.state,
    });

    // FPS
    this.fpsFrames++;
    this.fpsTime += deltaSeconds;
    if (this.fpsTime >= 0.5) {
      this.currentFps = this.fpsFrames / this.fpsTime;
      this.fpsFrames = 0;
      this.fpsTime = 0;
    }

    // Debug HUD
    const activeMeshes = this.scene.meshes.filter(m => m.isEnabled()).length;
    this.debugHud.update(this.currentFps, playerSnap, activeMeshes);
  }

  reset(): void {
    this.playerRig.reset();
    this.playerVisual.reset();
    this.cameraController.reset();
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
    this.scene.dispose();
  }

  getScene(): Scene {
    return this.scene;
  }
}
