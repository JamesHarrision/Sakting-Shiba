export interface PerformanceConfig {
  readonly targetFps: number;
  readonly initialHardwareScalingLevel: number;
  readonly minimumHardwareScalingLevel: number;
  readonly maximumHardwareScalingLevel: number;
  readonly sampleWindowSeconds: number;
  readonly scalingStep: number;
  readonly lowFpsRatio: number;
  readonly highFpsRatio: number;
}

export const PERFORMANCE_CONFIG: Readonly<PerformanceConfig> = Object.freeze({
  targetFps: 120,
  initialHardwareScalingLevel: 1.35,
  minimumHardwareScalingLevel: 1,
  maximumHardwareScalingLevel: 2.25,
  sampleWindowSeconds: 1.5,
  scalingStep: 0.15,
  lowFpsRatio: 0.9,
  highFpsRatio: 1.08
});
