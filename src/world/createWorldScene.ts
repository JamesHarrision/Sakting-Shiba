import { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import { Engine } from "@babylonjs/core/Engines/engine";
import { HemisphericLight } from "@babylonjs/core/Lights/hemisphericLight";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { Scene } from "@babylonjs/core/scene";

import { LANE_X_POSITIONS } from "../config/gameplay/gameplayConfig";

export function createWorldScene(engine: Engine): Scene {
  const scene = new Scene(engine);
  scene.clearColor.set(0.54, 0.73, 0.9, 1);

  const camera = new FreeCamera("follow-camera", new Vector3(0, 4.6, -9), scene);
  camera.setTarget(new Vector3(0, 1.2, 10));
  camera.fov = 0.8;

  const light = new HemisphericLight("sun-fill", new Vector3(0.25, 1, 0.2), scene);
  light.intensity = 0.9;

  const groundMaterial = new StandardMaterial("ground-material", scene);
  groundMaterial.diffuseColor = new Color3(0.23, 0.26, 0.24);

  const ground = MeshBuilder.CreateGround(
    "m0-ground",
    { width: 11, height: 80, subdivisions: 1 },
    scene
  );
  ground.position.z = 20;
  ground.material = groundMaterial;

  const laneMaterial = new StandardMaterial("lane-marker-material", scene);
  laneMaterial.diffuseColor = new Color3(0.94, 0.85, 0.46);

  for (const laneX of Object.values(LANE_X_POSITIONS)) {
    const marker = MeshBuilder.CreateBox(
      `lane-marker-${laneX}`,
      { width: 0.06, height: 0.02, depth: 76 },
      scene
    );
    marker.position.set(laneX, 0.02, 20);
    marker.material = laneMaterial;
  }

  const playerMaterial = new StandardMaterial("player-debug-material", scene);
  playerMaterial.diffuseColor = new Color3(0.98, 0.46, 0.28);

  const playerCube = MeshBuilder.CreateBox(
    "m0-player-debug-cube",
    { width: 1.1, height: 1.35, depth: 1.35 },
    scene
  );
  playerCube.position.set(LANE_X_POSITIONS[1], 0.72, 0);
  playerCube.material = playerMaterial;

  const boardMaterial = new StandardMaterial("board-debug-material", scene);
  boardMaterial.diffuseColor = new Color3(0.12, 0.16, 0.22);

  const board = MeshBuilder.CreateBox(
    "m0-skateboard-debug",
    { width: 1.45, height: 0.16, depth: 2.1 },
    scene
  );
  board.position.set(LANE_X_POSITIONS[1], 0.12, 0);
  board.material = boardMaterial;

  return scene;
}
