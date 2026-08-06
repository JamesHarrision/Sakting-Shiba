import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";
import type { PlayerVisualSnapshot } from "../../contracts/player-visual.contract";
import type { AssetLoadState } from "../../assets/PlayerAssetLoader";
import type { TrackDebugStats } from "../../contracts/track.contract";
import type { FrameRateSnapshot } from "../../performance/FrameRateStats";

export interface DebugAssetInfo {
  catLoaded: boolean;
  boardLoaded: boolean;
  isModelFull: boolean;
  catState: AssetLoadState;
  boardState: AssetLoadState;
}

export interface DebugPerformanceInfo extends FrameRateSnapshot {
  readonly hardwareScalingLevel: number;
}

export class DebugHud {
  private container?: HTMLDivElement;
  private enabled: boolean;

  constructor() {
    this.enabled = WORLD_VISUAL_CONFIG.showDebugHud;
    if (this.enabled) {
      this.create();
    }
  }

  private create(): void {
    this.container = document.createElement("div");
    this.container.id = "debug-hud";
    Object.assign(this.container.style, {
      position: "fixed",
      top: "8px",
      left: "8px",
      padding: "8px 12px",
      background: "rgba(0,0,0,0.55)",
      color: "#e0e0e0",
      fontFamily: "Consolas, monospace",
      fontSize: "11px",
      lineHeight: "1.5",
      borderRadius: "6px",
      zIndex: "1000",
      pointerEvents: "none",
      userSelect: "none",
    });
    document.body.appendChild(this.container);
  }

  update(
    performance: Readonly<DebugPerformanceInfo>,
    snap: PlayerVisualSnapshot,
    activeMeshes: number,
    assetInfo?: DebugAssetInfo,
    trackInfo?: TrackDebugStats,
  ): void {
    if (!this.enabled || !this.container) return;

    const lines = [
      `FPS: ${performance.currentFps.toFixed(0)} | min ${performance.minimumFps.toFixed(0)} | avg ${performance.averageFps.toFixed(0)}`,
      `Render scale: ${(100 / performance.hardwareScalingLevel).toFixed(0)}%`,
      `Lane: ${snap.laneIndex}`,
      `State: ${snap.state}`,
      `Y: ${snap.positionY.toFixed(2)}`,
      `Meshes: ${activeMeshes}`,
    ];

    if (assetInfo) {
      const catMark = assetInfo.catLoaded ? "v" : "x";
      const boardMark = assetInfo.boardLoaded ? "v" : "x";
      lines.push(
        `Cat: ${catMark} (${assetInfo.catState})`,
        `Board: ${boardMark} (${assetInfo.boardState})`,
        assetInfo.isModelFull ? "Model: LOADED" : "Model: fallback",
      );
    }

    if (trackInfo) {
      lines.push(
        `Chunks: ${trackInfo.activeChunks} (pooled ${trackInfo.pooledChunks})`,
        `Spawns: ${trackInfo.activeObstacles}obs ${trackInfo.activePickups}pick`,
        `Speed: ${trackInfo.speed.toFixed(1)}`,
        `FurthestZ: ${trackInfo.furthestChunkZ.toFixed(0)}`,
      );
    }

    this.container.innerHTML = lines.join("<br>");
  }

  toggle(): void {
    this.enabled = !this.enabled;
    if (this.enabled && !this.container) {
      this.create();
    } else if (!this.enabled && this.container) {
      this.container.remove();
      this.container = undefined;
    }
  }

  dispose(): void {
    this.container?.remove();
    this.container = undefined;
  }
}
