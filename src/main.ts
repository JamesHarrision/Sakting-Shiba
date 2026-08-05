import { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";

import type { PlayerVisualSnapshot } from "./contracts/player-visual.contract";
import { GameEventBus } from "./events/GameEventBus";
import { GameClock } from "./gameplay/GameClock";
import { PlayerController } from "./gameplay/PlayerController";
import { RunStateStore } from "./gameplay/RunStateStore";
import { KeyboardInputController } from "./input/KeyboardInputController";
import { RunScene } from "./scenes/RunScene";
import { PlayerAssetLoader } from "./assets/PlayerAssetLoader";
import "./style.css";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");

if (!canvas) {
  throw new Error("Game canvas was not found.");
}

const engine = new Engine(canvas, true, {
  preserveDrawingBuffer: false,
  stencil: true,
});
const eventBus = new GameEventBus();
const clock = new GameClock();
const runStateStore = new RunStateStore(eventBus);
const playerController = new PlayerController(eventBus);
const keyboardInput = new KeyboardInputController(window);

// Create scene first so we have a Scene for the loader
const runScene = new RunScene();
const playerAssetLoader = new PlayerAssetLoader();
const scene = runScene.create(engine, playerAssetLoader);
playerAssetLoader.setScene(scene);
runScene.startAssetLoad();

let playerVisualSnapshot = playerController.getVisualSnapshot();
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

  if (deltaSeconds > 0 && !pauseWasToggled) {
    playerController.update(inputSnapshot, deltaSeconds);
    playerVisualSnapshot = playerController.getVisualSnapshot();

    const state = runStateStore.getSnapshot();
    runStateStore.addDistance(state.speed * deltaSeconds);
  }

  const frameSnapshot: PlayerVisualSnapshot = clock.isPaused()
    ? { ...playerVisualSnapshot, state: "paused" }
    : playerVisualSnapshot;

  runScene.update(deltaSeconds, frameSnapshot);
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

function handleDebugToggle(event: KeyboardEvent): void {
  if (event.code !== "F3") {
    return;
  }

  event.preventDefault();
  runScene.toggleDebugHud();
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

function disposeGame(): void {
  if (isDisposed) {
    return;
  }

  isDisposed = true;
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("blur", handleBlur);
  window.removeEventListener("focus", handleFocus);
  window.removeEventListener("keydown", handleDebugToggle);
  window.removeEventListener("beforeunload", disposeGame);
  keyboardInput.detach();
  engine.stopRenderLoop();
  runScene.dispose();
  engine.dispose();
}

window.addEventListener("resize", handleResize);
window.addEventListener("blur", handleBlur);
window.addEventListener("focus", handleFocus);
window.addEventListener("keydown", handleDebugToggle);
window.addEventListener("beforeunload", disposeGame);

if (import.meta.hot) {
  import.meta.hot.dispose(disposeGame);
}
