export interface GameClockOptions {
  maxDeltaSeconds: number;
}

export class GameClock {
  private readonly maxDeltaSeconds: number;
  private paused = false;

  constructor(options: GameClockOptions = { maxDeltaSeconds: 0.05 }) {
    this.maxDeltaSeconds = options.maxDeltaSeconds;
  }

  tick(deltaMilliseconds: number): number {
    if (this.paused) {
      return 0;
    }

    return Math.min(deltaMilliseconds / 1000, this.maxDeltaSeconds);
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }

  isPaused(): boolean {
    return this.paused;
  }
}
