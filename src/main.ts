import { Engine } from "@babylonjs/core/Engines/engine";

import { GameEventBus } from "./events/GameEventBus";
import { GameClock } from "./gameplay/GameClock";
import { RunStateStore } from "./gameplay/RunStateStore";
import { RunScene } from "./scenes/RunScene";
import { LANE_X_POSITIONS } from "./config/gameplay/gameplayConfig";
import type { PlayerVisualSnapshot } from "./contracts/player-visual.contract";
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
const runScene = new RunScene();

// Bootstrap: create scene, then start run
let scene: import("@babylonjs/core/scene").Scene;

runScene.create(engine, eventBus).then((s) => {
  scene = s;
  runStateStore.startRun();
});

engine.runRenderLoop(() => {
  if (!scene) return;

  const deltaSeconds = clock.tick(engine.getDeltaTime());

  if (deltaSeconds > 0) {
    const state = runStateStore.getSnapshot();
    runStateStore.addDistance(state.speed * deltaSeconds);
  }

  // Build player visual snapshot from gameplay state
  // Player position: lane X + Y (0 = ground). Gameplay Agent will control positionX/Y via events.
  // For now, use LANE_X_POSITIONS[1] as default center lane
  const playerSnap: PlayerVisualSnapshot = {
    positionX: LANE_X_POSITIONS[1],
    positionY: 0,
    verticalVelocity: 0,
    state: "running",
    horizontalDirection: 0,
  };

  runScene.update(Math.max(0, deltaSeconds), playerSnap);
  scene.render();
});

window.addEventListener("resize", () => {
  engine.resize();
});

window.addEventListener("blur", () => {
  clock.pause();
  runStateStore.pauseRun();
});

window.addEventListener("focus", () => {
  clock.resume();
  runStateStore.resumeRun();
});
