import type { TransformNode } from "@babylonjs/core/Meshes/transformNode";

import type { PlayerColliderSnapshot } from "./player-collider.contract";
import type { PlayerVisualSnapshot } from "./player-visual.contract";

export type PlayerVisualLoadState =
  | "idle"
  | "loading"
  | "loaded"
  | "fallback"
  | "failed";

export interface PlayerRigNodes {
  readonly playerRoot: TransformNode;
  readonly colliderRoot: TransformNode;
  readonly visualRoot: TransformNode;
  readonly catMount: TransformNode;
  readonly boardMount: TransformNode;
  readonly importedVisualContainer: TransformNode;
  readonly groundAnchor: TransformNode;
  readonly shadowAnchor: TransformNode;
  readonly effectAnchor: TransformNode;
  readonly cameraTargetAnchor: TransformNode;
  readonly debugRoot: TransformNode;
}

export interface PlayerVisualAttachment {
  readonly root: TransformNode;
  resetVisualState(): void;
  dispose(): void;
}

export interface PlayerAttachmentOptions {
  readonly disposeOnDetach?: boolean;
}

export interface PlayerRigContract {
  readonly nodes: PlayerRigNodes;
  readonly visualLoadState: PlayerVisualLoadState;

  applyGameplayState(
    visualSnapshot: Readonly<PlayerVisualSnapshot>,
    colliderSnapshot: Readonly<PlayerColliderSnapshot>
  ): void;
  attachCat(
    attachment: TransformNode | PlayerVisualAttachment,
    options?: PlayerAttachmentOptions
  ): void;
  attachBoard(
    attachment: TransformNode | PlayerVisualAttachment,
    options?: PlayerAttachmentOptions
  ): void;
  detachVisuals(): void;
  setDebugVisible(visible: boolean): void;
  setVisualLoadState(state: PlayerVisualLoadState): void;
  reportVisualLoadFailure(error: unknown, useFallback?: boolean): void;
  reset(): void;
  dispose(): void;
}
