import {
  POWER_UP_CONFIG,
  type PowerUpType
} from "../config/gameplay/powerUpConfig";
import type { GameEventBus } from "../events/GameEventBus";

export interface PowerUpSnapshot {
  readonly active: Readonly<Partial<Record<PowerUpType, number>>>;
  readonly speedMultiplier: number;
  readonly isInvulnerable: boolean;
  readonly collectionDistance: number;
  readonly flightHeight: number;
}

export class PowerUpSystem {
  private readonly remaining = new Map<PowerUpType, number>();
  private paused = false;

  constructor(private readonly eventBus?: GameEventBus) {}

  activate(type: PowerUpType): void {
    const config = POWER_UP_CONFIG[type];
    this.remaining.set(type, config.durationSeconds);
    this.eventBus?.emit("POWERUP_ACTIVATED", {
      type,
      duration: config.durationSeconds
    });
  }

  update(deltaSeconds: number): void {
    if (this.paused || deltaSeconds <= 0) return;
    for (const [type, value] of this.remaining) {
      const next = Math.max(0, value - deltaSeconds);
      if (next === 0) {
        this.remaining.delete(type);
        this.eventBus?.emit("POWERUP_EXPIRED", { type });
      } else {
        this.remaining.set(type, next);
      }
    }
  }

  getSnapshot(): Readonly<PowerUpSnapshot> {
    const active: Partial<Record<PowerUpType, number>> = {};
    let speedMultiplier = 1;
    let collectionDistance = 0;
    for (const [type, remaining] of this.remaining) {
      active[type] = remaining;
      const config = POWER_UP_CONFIG[type];
      speedMultiplier = Math.max(speedMultiplier, config.speedMultiplier);
      collectionDistance = Math.max(collectionDistance, config.collectionDistance);
    }
    return Object.freeze({
      active: Object.freeze(active),
      speedMultiplier,
      isInvulnerable: this.remaining.has("rush") || this.remaining.has("rocket"),
      collectionDistance,
      flightHeight: this.remaining.has("rocket")
        ? POWER_UP_CONFIG.rocket.flightHeight
        : 0
    });
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  reset(): void {
    this.remaining.clear();
    this.paused = false;
  }
}
