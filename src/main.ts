import { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
// Babylon.js shader side-effect imports (required with tree-shaken core imports).
// Without these, shaders fall back to HTTP fetch and get the HTML page instead.
import "@babylonjs/core/Shaders/default.fragment";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/pbr.fragment";
import "@babylonjs/core/Shaders/pbr.vertex";
import "@babylonjs/core/Shaders/shadowMap.fragment";
import "@babylonjs/core/Shaders/shadowMap.vertex";
import "@babylonjs/core/Shaders/postprocess.vertex";
import "@babylonjs/core/Shaders/rgbdDecode.fragment";
import "@babylonjs/core/Shaders/rgbdEncode.fragment";

import type { PlayerVisualSnapshot } from "./contracts/player-visual.contract";
import type { PlayerColliderSnapshot } from "./contracts/player-collider.contract";
import { GameEventBus } from "./events/GameEventBus";
import { GameClock } from "./gameplay/GameClock";
import { PlayerController } from "./gameplay/PlayerController";
import { RunStateStore } from "./gameplay/RunStateStore";
import { RunGameplaySystem } from "./gameplay/RunGameplaySystem";
import { RunnerCollisionSystem } from "./gameplay/RunnerCollisionSystem";
import { KeyboardInputController } from "./input/KeyboardInputController";
import { PlayerColliderController } from "./player/PlayerColliderController";
import { RunScene } from "./scenes/RunScene";
import { WORLD_VISUAL_CONFIG } from "./config/visual/world-visual.config";
import { PlayerAssetLoader } from "./assets/PlayerAssetLoader";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

if (!canvas) {
  throw new Error("Game canvas was not found.");
}

const engine = new Engine(canvas, false, {
  preserveDrawingBuffer: false,
  stencil: true,
});
const eventBus = new GameEventBus();
const clock = new GameClock();
const runStateStore = new RunStateStore(eventBus);
const playerController = new PlayerController(eventBus);
const runGameplay = new RunGameplaySystem();
const collisionSystem = new RunnerCollisionSystem();
const playerColliderController = new PlayerColliderController({
  groundY: WORLD_VISUAL_CONFIG.trackThickness
});
const keyboardInput = new KeyboardInputController(window);

// Create scene first so we have a Scene for the loader
const runScene = new RunScene();
const playerAssetLoader = new PlayerAssetLoader();
const scene = runScene.create(engine, playerAssetLoader);
void runScene.startAssetLoad();

let playerVisualSnapshot = playerController.getVisualSnapshot();
let playerColliderSnapshot: Readonly<PlayerColliderSnapshot> =
  playerColliderController.update(playerController.getSnapshot());
let currentSpeed = runGameplay.getCurrentSpeed();
let isManualPaused = false;
let isWindowFocused = document.hasFocus();
let isDisposed = false;

keyboardInput.attach();
runStateStore.startRun();
syncPauseState();

engine.runRenderLoop(() => {
  const inputSnapshot = keyboardInput.getSnapshot();
  const pauseWasToggled = inputSnapshot.pause;

  if (pauseWasToggled) {
    isManualPaused = !isManualPaused;
    keyboardInput.reset();
    syncPauseState();
  }

  const deltaSeconds = clock.tick(engine.getDeltaTime());

  const runStateBeforeFrame = runStateStore.getSnapshot();
  if (deltaSeconds > 0 && !pauseWasToggled && !runStateBeforeFrame.isGameOver) {
    const gameplayFrame = runGameplay.update(
      deltaSeconds,
      runScene.getTrackManager().getScrollDistance()
    );
    currentSpeed = gameplayFrame.speed;
    runStateStore.setSpeed(currentSpeed);
    runScene.getTrackManager().submitSpawnRequests(gameplayFrame.spawnRequests);

    const playerSnapshot = playerController.update(inputSnapshot, deltaSeconds);
    playerVisualSnapshot = playerController.getVisualSnapshot();
    playerColliderSnapshot = playerColliderController.update(playerSnapshot);

    const runState = runStateStore.getSnapshot();
    runStateStore.addDistance(runState.speed * deltaSeconds);
  }

  const frameSnapshot: PlayerVisualSnapshot = clock.isPaused()
    ? { ...playerVisualSnapshot, state: "paused" }
    : playerVisualSnapshot;
  const cameraSnapshot = playerController.getCameraTargetSnapshot(
    clock.isPaused()
  );

  runScene.update(
    deltaSeconds,
    frameSnapshot,
    playerColliderSnapshot,
    cameraSnapshot,
    currentSpeed
  );

  if (!runStateStore.getSnapshot().isGameOver && deltaSeconds > 0) {
    const collisionFrame = collisionSystem.update(
      playerColliderSnapshot,
      runScene.getTrackManager().getActiveItems()
    );
    if (collisionFrame.obstacleHit) {
      runScene.getTrackManager().consumeItem(collisionFrame.obstacleHit.itemId);
      playerController.kill();
      playerVisualSnapshot = playerController.getVisualSnapshot();
      runStateStore.endRun();
      runGameplay.pause();
      currentSpeed = 0;
    }
  }
  scene.render();
});

function handleResize(): void {
  engine.resize();
}

function handleBlur(): void {
  isWindowFocused = false;
  keyboardInput.reset();
  syncPauseState();
}

function handleFocus(): void {
  isWindowFocused = true;
  syncPauseState();
}

function handleGameShortcut(event: KeyboardEvent): void {
  if (event.code === "F3") {
    event.preventDefault();
    runScene.toggleDebugHud();
    runScene.togglePlayerRigDebug();
  } else if (event.code === "KeyR") {
    event.preventDefault();
    restartRun();
  }
}

function restartRun(): void {
  keyboardInput.reset();
  playerController.reset();
  runGameplay.reset();
  collisionSystem.reset();
  playerColliderController.reset();
  playerVisualSnapshot = playerController.getVisualSnapshot();
  playerColliderSnapshot = playerColliderController.getSnapshot();
  runStateStore.startRun();
  currentSpeed = runGameplay.getCurrentSpeed();
  runScene.reset();
}

function syncPauseState(): void {
  const shouldPause = isManualPaused || !isWindowFocused;

  if (shouldPause === clock.isPaused()) {
    return;
  }

  if (shouldPause) {
    clock.pause();
    runStateStore.pauseRun();
    runGameplay.pause();
  } else {
    clock.resume();
    if (!runStateStore.getSnapshot().isGameOver) {
      runStateStore.resumeRun();
      runGameplay.resume();
    }
  }
}

function disposeGame(): void {
  if (isDisposed) {
    return;
  }

  isDisposed = true;
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("blur", handleBlur);
  window.removeEventListener("focus", handleFocus);
  window.removeEventListener("keydown", handleGameShortcut);
  window.removeEventListener("beforeunload", disposeGame);
  keyboardInput.detach();
  engine.stopRenderLoop();
  runScene.dispose();
  engine.dispose();
}

window.addEventListener("resize", handleResize);
window.addEventListener("blur", handleBlur);
window.addEventListener("focus", handleFocus);
window.addEventListener("keydown", handleGameShortcut);
window.addEventListener("beforeunload", disposeGame);

if (import.meta.hot) {
  import.meta.hot.dispose(disposeGame);
}
