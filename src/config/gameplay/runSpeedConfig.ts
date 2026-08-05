import type { RunSpeedConfig } from "../../contracts/run-speed.contract";

export const RUN_SPEED_CONFIG: Readonly<RunSpeedConfig> = Object.freeze({
  initialSpeed: 10,
  maximumSpeed: 28,
  accelerationPerSecond: 0.08,
  difficultyIncreaseInterval: 20
});
