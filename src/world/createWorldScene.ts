import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { DirectionalLight } from "@babylonjs/core/Lights/directionalLight";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { Scene } from "@babylonjs/core/scene";

import { LANE_X_POSITIONS } from "../config/gameplay/gameplayConfig";
import { CameraFollowController } from "./cameraFollow";

export function createWorldScene(engine: Engine): Scene {
  const scene = new Scene(engine);
  const fogColor = new Color3(0.92, 0.95, 1);
  scene.clearColor.set(fogColor.r, fogColor.g, fogColor.b, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogColor = fogColor;
  scene.fogDensity = 0.015;

  const playerRoot = new TransformNode("m1-player-root", scene);
  playerRoot.position.set(LANE_X_POSITIONS[1], 0, 0);

  const camera = new FreeCamera("follow-camera", new Vector3(0, 4.8, -8.75), scene);
  camera.fov = 0.78;
  camera.minZ = 0.1;
  camera.maxZ = 200;
  camera.setTarget(new Vector3(0, 1.2, 10));

  const keyLight = new DirectionalLight("sun-key", new Vector3(-0.35, -1, 0.45), scene);
  keyLight.position = new Vector3(10, 18, -12);
  keyLight.intensity = 1.1;

  const fillLight = new HemisphericLight("sun-fill", new Vector3(0.1, 1, -0.15), scene);
  fillLight.intensity = 0.55;

  const groundMaterial = new StandardMaterial("ground-material", scene);
  groundMaterial.diffuseColor = new Color3(0.95, 0.97, 1);
  groundMaterial.specularColor = new Color3(0.04, 0.04, 0.04);

  const ground = MeshBuilder.CreateGround(
    "m1-ground",
    { width: 11.5, height: 96, subdivisions: 1 },
    scene
  );
  ground.position.z = 22;
  ground.material = groundMaterial;

  const laneMaterial = new StandardMaterial("lane-marker-material", scene);
  laneMaterial.diffuseColor = new Color3(0.67, 0.71, 0.82);
  laneMaterial.alpha = 0.7;

  for (const laneX of Object.values(LANE_X_POSITIONS)) {
    const marker = MeshBuilder.CreateBox(
      `lane-marker-${laneX}`,
      { width: 0.08, height: 0.015, depth: 92 },
      scene
    );
    marker.position.set(laneX, 0.01, 22);
    marker.material = laneMaterial;
  }

  const playerMaterial = new StandardMaterial("player-debug-material", scene);
  playerMaterial.diffuseColor = new Color3(0.96, 0.52, 0.28);
  playerMaterial.specularColor = new Color3(0.06, 0.06, 0.06);

  const playerCube = MeshBuilder.CreateBox(
    "m1-player-debug-cube",
    { width: 1.05, height: 1.45, depth: 1.1 },
    scene
  );
  playerCube.position.set(0, 0.9, 0);
  playerCube.material = playerMaterial;
  playerCube.parent = playerRoot;

  const boardMaterial = new StandardMaterial("board-debug-material", scene);
  boardMaterial.diffuseColor = new Color3(0.14, 0.18, 0.28);
  boardMaterial.specularColor = new Color3(0.04, 0.04, 0.04);

  const board = MeshBuilder.CreateBox(
    "m1-skateboard-debug",
    { width: 1.5, height: 0.14, depth: 2.15 },
    scene
  );
  board.position.set(0, 0.14, 0);
  board.material = boardMaterial;
  board.parent = playerRoot;

  const shadowMaterial = new StandardMaterial("player-shadow-material", scene);
  shadowMaterial.diffuseColor = new Color3(0.08, 0.1, 0.14);
  shadowMaterial.alpha = 0.22;
  shadowMaterial.specularColor = Color3.Black();

  const shadow = MeshBuilder.CreateCylinder(
    "m1-player-shadow",
    { diameter: 1.7, height: 0.02, tessellation: 24 },
    scene
  );
  shadow.position.set(0, 0.02, 0.15);
  shadow.scaling.z = 1.45;
  shadow.material = shadowMaterial;
  shadow.parent = playerRoot;

  const cameraFollow = new CameraFollowController(camera, playerRoot, {
    height: 4.8,
    distance: 8.75,
    lookAhead: 12,
    xSmoothing: 8,
    ySmoothing: 6,
    zSmoothing: 6
  });

  scene.onBeforeRenderObservable.add(() => {
    const deltaSeconds = engine.getDeltaTime() / 1000;
    cameraFollow.update(deltaSeconds);
  });

  scene.metadata = {
    playerRoot,
    playerCube,
    board,
    shadow
  };

  return scene;
}
