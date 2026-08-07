import { Engine } from "@babylonjs/core/Engines/engine";
import "@babylonjs/core/Lights/Shadows/shadowGeneratorSceneComponent";
import "@babylonjs/core/Shaders/default.fragment";
import "@babylonjs/core/Shaders/default.vertex";
import "@babylonjs/core/Shaders/pbr.fragment";
import "@babylonjs/core/Shaders/pbr.vertex";
import "@babylonjs/core/Shaders/shadowMap.fragment";
import "@babylonjs/core/Shaders/shadowMap.vertex";
import "@babylonjs/core/Shaders/postprocess.vertex";
import "@babylonjs/core/Shaders/rgbdDecode.fragment";
import "@babylonjs/core/Shaders/rgbdEncode.fragment";

import { PlayerAssetLoader } from "./assets/PlayerAssetLoader";
import { GameAudioManager } from "./audio/GameAudioManager";
import { WORLD_VISUAL_CONFIG } from "./config/visual/world-visual.config";
import {
  getCosmetic,
  type CosmeticItem
} from "./config/visual/cosmeticsConfig";
import type { PlayerColliderSnapshot } from "./contracts/player-collider.contract";
import type { PlayerVisualSnapshot } from "./contracts/player-visual.contract";
import type {
  CollectibleItemType,
  ObstacleItemType
} from "./contracts/spawn-pattern.contract";
import { GameEventBus } from "./events/GameEventBus";
import { GameClock } from "./gameplay/GameClock";
import { PlayerController } from "./gameplay/PlayerController";
import {
  PlayerProfileStore,
  type RunRecordResult
} from "./gameplay/PlayerProfileStore";
import { PowerUpSystem } from "./gameplay/PowerUpSystem";
import { RunGameplaySystem } from "./gameplay/RunGameplaySystem";
import { RunnerCollisionSystem } from "./gameplay/RunnerCollisionSystem";
import { RunStateStore } from "./gameplay/RunStateStore";
import { TutorialSystem } from "./gameplay/TutorialSystem";
import { KeyboardInputController } from "./input/KeyboardInputController";
import { PlayerColliderController } from "./player/PlayerColliderController";
import { AdaptiveResolutionController } from "./performance/AdaptiveResolutionController";
import { RunScene } from "./scenes/RunScene";
import { GameUiController } from "./ui/GameUiController";
import { GameFeelController } from "./ui/GameFeelController";
import "./style.css";

type AppMode = "loading" | "menu" | "countdown" | "running" | "paused" | "gameover" | "store" | "settings";

const canvas = document.querySelector<HTMLCanvasElement>("#game-canvas");
if (!canvas) throw new Error("Game canvas was not found.");

const engine = new Engine(canvas, false, {
  preserveDrawingBuffer: false,
  stencil: true
});
const adaptiveResolution = new AdaptiveResolutionController((level) => {
  engine.setHardwareScalingLevel(level);
});
const eventBus = new GameEventBus();
const clock = new GameClock();
const runStateStore = new RunStateStore(eventBus);
const playerController = new PlayerController(eventBus);
const runGameplay = new RunGameplaySystem();
const collisionSystem = new RunnerCollisionSystem();
const powerUps = new PowerUpSystem(eventBus);
let currentPowerUpSnapshot = powerUps.getSnapshot();
const profileStore = new PlayerProfileStore(getLocalStorage());
const audio = new GameAudioManager(eventBus);
const playerColliderController = new PlayerColliderController({
  groundY: WORLD_VISUAL_CONFIG.trackThickness
});
const keyboardInput = new KeyboardInputController(window);

const runScene = new RunScene();
const playerAssetLoader = new PlayerAssetLoader();
const scene = runScene.create(engine, playerAssetLoader);
const gameFeel = new GameFeelController(eventBus, (amount) =>
  runScene.addCameraImpact(amount)
);

let appMode: AppMode = "loading";
let storeReturnMode: AppMode = "menu";
let settingsReturnMode: AppMode = "menu";
let musicVolume = 1;
let sfxVolume = 1;
let brightness = 1;
let countdownRemaining = 0;
let displayedCountdown = -1;
let startWithTutorial = false;
let isDisposed = false;
let hudElapsed = 0;
let playerSnapshot = playerController.getSnapshot();
let playerVisualSnapshot = playerController.getVisualSnapshot(playerSnapshot);
let playerColliderSnapshot: Readonly<PlayerColliderSnapshot> =
  playerColliderController.update(playerController.getSnapshot());
let currentSpeed = 0;
let lastObstacleHit: ObstacleItemType | null = null;
let lastRunRecord: RunRecordResult | null = null;
let assetsReady = false;
let ui!: GameUiController;

const tutorial = new TutorialSystem(
  eventBus,
  (step) => ui?.showTutorial(step),
  () => {
    profileStore.completeTutorial();
    runGameplay.setTutorialMode(false);
    runScene.getTrackManager().clearSpawnItems();
  }
);

ui = new GameUiController({
  onStart: () => {
    void audio.unlock().then(() => audio.setPaused(false));
    beginCountdown(!profileStore.getSnapshot().tutorialCompleted);
  },
  onTutorialStart: () => {
    void audio.unlock().then(() => audio.setPaused(false));
    beginCountdown(true);
  },
  onPause: pauseRun,
  onResume: resumeRun,
  onRestart: () => {
    void audio.unlock().then(() => audio.setPaused(false));
    beginCountdown(!profileStore.getSnapshot().tutorialCompleted);
  },
  onMenu: showMainMenu,
  onOpenStore: openStore,
  onCloseStore: closeStore,
  onCosmeticAction: handleCosmeticAction,
  onTutorialSkip: () => tutorial.skip(),
  onToggleAudio: () => {
    void audio.unlock();
    audio.setMuted(!audio.isMuted);
    ui.setAudioMuted(audio.isMuted);
  },
  onOpenSettings: () => openSettings(),
  onCloseSettings: () => closeSettings(),
  onMusicVolume: (volume) => {
    musicVolume = volume;
    audio.setMusicVolume(volume);
  },
  onSfxVolume: (volume) => {
    sfxVolume = volume;
    audio.setSfxVolume(volume);
  },
  onBrightness: (factor) => {
    brightness = factor;
    runScene.setBrightness(factor);
  },
  onInput: (action) => keyboardInput.queueAction(action)
});

keyboardInput.attach();
clock.pause();
runStateStore.startRun();
applyEquippedCosmetics();
ui.showLoading();
void runScene.startAssetLoad()
  .catch((error) => {
    console.warn("[ShibaSkating] Optional asset load failed; using fallbacks.", error);
  })
  .finally(() => {
    if (isDisposed) return;
    assetsReady = true;
    applyEquippedCosmetics();
    appMode = "menu";
    ui.showMenu(profileStore.getSnapshot());
  });

engine.runRenderLoop(() => {
  const rawDeltaSeconds = Math.min(Math.max(engine.getDeltaTime() / 1000, 0), 0.1);
  if (appMode === "running") adaptiveResolution.update(rawDeltaSeconds);
  const inputSnapshot = keyboardInput.getSnapshot();

  if (inputSnapshot.pause) {
    if (appMode === "running") pauseRun();
    else if (appMode === "paused") resumeRun();
  }

  if (appMode === "countdown") updateCountdown(rawDeltaSeconds);

  const deltaSeconds = appMode === "running"
    ? clock.tick(engine.getDeltaTime())
    : 0;

  if (deltaSeconds > 0) {
    tutorial.update(deltaSeconds);
    powerUps.update(deltaSeconds);
    currentPowerUpSnapshot = powerUps.getSnapshot();
    applyPowerUpSnapshotToPlayer();

    const gameplayFrame = runGameplay.update(
      deltaSeconds,
      runScene.getTrackManager().getScrollDistance()
    );
    const tutorialMultiplier = tutorial.isActive ? 0.72 : 1;
    currentSpeed =
      gameplayFrame.speed *
      currentPowerUpSnapshot.speedMultiplier *
      tutorialMultiplier;
    runStateStore.setSpeed(currentSpeed);
    runScene.getTrackManager().submitSpawnRequests(gameplayFrame.spawnRequests);

    playerSnapshot = playerController.update(inputSnapshot, deltaSeconds);
    playerVisualSnapshot = playerController.getVisualSnapshot(playerSnapshot);
    playerColliderSnapshot = playerColliderController.update(playerSnapshot);
    runStateStore.addDistance(currentSpeed * deltaSeconds);
  }

  const isPaused = appMode === "paused";
  const frameSnapshot: PlayerVisualSnapshot = isPaused
    ? { ...playerVisualSnapshot, state: "paused" }
    : playerVisualSnapshot;
  const cameraSnapshot = playerController.getCameraTargetSnapshot(
    isPaused,
    playerSnapshot
  );
  const presentationDelta = isPaused ? 0 : rawDeltaSeconds;

  runScene.update(
    presentationDelta,
    frameSnapshot,
    playerColliderSnapshot,
    cameraSnapshot,
    appMode === "running" ? currentSpeed : 0
  );

  if (appMode === "running" && deltaSeconds > 0) {
    processCollisions();
    hudElapsed += deltaSeconds;
    if (hudElapsed >= 0.1) {
      hudElapsed = 0;
      ui.updateHud(runStateStore.getSnapshot(), currentPowerUpSnapshot);
      gameFeel.update(currentSpeed, currentPowerUpSnapshot);
    }
  }

  scene.render();
});

function processCollisions(): void {
  if (currentPowerUpSnapshot.collectionDistance > 0) {
    const activeItems = runScene.getTrackManager().getActiveItems();
    for (let index = activeItems.length - 1; index >= 0; index -= 1) {
      const item = activeItems[index];
      if (
        item.type === "coin" &&
        Math.abs(item.worldZ) <= currentPowerUpSnapshot.collectionDistance
      ) {
        collectWorldItem(item.id, "coin");
      }
    }
  }

  const collisionFrame = collisionSystem.update(
    playerColliderSnapshot,
    runScene.getTrackManager().getActiveItems(),
    currentPowerUpSnapshot.isInvulnerable || tutorial.isProtected
  );
  for (const collectible of collisionFrame.collectibles) {
    collectWorldItem(collectible.itemId, collectible.type);
  }

  if (!collisionFrame.obstacleHit) return;
  lastObstacleHit = collisionFrame.obstacleHit.type;
  playerController.kill();
  playerVisualSnapshot = playerController.getVisualSnapshot();
  runStateStore.endRun();
  const completedRun = runStateStore.getSnapshot();
  lastRunRecord = profileStore.recordRun(completedRun.score, completedRun.distance);
  runGameplay.pause();
  powerUps.pause();
  currentSpeed = 0;
  appMode = "gameover";
  gameFeel.update(0, currentPowerUpSnapshot);
  audio.setPaused(true);
  ui.showGameOver(
    completedRun,
    profileStore.getSnapshot(),
    lastObstacleHit,
    lastRunRecord
  );
}

function collectWorldItem(itemId: number, type: CollectibleItemType): void {
  if (!runScene.getTrackManager().consumeItem(itemId)) return;
  if (type === "coin") {
    runStateStore.collectCoins(1);
    profileStore.addCoins(1);
    return;
  }
  powerUps.activate(type.replace("powerup_", "") as "magnet" | "spring" | "rocket" | "star");
  currentPowerUpSnapshot = powerUps.getSnapshot();
  applyPowerUpSnapshotToPlayer();
}

function applyPowerUpSnapshotToPlayer(): void {
  playerController.setFlightHeight(
    currentPowerUpSnapshot.flightHeight > 0
      ? currentPowerUpSnapshot.flightHeight
      : null
  );
  playerController.setJumpMultiplier(currentPowerUpSnapshot.jumpMultiplier);
  runStateStore.setScoreMultiplier(currentPowerUpSnapshot.scoreMultiplier);
}

function beginCountdown(withTutorial: boolean): void {
  if (!assetsReady) return;
  prepareRun();
  runGameplay.setTutorialMode(withTutorial);
  startWithTutorial = withTutorial;
  countdownRemaining = 3;
  displayedCountdown = 3;
  appMode = "countdown";
  ui.showCountdown(3);
}

function updateCountdown(deltaSeconds: number): void {
  countdownRemaining = Math.max(0, countdownRemaining - deltaSeconds);
  const nextDisplay = Math.ceil(countdownRemaining);
  if (nextDisplay !== displayedCountdown && nextDisplay > 0) {
    displayedCountdown = nextDisplay;
    ui.showCountdown(nextDisplay);
  }
  if (countdownRemaining > 0) return;

  appMode = "running";
  clock.resume();
  runGameplay.resume();
  powerUps.resume();
  audio.setPaused(false);
  ui.showRunning();
  ui.updateHud(runStateStore.getSnapshot(), currentPowerUpSnapshot);
  if (startWithTutorial) tutorial.start();
}

function prepareRun(): void {
  keyboardInput.reset();
  tutorial.cancel();
  playerController.reset();
  runGameplay.reset();
  collisionSystem.reset();
  powerUps.reset();
  currentPowerUpSnapshot = powerUps.getSnapshot();
  playerColliderController.reset();
  playerSnapshot = playerController.getSnapshot();
  playerVisualSnapshot = playerController.getVisualSnapshot(playerSnapshot);
  playerColliderSnapshot = playerColliderController.getSnapshot();
  runStateStore.startRun();
  currentSpeed = runGameplay.getCurrentSpeed();
  lastObstacleHit = null;
  lastRunRecord = null;
  hudElapsed = 0;
  runScene.reset();
  clock.pause();
}

function pauseRun(): void {
  if (appMode !== "running") return;
  appMode = "paused";
  clock.pause();
  runStateStore.pauseRun();
  runGameplay.pause();
  powerUps.pause();
  audio.setPaused(true);
  gameFeel.update(0, currentPowerUpSnapshot);
  keyboardInput.reset();
  ui.showPaused();
}

function resumeRun(): void {
  if (appMode !== "paused") return;
  appMode = "running";
  clock.resume();
  runStateStore.resumeRun();
  runGameplay.resume();
  powerUps.resume();
  audio.setPaused(false);
  ui.showRunning();
}

function showMainMenu(): void {
  tutorial.cancel();
  appMode = "menu";
  currentSpeed = 0;
  clock.pause();
  runGameplay.pause();
  powerUps.pause();
  audio.setPaused(true);
  gameFeel.update(0, currentPowerUpSnapshot);
  keyboardInput.reset();
  ui.showMenu(profileStore.getSnapshot());
}

function openStore(): void {
  storeReturnMode = appMode;
  if (appMode === "running") pauseRun();
  appMode = "store";
  clock.pause();
  runGameplay.pause();
  powerUps.pause();
  audio.setPaused(true);
  ui.showStore(profileStore.getSnapshot());
}

function openSettings(): void {
  settingsReturnMode = appMode;
  if (appMode === "running") pauseRun();
  appMode = "settings";
  clock.pause();
  runGameplay.pause();
  powerUps.pause();
  audio.setPaused(true);
  ui.showSettings(musicVolume, sfxVolume, brightness);
}

function closeSettings(): void {
  if (settingsReturnMode === "gameover") {
    appMode = "gameover";
    ui.showGameOver(
      runStateStore.getSnapshot(),
      profileStore.getSnapshot(),
      lastObstacleHit,
      lastRunRecord
    );
  } else {
    showMainMenu();
  }
}

function closeStore(): void {
  if (storeReturnMode === "gameover") {
    appMode = "gameover";
    ui.showGameOver(
      runStateStore.getSnapshot(),
      profileStore.getSnapshot(),
      lastObstacleHit,
      lastRunRecord
    );
  } else {
    showMainMenu();
  }
}

function handleCosmeticAction(item: CosmeticItem): void {
  const profile = profileStore.getSnapshot();
  if (!profile.ownedCosmetics.includes(item.id)) {
    if (!profileStore.purchase(item.id, item.price)) {
      ui.showStore(profile, `Need ${item.price - profile.coins} more coins for ${item.name}.`);
      return;
    }
  }
  profileStore.equip(item.category, item.id);
  applyEquippedCosmetics();
  ui.showStore(profileStore.getSnapshot(), `${item.name} equipped.`);
}

function applyEquippedCosmetics(): void {
  const profile = profileStore.getSnapshot();
  runScene.applyCosmetics(
    profile.equippedDog,
    profile.equippedBoard,
    profile.equippedHat,
    getCosmetic(profile.equippedDog).color,
    getCosmetic(profile.equippedBoard).color
  );
}

function handleResize(): void {
  engine.resize();
}

function handleBlur(): void {
  keyboardInput.reset();
  if (appMode === "running") pauseRun();
}

function handleGameShortcut(event: KeyboardEvent): void {
  if (event.code === "F3") {
    event.preventDefault();
    runScene.toggleDebugHud();
    runScene.togglePlayerRigDebug();
  } else if (event.code === "KeyR" && appMode !== "menu" && appMode !== "store") {
    event.preventDefault();
    beginCountdown(!profileStore.getSnapshot().tutorialCompleted);
  }
}

function getLocalStorage(): Storage | undefined {
  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

function disposeGame(): void {
  if (isDisposed) return;
  isDisposed = true;
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("blur", handleBlur);
  window.removeEventListener("keydown", handleGameShortcut);
  window.removeEventListener("beforeunload", disposeGame);
  tutorial.dispose();
  gameFeel.dispose();
  audio.dispose();
  ui.dispose();
  keyboardInput.detach();
  engine.stopRenderLoop();
  runScene.dispose();
  engine.dispose();
}

window.addEventListener("resize", handleResize);
window.addEventListener("blur", handleBlur);
window.addEventListener("keydown", handleGameShortcut);
window.addEventListener("beforeunload", disposeGame);

if (import.meta.hot) import.meta.hot.dispose(disposeGame);
