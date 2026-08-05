export interface RunSpeedConfig {
  readonly initialSpeed: number;
  readonly maximumSpeed: number;
  readonly accelerationPerSecond: number;
  readonly difficultyIncreaseInterval: number;
}

export interface RunSpeedSnapshot {
  readonly currentSpeed: number;
  readonly difficulty: number;
  readonly isPaused: boolean;
}
