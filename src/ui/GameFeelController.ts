import type { GameEventBus } from "../events/GameEventBus";
import type { PowerUpSnapshot } from "../gameplay/PowerUpSystem";

export class GameFeelController {
  private readonly root: HTMLDivElement;
  private readonly unsubscribe: Array<() => void> = [];
  private readonly timers = new Set<number>();

  constructor(eventBus: GameEventBus, onImpact: (amount: number) => void) {
    this.root = document.createElement("div");
    this.root.className = "game-feel-layer";
    this.root.innerHTML = `<div class="impact-flash"></div><div class="speed-lines">${Array.from(
      { length: 12 },
      (_, index) => `<i style="--line:${index}"></i>`
    ).join("")}</div>`;
    document.body.appendChild(this.root);

    this.unsubscribe.push(
      eventBus.on("PLAYER_LANDED", () => {
        onImpact(0.08);
        this.pulse("is-landing", 180);
      }),
      eventBus.on("PLAYER_HIT", () => {
        onImpact(0.38);
        this.pulse("is-hit", 420);
      }),
      eventBus.on("COIN_COLLECTED", () => this.pulse("is-coin", 160)),
      eventBus.on("POWERUP_ACTIVATED", () => {
        onImpact(0.12);
        this.pulse("is-power", 380);
      })
    );
  }

  update(speed: number, powers: Readonly<PowerUpSnapshot>): void {
    this.root.style.setProperty("--speed-strength", String(Math.min(1, speed / 24)));
    this.root.classList.toggle("has-rush", powers.active.rush !== undefined);
    this.root.classList.toggle("has-rocket", powers.active.rocket !== undefined);
    this.root.classList.toggle("has-magnet", powers.active.magnet !== undefined);
    this.root.classList.toggle("is-speeding", speed > 0);
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    for (const timer of this.timers) window.clearTimeout(timer);
    this.timers.clear();
    this.root.remove();
  }

  private pulse(className: string, durationMs: number): void {
    this.root.classList.remove(className);
    void this.root.offsetWidth;
    this.root.classList.add(className);
    const timer = window.setTimeout(() => {
      this.root.classList.remove(className);
      this.timers.delete(timer);
    }, durationMs);
    this.timers.add(timer);
  }
}
