import { RUN_SPEED_CONFIG } from "../config/gameplay/runSpeedConfig";
import type { RunState } from "../contracts/gameplay";
import { GameEventBus } from "../events/GameEventBus";

export class RunStateStore {
  private state: RunState = RunStateStore.createInitialState();
  private scoreMultiplier = 1;
  private distanceScoreRemainder = 0;

  constructor(private readonly eventBus: GameEventBus) {}

  startRun(): void {
    this.state = RunStateStore.createInitialState();
    this.scoreMultiplier = 1;
    this.distanceScoreRemainder = 0;
    this.eventBus.emit("RUN_STARTED", { state: this.getSnapshot() });
    this.emitScoreChanged();
  }

  pauseRun(): void {
    this.eventBus.emit("RUN_PAUSED", { state: this.getSnapshot() });
  }

  resumeRun(): void {
    this.eventBus.emit("RUN_RESUMED", { state: this.getSnapshot() });
  }

  addDistance(deltaDistance: number): void {
    if (this.state.isGameOver || deltaDistance <= 0) {
      return;
    }

    this.state.distance += deltaDistance;
    this.distanceScoreRemainder += deltaDistance * this.scoreMultiplier;
    const earnedScore = Math.floor(this.distanceScoreRemainder);
    if (earnedScore <= 0) return;
    this.distanceScoreRemainder -= earnedScore;
    this.state.score += earnedScore;
    this.emitScoreChanged();
  }

  collectCoins(amount = 1): void {
    if (this.state.isGameOver || amount <= 0) {
      return;
    }

    this.state.coins += amount;
    this.state.score += amount * 10 * this.scoreMultiplier;
    this.eventBus.emit("COIN_COLLECTED", {
      amount,
      totalCoins: this.state.coins
    });
    this.emitScoreChanged();
  }

  setSpeed(speed: number): void {
    this.state.speed = Math.min(
      Math.max(speed, 0),
      RUN_SPEED_CONFIG.maximumSpeed * 1.5
    );
  }

  setScoreMultiplier(multiplier: number): void {
    this.scoreMultiplier = Math.max(1, multiplier);
  }

  setCombo(combo: number): void {
    this.state.combo = Math.max(0, Math.floor(combo));
    this.emitScoreChanged();
  }

  endRun(): void {
    if (this.state.isGameOver) {
      return;
    }

    this.state.isGameOver = true;
    this.eventBus.emit("RUN_ENDED", { state: this.getSnapshot() });
  }

  getSnapshot(): RunState {
    return { ...this.state };
  }

  static createInitialState(): RunState {
    return {
      distance: 0,
      score: 0,
      coins: 0,
      speed: RUN_SPEED_CONFIG.initialSpeed,
      combo: 0,
      isGameOver: false
    };
  }

  private emitScoreChanged(): void {
    this.eventBus.emit("SCORE_CHANGED", {
      score: this.state.score,
      distance: this.state.distance,
      combo: this.state.combo
    });
  }
}
