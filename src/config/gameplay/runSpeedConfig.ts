import type { RunSpeedConfig } from "../../contracts/run-speed.contract";

export const RUN_SPEED_CONFIG: Readonly<RunSpeedConfig> = Object.freeze({
  initialSpeed: 13,
  maximumSpeed: 34,
  accelerationPerSecond: 0.12,
  difficultyIncreaseInterval: 20
});
