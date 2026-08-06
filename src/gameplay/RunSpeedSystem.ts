import { RUN_SPEED_CONFIG } from "../config/gameplay/runSpeedConfig";
import type {
  RunSpeedConfig,
  RunSpeedSnapshot
} from "../contracts/run-speed.contract";

export class RunSpeedSystem {
  private currentSpeed: number;
  private activeElapsedSeconds = 0;
  private paused = false;

  constructor(
    private readonly config: Readonly<RunSpeedConfig> = RUN_SPEED_CONFIG
  ) {
    assertValidConfig(config);
    this.currentSpeed = config.initialSpeed;
  }

  update(deltaSeconds: number): void {
    if (this.paused) return;

    const safeDeltaSeconds = Number.isFinite(deltaSeconds)
      ? Math.max(0, deltaSeconds)
      : 0;
    if (safeDeltaSeconds === 0) return;

    this.activeElapsedSeconds += safeDeltaSeconds;
    this.currentSpeed = Math.min(
      this.config.maximumSpeed,
      this.currentSpeed + this.config.accelerationPerSecond * safeDeltaSeconds
    );
  }

  getCurrentSpeed(): number {
    return this.currentSpeed;
  }

  getDifficulty(): number {
    return Math.floor(
      this.activeElapsedSeconds / this.config.difficultyIncreaseInterval
    );
  }

  getSnapshot(): Readonly<RunSpeedSnapshot> {
    return Object.freeze({
      currentSpeed: this.currentSpeed,
      difficulty: this.getDifficulty(),
      isPaused: this.paused
    });
  }

  reset(): void {
    this.currentSpeed = this.config.initialSpeed;
    this.activeElapsedSeconds = 0;
    this.paused = false;
  }

  pause(): void {
    this.paused = true;
  }

  resume(): void {
    this.paused = false;
  }
}

function assertValidConfig(config: Readonly<RunSpeedConfig>): void {
  const values = [
    config.initialSpeed,
    config.maximumSpeed,
    config.accelerationPerSecond,
    config.difficultyIncreaseInterval
  ];

  if (values.some((value) => !Number.isFinite(value))) {
    throw new Error("RunSpeedConfig values must be finite numbers.");
  }
  if (config.initialSpeed < 0 || config.maximumSpeed < config.initialSpeed) {
    throw new Error("RunSpeedConfig speed bounds are invalid.");
  }
  if (config.accelerationPerSecond < 0) {
    throw new Error("RunSpeedConfig acceleration cannot be negative.");
  }
  if (config.difficultyIncreaseInterval <= 0) {
    throw new Error("Difficulty increase interval must be greater than zero.");
  }
}
