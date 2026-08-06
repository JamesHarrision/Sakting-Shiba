import type { PowerUpSnapshot } from "../gameplay/PowerUpSystem";
import type { PlayerProfile } from "../gameplay/PlayerProfileStore";
import type { RunState } from "../contracts/gameplay";
import { COSMETICS, type CosmeticItem } from "../config/visual/cosmeticsConfig";
import type { TutorialStep } from "../gameplay/TutorialSystem";
import type { ObstacleItemType } from "../contracts/spawn-pattern.contract";

const POWER_UP_LABELS: Readonly<Record<string, string>> = Object.freeze({
  magnet: "Coin Magnet",
  spring: "Spring Paws",
  rocket: "Rocket Pack",
  star: "2x Score"
});

export interface GameUiActions {
  readonly onStart: () => void;
  readonly onTutorialStart: () => void;
  readonly onPause: () => void;
  readonly onResume: () => void;
  readonly onRestart: () => void;
  readonly onMenu: () => void;
  readonly onOpenStore: () => void;
  readonly onCloseStore: () => void;
  readonly onCosmeticAction: (item: CosmeticItem) => void;
  readonly onTutorialSkip: () => void;
  readonly onToggleAudio: () => void;
  readonly onInput: (action: "moveLeft" | "moveRight" | "jump" | "crouch") => void;
}

export class GameUiController {
  private readonly root: HTMLDivElement;
  private readonly hud: HTMLElement;
  private readonly overlay: HTMLElement;
  private readonly tutorial: HTMLElement;
  private readonly touchControls: HTMLElement;
  private readonly actions: GameUiActions;
  private tutorialActive = false;

  constructor(actions: GameUiActions) {
    this.actions = actions;
    this.root = document.createElement("div");
    this.root.id = "game-ui";
    this.root.innerHTML = `
      <header class="run-hud" data-ui="hud" hidden>
        <div class="hud-stat"><span>Score</span><strong data-ui="score">0</strong></div>
        <div class="hud-stat"><span>Coins</span><strong data-ui="run-coins">0</strong></div>
        <div class="hud-stat hud-speed"><span>Speed</span><strong data-ui="speed">0</strong></div>
        <div class="power-strip" data-ui="powers"></div>
        <button class="icon-button pause-button" data-action="pause" aria-label="Pause" title="Pause">Ⅱ</button>
      </header>
      <main class="game-overlay" data-ui="overlay"></main>
      <aside class="tutorial-callout" data-ui="tutorial" hidden></aside>
      <button class="audio-toggle" data-action="audio" data-ui="audio" aria-label="Mute audio" title="Mute audio">♪</button>
      <nav class="touch-controls" aria-label="Game controls">
        <button data-input="moveLeft" aria-label="Move left">←</button>
        <button data-input="jump" aria-label="Jump">↑</button>
        <button data-input="crouch" aria-label="Crouch">↓</button>
        <button data-input="moveRight" aria-label="Move right">→</button>
      </nav>`;
    document.body.appendChild(this.root);
    this.hud = this.requireElement("[data-ui='hud']");
    this.overlay = this.requireElement("[data-ui='overlay']");
    this.tutorial = this.requireElement("[data-ui='tutorial']");
    this.touchControls = this.requireElement(".touch-controls");
    this.root.addEventListener("click", this.handleClick);
    this.showMenu({ coins: 0, ownedCosmetics: [], equippedCat: "cat.default", equippedBoard: "board.default", tutorialCompleted: false });
  }

  showMenu(profile: Readonly<PlayerProfile>): void {
    this.hud.hidden = true;
    this.tutorial.hidden = true;
    this.touchControls.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <section class="menu-screen">
        <p class="game-kicker">Rooftop runner</p>
        <h1>Catboard<br>Rush</h1>
        <p class="wallet-line"><span class="coin-mark"></span>${profile.coins}</p>
        <div class="menu-actions">
          <button class="primary-command" data-action="start">Start run <span>→</span></button>
          <button class="secondary-command" data-action="tutorial">Tutorial</button>
          <button class="secondary-command" data-action="store">Store</button>
        </div>
      </section>`;
  }

  showCountdown(value: number): void {
    this.hud.hidden = false;
    this.tutorial.hidden = true;
    this.touchControls.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `<div class="countdown" aria-live="assertive">${value > 0 ? value : "GO"}</div>`;
  }

  showRunning(): void {
    this.hud.hidden = false;
    this.overlay.hidden = true;
    this.tutorial.hidden = !this.tutorialActive;
    this.touchControls.hidden = false;
  }

  showPaused(): void {
    this.tutorial.hidden = true;
    this.touchControls.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <section class="pause-screen">
        <p class="game-kicker">Run paused</p><h2>Catch your breath.</h2>
        <div class="menu-actions">
          <button class="primary-command" data-action="resume">Resume <span>→</span></button>
          <button class="secondary-command" data-action="menu">Main menu</button>
        </div>
      </section>`;
  }

  showGameOver(
    run: Readonly<RunState>,
    profile: Readonly<PlayerProfile>,
    hitType: ObstacleItemType | null = null
  ): void {
    this.tutorial.hidden = true;
    this.touchControls.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <section class="result-screen">
        <p class="game-kicker">Run complete</p><h2>${run.score.toLocaleString()}</h2>
        ${this.renderCrashReason(hitType)}
        <div class="result-stats">
          <span>Distance <strong>${Math.floor(run.distance)}m</strong></span>
          <span>Run coins <strong>${run.coins}</strong></span>
          <span>Wallet <strong>${profile.coins}</strong></span>
        </div>
        <div class="menu-actions">
          <button class="primary-command" data-action="restart">Run again <span>↻</span></button>
          <button class="secondary-command" data-action="store">Store</button>
          <button class="secondary-command" data-action="menu">Main menu</button>
        </div>
      </section>`;
  }

  showStore(profile: Readonly<PlayerProfile>): void {
    this.hud.hidden = true;
    this.tutorial.hidden = true;
    this.touchControls.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <section class="store-screen">
        <header><div><p class="game-kicker">Locker</p><h2>Choose your ride.</h2></div><p class="wallet-line"><span class="coin-mark"></span>${profile.coins}</p></header>
        <div class="store-grid">${COSMETICS.map((item) => this.renderStoreItem(item, profile)).join("")}</div>
        <button class="secondary-command store-close" data-action="close-store">Back</button>
      </section>`;
  }

  updateHud(
    run: Readonly<RunState>,
    powers: Readonly<PowerUpSnapshot>
  ): void {
    this.setText("[data-ui='score']", run.score.toLocaleString());
    this.setText("[data-ui='run-coins']", String(run.coins));
    this.setText("[data-ui='speed']", `${run.speed.toFixed(1)}x`);
    const strip = this.requireElement("[data-ui='powers']");
    strip.innerHTML = Object.entries(powers.active)
      .map(([type, seconds]) => `<span class="power-pill power-${type}">${POWER_UP_LABELS[type] ?? type} ${Math.ceil(seconds ?? 0)}s</span>`)
      .join("");
  }

  showTutorial(step: TutorialStep): void {
    if (step === "complete") {
      this.tutorialActive = false;
      this.tutorial.hidden = true;
      return;
    }
    this.tutorialActive = true;
    const copy: Record<Exclude<TutorialStep, "complete">, string> = {
      lane: "Move left or right",
      jump: "Jump over boxes",
      crouch: "Crouch under fences",
      coin: "Collect a coin"
    };
    this.tutorial.hidden = false;
    this.tutorial.innerHTML = `<strong>${copy[step]}</strong><button data-action="skip-tutorial">Skip</button>`;
  }

  setAudioMuted(muted: boolean): void {
    const button = this.requireElement<HTMLButtonElement>("[data-ui='audio']");
    button.textContent = muted ? "×" : "♪";
    button.setAttribute("aria-label", muted ? "Enable audio" : "Mute audio");
    button.title = muted ? "Enable audio" : "Mute audio";
  }

  dispose(): void {
    this.root.removeEventListener("click", this.handleClick);
    this.root.remove();
  }

  private renderStoreItem(item: CosmeticItem, profile: Readonly<PlayerProfile>): string {
    const owned = profile.ownedCosmetics.includes(item.id);
    const equipped = item.category === "cat" ? profile.equippedCat === item.id : profile.equippedBoard === item.id;
    const label = equipped ? "Equipped" : owned ? "Equip" : `${item.price}`;
    return `<article class="store-item ${equipped ? "is-equipped" : ""}">
      <div class="cosmetic-swatch" style="--swatch:${item.color};--accent:${item.accent}"></div>
      <p>${item.category === "cat" ? "Cat skin" : "Skateboard"}</p><h3>${item.name}</h3>
      <button data-cosmetic="${item.id}" ${equipped ? "disabled" : ""}>${label}</button>
    </article>`;
  }

  private renderCrashReason(hitType: ObstacleItemType | null): string {
    if (!hitType) return "";
    const copy: Readonly<Record<ObstacleItemType, [string, string]>> = {
      obstacle_box: ["Box impact", "Jump before the box reaches the board."],
      obstacle_fence: ["Fence impact", "Crouch to pass beneath the fence."],
      obstacle_dumpster: [
        "Dumpster impact",
        "Switch lanes or clear it near the top of a jump."
      ]
    };
    const [title, tip] = copy[hitType];
    return `<p class="crash-reason"><strong>${title}</strong><span>${tip}</span></p>`;
  }

  private readonly handleClick = (event: Event): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-action],[data-input],[data-cosmetic]");
    if (!target) return;
    const input = target.dataset.input as "moveLeft" | "moveRight" | "jump" | "crouch" | undefined;
    if (input) return this.actions.onInput(input);
    const cosmeticId = target.dataset.cosmetic;
    if (cosmeticId) {
      const item = COSMETICS.find((candidate) => candidate.id === cosmeticId);
      if (item) this.actions.onCosmeticAction(item);
      return;
    }
    const action = target.dataset.action;
    if (action === "start") this.actions.onStart();
    else if (action === "tutorial") this.actions.onTutorialStart();
    else if (action === "pause") this.actions.onPause();
    else if (action === "resume") this.actions.onResume();
    else if (action === "restart") this.actions.onRestart();
    else if (action === "menu") this.actions.onMenu();
    else if (action === "store") this.actions.onOpenStore();
    else if (action === "close-store") this.actions.onCloseStore();
    else if (action === "skip-tutorial") this.actions.onTutorialSkip();
    else if (action === "audio") this.actions.onToggleAudio();
  };

  private requireElement<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }

  private setText(selector: string, value: string): void {
    this.requireElement(selector).textContent = value;
  }
}
