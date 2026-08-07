import type { PowerUpSnapshot } from "../gameplay/PowerUpSystem";
import type { PlayerProfile } from "../gameplay/PlayerProfileStore";
import type { RunRecordResult } from "../gameplay/PlayerProfileStore";
import type { RunState } from "../contracts/gameplay";
import {
  COSMETIC_CATEGORIES,
  COSMETICS,
  getCosmeticsForCategory,
  type CosmeticItem
} from "../config/visual/cosmeticsConfig";
import type { CosmeticCategory } from "../gameplay/PlayerProfileStore";
import type { TutorialStep } from "../gameplay/TutorialSystem";
import type { ObstacleItemType } from "../contracts/spawn-pattern.contract";

const POWER_UP_LABELS: Readonly<Record<string, string>> = Object.freeze({
  magnet: "Coin Magnet",
  spring: "Spring Paws",
  rocket: "Rocket Pack",
  star: "2x Score"
});

const CATEGORY_LABELS: Readonly<Record<CosmeticCategory, string>> =
  Object.freeze({
    hat: "Hats",
    dog: "Dogs",
    board: "Skateboards"
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
  readonly onOpenSettings: () => void;
  readonly onCloseSettings: () => void;
  readonly onMusicVolume: (volume: number) => void;
  readonly onSfxVolume: (volume: number) => void;
  readonly onBrightness: (factor: number) => void;
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
  private readonly storeIndex: Record<CosmeticCategory, number> = {
    hat: 0,
    dog: 0,
    board: 0
  };
  private storeActiveCategory: CosmeticCategory = "dog";
  private storeFeedback = "";
  private storeProfile: Readonly<PlayerProfile> | null = null;

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
    this.root.addEventListener("input", this.handleInput);
    this.showLoading();
  }

  showLoading(): void {
    this.hud.hidden = true;
    this.tutorial.hidden = true;
    this.touchControls.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <section class="loading-screen" aria-live="polite">
        <p class="game-kicker">Shiba Skating</p>
        <h1>Waxing the board...</h1>
        <div class="loading-track"><span></span></div>
        <p>Loading the city and your ride</p>
      </section>`;
  }

  showMenu(profile: Readonly<PlayerProfile>): void {
    this.hud.hidden = true;
    this.tutorial.hidden = true;
    this.touchControls.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <section class="menu-screen">
        <p class="game-kicker">Rooftop runner</p>
        <h1>Shiba<br>Skating</h1>
        <div class="menu-profile">
          <p class="wallet-line"><span class="coin-mark"></span>${profile.coins}</p>
          <p><span>Best</span><strong>${profile.bestScore.toLocaleString()}</strong></p>
          <p><span>Distance</span><strong>${Math.floor(profile.bestDistance)}m</strong></p>
        </div>
        <div class="menu-actions">
          <button class="primary-command" data-action="start">Start run <span>→</span></button>
          <button class="secondary-command" data-action="store">Store</button>
          <button class="secondary-command" data-action="settings">Settings</button>
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
    hitType: ObstacleItemType | null = null,
    record: Readonly<RunRecordResult> | null = null
  ): void {
    this.tutorial.hidden = true;
    this.touchControls.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <section class="result-screen">
        <p class="game-kicker">${record?.isNewBestScore ? "New best" : "Run complete"}</p><h2>${run.score.toLocaleString()}</h2>
        ${this.renderCrashReason(hitType)}
        <div class="result-stats">
          <span>Distance <strong>${Math.floor(run.distance)}m</strong></span>
          <span>Run coins <strong>${run.coins}</strong></span>
          <span>Wallet <strong>${profile.coins}</strong></span>
          <span>Best <strong>${profile.bestScore.toLocaleString()}</strong></span>
        </div>
        <div class="menu-actions">
          <button class="primary-command" data-action="restart">Run again <span>↻</span></button>
          <button class="secondary-command" data-action="store">Store</button>
          <button class="secondary-command" data-action="menu">Main menu</button>
        </div>
      </section>`;
  }

  showStore(profile: Readonly<PlayerProfile>, feedback = ""): void {
    this.hud.hidden = true;
    this.tutorial.hidden = true;
    this.touchControls.hidden = true;
    this.overlay.hidden = false;
    this.storeProfile = profile;
    this.storeFeedback = feedback;
    this.renderStore();
  }

  showSettings(musicVolume: number, sfxVolume: number, brightness: number): void {
    this.hud.hidden = true;
    this.tutorial.hidden = true;
    this.touchControls.hidden = true;
    this.overlay.hidden = false;
    this.overlay.innerHTML = `
      <section class="settings-screen">
        <p class="game-kicker">Settings</p><h2>Fine-tune your ride.</h2>
        ${this.renderSettingSlider("music", "Music volume", musicVolume)}
        ${this.renderSettingSlider("sfx", "Sound effects", sfxVolume)}
        ${this.renderSettingSlider("brightness", "Brightness", brightness)}
        <button class="secondary-command store-close" data-action="close-settings">Back</button>
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
    this.root.removeEventListener("input", this.handleInput);
    this.root.remove();
  }

  // ── store rendering ─────────────────────────────────────────

  private renderStore(): void {
    const profile = this.storeProfile;
    if (!profile) return;
    const activeItems = getCosmeticsForCategory(this.storeActiveCategory);
    const activeIndex = this.clampIndex(
      this.storeIndex[this.storeActiveCategory],
      activeItems.length
    );
    const activeItem = activeItems[activeIndex];

    const rows = COSMETIC_CATEGORIES.map((category) =>
      this.renderStoreRow(category, profile)
    ).join("");
    const equipped = this.isEquipped(
      this.storeActiveCategory,
      activeItem.id,
      profile
    );
    const owned = profile.ownedCosmetics.includes(activeItem.id);
    const buyLabel = equipped
      ? "Equipped"
      : owned
        ? "Equip"
        : `Unlock · ${activeItem.price}`;

    this.overlay.innerHTML = `
      <section class="store-screen">
        <header>
          <div><p class="game-kicker">Locker</p><h2>Choose your look.</h2></div>
          <p class="wallet-line"><span class="coin-mark"></span>${profile.coins}</p>
        </header>
        <p class="store-feedback" aria-live="polite">${this.storeFeedback}</p>
        <div class="store-rows">${rows}</div>
        <button class="primary-command store-buy" data-cosmetic="${activeItem.id}" ${equipped ? "disabled" : ""}>${buyLabel}</button>
        <button class="secondary-command store-close" data-action="close-store">Back</button>
      </section>`;
  }

  private renderStoreRow(
    category: CosmeticCategory,
    profile: Readonly<PlayerProfile>
  ): string {
    const items = getCosmeticsForCategory(category);
    const index = this.clampIndex(this.storeIndex[category], items.length);
    const item = items[index];
    const equipped = this.isEquipped(category, item.id, profile);
    const owned = profile.ownedCosmetics.includes(item.id);
    const status = equipped
      ? "Equipped"
      : owned
        ? "Owned"
        : item.price === 0
          ? "Free"
          : `${item.price} coins`;

    return `
      <section class="store-row ${category === this.storeActiveCategory ? "is-active" : ""}" data-category="${category}">
        <span class="store-row-label">${CATEGORY_LABELS[category]}</span>
        <button class="store-arrow" data-browse="${category}" data-dir="-1" aria-label="Previous ${CATEGORY_LABELS[category]}">◀</button>
        <div class="store-row-display" style="--swatch:${item.color};--accent:${item.accent}">
          <p>${item.name}</p>
          <span class="${equipped ? "is-equipped" : ""}">${status}</span>
        </div>
        <button class="store-arrow" data-browse="${category}" data-dir="1" aria-label="Next ${CATEGORY_LABELS[category]}">▶</button>
      </section>`;
  }

  private isEquipped(
    category: CosmeticCategory,
    itemId: string,
    profile: Readonly<PlayerProfile>
  ): boolean {
    if (category === "hat") return profile.equippedHat === itemId;
    if (category === "dog") return profile.equippedDog === itemId;
    return profile.equippedBoard === itemId;
  }

  // ── settings rendering ──────────────────────────────────────

  private renderSettingSlider(
    key: "music" | "sfx" | "brightness",
    label: string,
    value: number
  ): string {
    const percent = Math.round(value * 100);
    return `
      <label class="setting-row">
        <span>${label}</span>
        <input type="range" min="0" max="100" value="${percent}" data-setting="${key}" />
        <strong>${percent}</strong>
      </label>`;
  }

  // ── event handling ──────────────────────────────────────────

  private readonly handleInput = (event: Event): void => {
    const target = event.target as HTMLInputElement;
    if (!target.matches("[data-setting]")) return;
    const value = Math.min(1, Math.max(0, Number(target.value) / 100));
    const key = target.dataset.setting;
    const label = target.closest(".setting-row")?.querySelector("strong");
    if (label) label.textContent = String(Math.round(value * 100));
    if (key === "music") this.actions.onMusicVolume(value);
    else if (key === "sfx") this.actions.onSfxVolume(value);
    else if (key === "brightness") this.actions.onBrightness(value);
  };

  private readonly handleClick = (event: Event): void => {
    const target = (event.target as HTMLElement).closest<HTMLElement>(
      "[data-action],[data-input],[data-cosmetic],[data-browse]"
    );
    if (!target) return;

    const browse = target.dataset.browse as CosmeticCategory | undefined;
    if (browse) {
      const dir = Number(target.dataset.dir ?? 0);
      this.storeActiveCategory = browse;
      const items = getCosmeticsForCategory(browse);
      this.storeIndex[browse] = this.clampIndex(
        this.storeIndex[browse] + dir,
        items.length
      );
      this.storeFeedback = "";
      this.renderStore();
      return;
    }

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
    else if (action === "settings") this.actions.onOpenSettings();
    else if (action === "close-settings") this.actions.onCloseSettings();
    else if (action === "skip-tutorial") this.actions.onTutorialSkip();
    else if (action === "audio") this.actions.onToggleAudio();
  };

  private clampIndex(index: number, length: number): number {
    if (length <= 0) return 0;
    return ((index % length) + length) % length;
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

  private requireElement<T extends HTMLElement = HTMLElement>(selector: string): T {
    const element = this.root.querySelector<T>(selector);
    if (!element) throw new Error(`Missing UI element: ${selector}`);
    return element;
  }

  private setText(selector: string, value: string): void {
    this.requireElement(selector).textContent = value;
  }
}
