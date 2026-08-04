import type { Engine } from "@babylonjs/core/Engines/engine";
import { Scene } from "@babylonjs/core/scene";
import { MaterialsRegistry } from "../assets/MaterialsRegistry";
import { WorldController } from "../world/WorldController";
import { RunnerCameraController } from "../world/camera/RunnerCameraController";
import { PlayerVisualController } from "../world/player/PlayerVisualController";
import { DebugHud } from "../ui/debug/DebugHud";
import type { PlayerVisualSnapshot } from "../contracts/player-visual.contract";
import type { GameEventBus } from "../events/GameEventBus";
import { LANE_X_POSITIONS } from "../config/gameplay/gameplayConfig";

export class RunScene {
  private scene!: Scene;
  private worldController!: WorldController;
  private cameraController!: RunnerCameraController;
  private playerVisual!: PlayerVisualController;
  private debugHud!: DebugHud;
  private materials!: MaterialsRegistry;
  private fpsFrames = 0;
  private fpsTime = 0;
  private currentFps = 60;
  private cleanups: (() => void)[] = [];

  async create(engine: Engine, eventBus: GameEventBus): Promise<Scene> {
    this.scene = new Scene(engine);
    this.materials = new MaterialsRegistry(this.scene);

    // Build world
    this.worldController = new WorldController(this.scene, this.materials);
    this.worldController.build();

    // Player visual
    this.playerVisual = new PlayerVisualController(this.scene, this.materials);
    this.playerVisual.player.root.parent = this.worldController.root;

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

    // Listen to events from Gameplay Agent
    this.cleanups.push(
      eventBus.on("PLAYER_STATE_CHANGED", ({ from, to }) => {
        // Visual state updates handled via snapshot in update()
      }),
      eventBus.on("LANE_CHANGED", ({ from, to }) => {
        // Visual feedback via snapshot
      }),
      eventBus.on("PLAYER_JUMPED", () => {}),
      eventBus.on("PLAYER_LANDED", () => {}),
    );

    return this.scene;
  }

  update(deltaSeconds: number, playerSnap: PlayerVisualSnapshot): void {
    // Update player visual
    const prevLane = this.playerVisual.player.root.position.x;
    if (playerSnap.positionX !== prevLane) {
      playerSnap.horizontalDirection = playerSnap.positionX > prevLane ? 1 : playerSnap.positionX < prevLane ? -1 : 0;
    }
    this.playerVisual.applySnapshot(playerSnap);
    this.playerVisual.update(deltaSeconds);

    // Update camera
    this.cameraController.update(deltaSeconds, {
      targetX: playerSnap.positionX,
      targetY: playerSnap.positionY,
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
    this.debugHud.update(this.currentFps, playerSnap, activeMeshes, 0);
  }

  reset(initialLaneX: number = LANE_X_POSITIONS[1]): void {
    this.playerVisual.reset();
    this.cameraController.reset();
  }

  dispose(): void {
    for (const cleanup of this.cleanups) {
      cleanup();
    }
    this.cleanups = [];
    this.debugHud.dispose();
    this.playerVisual.dispose();
    this.cameraController.dispose();
    this.worldController.dispose();
    this.materials.dispose();
    this.scene.dispose();
  }

  getScene(): Scene {
    return this.scene;
  }
}
