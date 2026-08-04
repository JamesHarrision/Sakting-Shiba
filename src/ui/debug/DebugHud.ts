import type { Scene } from "@babylonjs/core/scene";
import { WORLD_VISUAL_CONFIG } from "../../config/visual/world-visual.config";
import type { PlayerVisualSnapshot } from "../../contracts/player-visual.contract";

export class DebugHud {
  private container!: HTMLDivElement;
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

  update(fps: number, snap: PlayerVisualSnapshot, activeMeshes: number, drawCalls: number): void {
    if (!this.enabled || !this.container) return;

    this.container.innerHTML = [
      `FPS: ${fps.toFixed(0)}`,
      `Lane: ${snap.positionX.toFixed(1)}`,
      `State: ${snap.state}`,
      `Y: ${snap.positionY.toFixed(2)}`,
      `Meshes: ${activeMeshes}`,
      `Draws: ${drawCalls}`,
    ].join("<br>");
  }

  toggle(): void {
    this.enabled = !this.enabled;
    if (this.enabled && !this.container) {
      this.create();
    } else if (!this.enabled && this.container) {
      this.container.remove();
    }
  }

  dispose(): void {
    this.container?.remove();
  }
}
