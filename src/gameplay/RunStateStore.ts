import { GAMEPLAY_CONFIG } from "../config/gameplay/gameplayConfig";
import type { RunState } from "../contracts/gameplay";
import { GameEventBus } from "../events/GameEventBus";

export class RunStateStore {
  private state: RunState = RunStateStore.createInitialState();

  constructor(private readonly eventBus: GameEventBus) {}

  startRun(): void {
    this.state = RunStateStore.createInitialState();
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
    this.state.score = Math.floor(this.state.distance) + this.state.fish * 10;
    this.emitScoreChanged();
  }

  collectFish(amount = 1): void {
    if (this.state.isGameOver || amount <= 0) {
      return;
    }

    this.state.fish += amount;
    this.state.score += amount * 10;
    this.eventBus.emit("FISH_COLLECTED", {
      amount,
      totalFish: this.state.fish
    });
    this.emitScoreChanged();
  }

  setSpeed(speed: number): void {
    this.state.speed = Math.min(
      Math.max(speed, 0),
      GAMEPLAY_CONFIG.maximumSpeed
    );
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
      fish: 0,
      speed: GAMEPLAY_CONFIG.initialSpeed,
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
