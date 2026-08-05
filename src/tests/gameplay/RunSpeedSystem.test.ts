import { describe, expect, it } from "vitest";

import type { RunSpeedConfig } from "../../contracts/run-speed.contract";
import { RunSpeedSystem } from "../../gameplay/RunSpeedSystem";

const CONFIG: RunSpeedConfig = {
  initialSpeed: 10,
  maximumSpeed: 20,
  accelerationPerSecond: 2,
  difficultyIncreaseInterval: 5
};

describe("RunSpeedSystem", () => {
  it("increases speed using delta seconds", () => {
    const system = new RunSpeedSystem(CONFIG);
    system.update(2.5);
    expect(system.getCurrentSpeed()).toBe(15);
  });

  it("never exceeds maximum speed", () => {
    const system = new RunSpeedSystem(CONFIG);
    system.update(100);
    expect(system.getCurrentSpeed()).toBe(CONFIG.maximumSpeed);
  });

  it("does not progress speed or difficulty while paused", () => {
    const system = new RunSpeedSystem(CONFIG);
    system.update(4);
    system.pause();
    const speedBeforePause = system.getCurrentSpeed();
    const difficultyBeforePause = system.getDifficulty();

    system.update(100);

    expect(system.getCurrentSpeed()).toBe(speedBeforePause);
    expect(system.getDifficulty()).toBe(difficultyBeforePause);
  });

  it("resets speed, difficulty, and pause state", () => {
    const system = new RunSpeedSystem(CONFIG);
    system.update(12);
    system.pause();
    system.reset();

    expect(system.getSnapshot()).toEqual({
      currentSpeed: CONFIG.initialSpeed,
      difficulty: 0,
      isPaused: false
    });
  });

  it("increases difficulty at each configured interval", () => {
    const system = new RunSpeedSystem(CONFIG);
    system.update(4.9);
    expect(system.getDifficulty()).toBe(0);
    system.update(0.1);
    expect(system.getDifficulty()).toBe(1);
    system.update(10);
    expect(system.getDifficulty()).toBe(3);
  });
});
