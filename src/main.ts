import { Engine } from "@babylonjs/core/Engines/engine";

import { GameEventBus } from "./events/GameEventBus";
import { GameClock } from "./gameplay/GameClock";
import { RunStateStore } from "./gameplay/RunStateStore";
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
const scene = createWorldScene(engine);

runStateStore.startRun();

engine.runRenderLoop(() => {
  const deltaSeconds = clock.tick(engine.getDeltaTime());

  if (deltaSeconds > 0) {
    const state = runStateStore.getSnapshot();
    runStateStore.addDistance(state.speed * deltaSeconds);
  }

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
