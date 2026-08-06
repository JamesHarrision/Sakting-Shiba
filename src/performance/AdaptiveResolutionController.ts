import {
  PERFORMANCE_CONFIG,
  type PerformanceConfig
} from "../config/visual/performance.config";

export class AdaptiveResolutionController {
  private elapsedSeconds = 0;
  private frameCount = 0;
  private scalingLevel: number;

  constructor(
    private readonly applyScalingLevel: (level: number) => void,
    private readonly config: Readonly<PerformanceConfig> = PERFORMANCE_CONFIG
  ) {
    this.scalingLevel = config.initialHardwareScalingLevel;
    this.applyScalingLevel(this.scalingLevel);
  }

  update(deltaSeconds: number): void {
    if (!Number.isFinite(deltaSeconds) || deltaSeconds <= 0) return;

    this.elapsedSeconds += deltaSeconds;
    this.frameCount += 1;
    if (this.elapsedSeconds < this.config.sampleWindowSeconds) return;

    const measuredFps = this.frameCount / this.elapsedSeconds;
    const lowThreshold = this.config.targetFps * this.config.lowFpsRatio;
    const highThreshold = this.config.targetFps * this.config.highFpsRatio;

    if (measuredFps < lowThreshold) {
      this.setScalingLevel(this.scalingLevel + this.config.scalingStep);
    } else if (measuredFps > highThreshold) {
      this.setScalingLevel(this.scalingLevel - this.config.scalingStep);
    }

    this.elapsedSeconds = 0;
    this.frameCount = 0;
  }

  getScalingLevel(): number {
    return this.scalingLevel;
  }

  private setScalingLevel(nextLevel: number): void {
    const clamped = Math.min(
      this.config.maximumHardwareScalingLevel,
      Math.max(this.config.minimumHardwareScalingLevel, nextLevel)
    );
    if (Math.abs(clamped - this.scalingLevel) < 0.001) return;
    this.scalingLevel = clamped;
    this.applyScalingLevel(clamped);
  }
}
