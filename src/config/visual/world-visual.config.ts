import { Color3 } from "@babylonjs/core/Maths/math.color";

export interface WorldVisualConfig {
  trackWidth: number;
  trackLength: number;
  trackThickness: number;
  laneMarkerWidth: number;
  rooftopEdgeHalfWidth: number;
  guardRailHeight: number;
  /** Infinite track: length of one recycled chunk */
  trackChunkLength: number;
  /** Infinite track: number of pooled chunks (covers camera + fog range) */
  trackChunkCount: number;
  /** Debug spawn placeholder colors */
  spawnObstacleColor: string;
  spawnPickupColor: string;
  cameraHeight: number;
  cameraDistance: number;
  cameraLookAhead: number;
  cameraFov: number;
  cameraXSmoothing: number;
  cameraYSmoothing: number;
  cameraTargetYOffset: number;
  fogMode: "linear" | "exp2";
  fogStart: number;
  fogEnd: number;
  fogDensity: number;
  skyTopColor: string;
  skyHorizonColor: string;
  ambientIntensity: number;
  directionalIntensity: number;
  shadowMapSize: number;
  enableDynamicShadows: boolean;
  debugHudRefreshSeconds: number;
  showDebugHud: boolean;
  enableVignette: boolean;
  enableBloom: boolean;
}

export const WORLD_VISUAL_CONFIG: WorldVisualConfig = {
  trackWidth: 7.8,
  trackLength: 128,
  trackThickness: 0.15,
  laneMarkerWidth: 0.06,
  rooftopEdgeHalfWidth: 1.4,
  guardRailHeight: 0.35,
  trackChunkLength: 32,
  trackChunkCount: 5,
  spawnObstacleColor: "#D05545",
  spawnPickupColor: "#E8B048",
  cameraHeight: 5.6,
  cameraDistance: 10.5,
  cameraLookAhead: 9,
  cameraFov: 0.82,
  cameraXSmoothing: 5,
  cameraYSmoothing: 2,
  cameraTargetYOffset: 1.15,
  fogMode: "exp2",
  fogStart: 45,
  fogEnd: 96,
  fogDensity: 0.012,
  skyTopColor: "#8EA4B8",
  skyHorizonColor: "#E8C9A0",
  ambientIntensity: 0.45,
  directionalIntensity: 1.05,
  shadowMapSize: 1024,
  enableDynamicShadows: false,
  debugHudRefreshSeconds: 0.5,
  showDebugHud: true,
  enableVignette: false,
  enableBloom: false,
};

export function hexToColor3(hex: string): Color3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new Color3(r, g, b);
}
