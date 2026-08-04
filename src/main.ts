import { Engine } from "@babylonjs/core/Engines/engine";
import type { FreeCamera } from "@babylonjs/core/Cameras/freeCamera";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Vector3 } from "@babylonjs/core/Maths/math.vector";

import { GameEventBus } from "./events/GameEventBus";
import { GameClock } from "./gameplay/GameClock";
import { PlayerController } from "./gameplay/PlayerController";
import { RunStateStore } from "./gameplay/RunStateStore";
import { KeyboardInputController } from "./input/KeyboardInputController";
import { createWorldScene } from "./world/createWorldScene";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

if (!canvas) {
  throw new Error("Game canvas was not found.");
}

const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: true
});

const eventBus = new GameEventBus();
const clock = new GameClock();
const runStateStore = new RunStateStore(eventBus);
const playerController = new PlayerController(eventBus);
const keyboardInput = new KeyboardInputController(window);
const scene = createWorldScene(engine);
const playerCube = scene.getMeshByName("m0-player-debug-cube");
const skateboard = scene.getMeshByName("m0-skateboard-debug");
const camera = scene.getCameraByName("follow-camera");
let isManualPaused = false;
let isWindowFocused = true;

if (!playerCube || !skateboard || !camera) {
  throw new Error("Milestone 1 debug scene handles were not found.");
}

keyboardInput.attach();
runStateStore.startRun();

engine.runRenderLoop(() => {
  const inputSnapshot = keyboardInput.getSnapshot();

  if (inputSnapshot.pause) {
    isManualPaused = !isManualPaused;
    syncPauseState();
  }

  const deltaSeconds = clock.tick(engine.getDeltaTime());

  if (deltaSeconds > 0) {
    const playerSnapshot = playerController.update(inputSnapshot, deltaSeconds);
    const state = runStateStore.getSnapshot();

    applyDebugPlayerView(
      playerCube,
      skateboard,
      playerSnapshot.x,
      playerSnapshot.y,
      playerSnapshot.isCrouching
    );
    updateDebugCamera(camera as FreeCamera, playerSnapshot.x);
    runStateStore.addDistance(state.speed * deltaSeconds);
  }

  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});

window.addEventListener("blur", () => {
  isWindowFocused = false;
  syncPauseState();
});

window.addEventListener("focus", () => {
  isWindowFocused = true;
  syncPauseState();
});

window.addEventListener("beforeunload", () => {
  keyboardInput.detach();
});

function applyDebugPlayerView(
  playerCube: AbstractMesh,
  skateboard: AbstractMesh,
  playerX: number,
  playerY: number,
  isCrouching: boolean
): void {
  const cubeScaleY = isCrouching ? 0.55 : 1;

  playerCube.position.x = playerX;
  playerCube.scaling.y = cubeScaleY;
  playerCube.position.y = playerY + 0.72 * cubeScaleY;

  skateboard.position.x = playerX;
  skateboard.position.y = playerY + 0.12;
}

function updateDebugCamera(camera: FreeCamera, playerX: number): void {
  camera.position.x += (playerX - camera.position.x) * 0.08;
  camera.setTarget(new Vector3(camera.position.x * 0.25, 1.2, 10));
}

function syncPauseState(): void {
  const shouldPause = isManualPaused || !isWindowFocused;

  if (shouldPause === clock.isPaused()) {
    return;
  }

  if (shouldPause) {
    clock.pause();
    runStateStore.pauseRun();
  } else {
    clock.resume();
    runStateStore.resumeRun();
  }
}
