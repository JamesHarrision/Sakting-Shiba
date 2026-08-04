import type { Engine } from "@babylonjs/core/Engines/engine";
import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";
import { MaterialsRegistry } from "../assets/MaterialsRegistry";
import { WorldController } from "../world/WorldController";
import { RunnerCameraController } from "../world/camera/RunnerCameraController";
import { PlayerVisualController } from "../world/player/PlayerVisualController";
import { DebugHud } from "../ui/debug/DebugHud";
import type { PlayerVisualSnapshot } from "../contracts/player-visual.contract";
import { LANE_X_POSITIONS } from "../config/gameplay/gameplayConfig";
import { WORLD_VISUAL_CONFIG } from "../config/visual/world-visual.config";

export class RunScene {
  private scene!: Scene;
  private worldController!: WorldController;
  private cameraController!: RunnerCameraController;
  private playerVisual!: PlayerVisualController;
  private playerRoot!: TransformNode;
  private playerCollider!: Mesh;
  private debugHud!: DebugHud;
  private materials!: MaterialsRegistry;
  private fpsFrames = 0;
  private fpsTime = 0;
  private currentFps = 60;

  create(engine: Engine): Scene {
    this.scene = new Scene(engine);
    this.materials = new MaterialsRegistry(this.scene);

    // Build world
    this.worldController = new WorldController(this.scene, this.materials);
    this.worldController.build();

    this.playerRoot = new TransformNode("player-root", this.scene);
    this.playerRoot.parent = this.worldController.root;
    this.playerRoot.position.set(
      LANE_X_POSITIONS[1],
      WORLD_VISUAL_CONFIG.trackThickness,
      0
    );

    this.playerCollider = MeshBuilder.CreateBox(
      "player-collider",
      { width: 0.9, height: 1.65, depth: 1.05 },
      this.scene
    );
    this.playerCollider.parent = this.playerRoot;
    this.playerCollider.position.y = 0.85;
    this.playerCollider.isVisible = false;
    this.playerCollider.isPickable = false;

    this.playerVisual = new PlayerVisualController(
      this.scene,
      this.materials,
      this.playerRoot
    );

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

  update(deltaSeconds: number, playerSnap: PlayerVisualSnapshot): void {
    this.playerRoot.position.x = playerSnap.positionX;
    this.playerRoot.position.y =
      WORLD_VISUAL_CONFIG.trackThickness + playerSnap.positionY;
    const colliderScaleY = playerSnap.isCrouching ? 0.55 : 1;
    this.playerCollider.scaling.y = colliderScaleY;
    this.playerCollider.position.y = 0.85 * colliderScaleY;

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
    this.debugHud.update(this.currentFps, playerSnap, activeMeshes);
  }

  reset(initialLaneX: number = LANE_X_POSITIONS[1]): void {
    this.playerRoot.position.set(
      initialLaneX,
      WORLD_VISUAL_CONFIG.trackThickness,
      0
    );
    this.playerVisual.reset();
    this.cameraController.reset();
  }

  toggleDebugHud(): void {
    this.debugHud.toggle();
  }

  dispose(): void {
    this.debugHud.dispose();
    this.playerVisual.dispose();
    this.playerCollider.dispose();
    this.playerRoot.dispose();
    this.cameraController.dispose();
    this.worldController.dispose();
    this.materials.dispose();
    this.scene.dispose();
  }

  getScene(): Scene {
    return this.scene;
  }
}
