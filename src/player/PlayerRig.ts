import type { Mesh } from "@babylonjs/core/Meshes/mesh";
import { MeshBuilder } from "@babylonjs/core/Meshes/meshBuilder";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import { StandardMaterial } from "@babylonjs/core/Materials/standardMaterial";
import { Color3 } from "@babylonjs/core/Maths/math.color";
import type { Scene } from "@babylonjs/core/scene";

import { PLAYER_COLLIDER_CONFIG } from "../config/gameplay/playerColliderConfig";
import { LANE_X_POSITIONS } from "../config/gameplay/gameplayConfig";
import type { PlayerColliderConfig } from "../contracts/player-collider.contract";
import type {
  PlayerAttachmentOptions,
  PlayerRigContract,
  PlayerRigNodes,
  PlayerVisualAttachment,
  PlayerVisualLoadState
} from "../contracts/player-rig.contract";
import type { PlayerColliderSnapshot } from "../contracts/player-collider.contract";
import type { PlayerVisualSnapshot } from "../contracts/player-visual.contract";

interface ManagedAttachment {
  readonly attachment: PlayerVisualAttachment;
  readonly disposeOnDetach: boolean;
}

export interface PlayerRigOptions {
  readonly parent?: TransformNode;
  readonly groundY?: number;
  readonly playerZ?: number;
  readonly cameraTargetYOffset?: number;
  readonly colliderConfig?: Readonly<PlayerColliderConfig>;
  readonly debugVisible?: boolean;
}

export class PlayerRig implements PlayerRigContract {
  readonly nodes: PlayerRigNodes;

  private readonly groundY: number;
  private readonly playerZ: number;
  private readonly cameraTargetYOffset: number;
  private readonly colliderConfig: Readonly<PlayerColliderConfig>;
  private readonly debugMaterial: StandardMaterial;
  private readonly debugMeshes: Mesh[] = [];
  private readonly bodyColliderDebugMesh: Mesh;
  private readonly pickupRadiusDebugMesh: Mesh;
  private catAttachment?: ManagedAttachment;
  private boardAttachment?: ManagedAttachment;
  private loadState: PlayerVisualLoadState = "idle";
  private loadFailureReported = false;
  private disposed = false;

  constructor(
    private readonly scene: Scene,
    options: PlayerRigOptions = {}
  ) {
    this.groundY = options.groundY ?? 0;
    this.playerZ = options.playerZ ?? 0;
    this.cameraTargetYOffset = options.cameraTargetYOffset ?? 1.15;
    this.colliderConfig = Object.freeze({
      ...(options.colliderConfig ?? PLAYER_COLLIDER_CONFIG)
    });

    const playerRoot = new TransformNode("player-root", scene);
    const colliderRoot = new TransformNode("player-collider-root", scene);
    const visualRoot = new TransformNode("player-visual-root", scene);
    const catMount = new TransformNode("player-cat-mount", scene);
    const boardMount = new TransformNode("player-board-mount", scene);
    const importedVisualContainer = new TransformNode(
      "player-imported-visual-container",
      scene
    );
    const groundAnchor = new TransformNode("player-ground-anchor", scene);
    const shadowAnchor = new TransformNode("player-shadow-anchor", scene);
    const effectAnchor = new TransformNode("player-effect-anchor", scene);
    const cameraTargetAnchor = new TransformNode(
      "player-camera-target-anchor",
      scene
    );
    const debugRoot = new TransformNode("player-debug-root", scene);

    playerRoot.parent = options.parent ?? null;
    colliderRoot.parent = playerRoot;
    visualRoot.parent = playerRoot;
    catMount.parent = visualRoot;
    boardMount.parent = visualRoot;
    importedVisualContainer.parent = visualRoot;
    groundAnchor.parent = playerRoot;
    shadowAnchor.parent = playerRoot;
    effectAnchor.parent = playerRoot;
    cameraTargetAnchor.parent = playerRoot;
    debugRoot.parent = playerRoot;

    this.nodes = Object.freeze({
      playerRoot,
      colliderRoot,
      visualRoot,
      catMount,
      boardMount,
      importedVisualContainer,
      groundAnchor,
      shadowAnchor,
      effectAnchor,
      cameraTargetAnchor,
      debugRoot
    });

    this.debugMaterial = new StandardMaterial("player-rig-debug-material", scene);
    this.debugMaterial.diffuseColor = new Color3(0.1, 0.9, 0.75);
    this.debugMaterial.emissiveColor = new Color3(0.04, 0.3, 0.24);
    this.debugMaterial.alpha = 0.55;
    this.debugMaterial.wireframe = true;
    this.debugMaterial.disableLighting = true;
    this.debugMaterial.backFaceCulling = false;

    this.bodyColliderDebugMesh = this.createBodyColliderDebugMesh();
    this.pickupRadiusDebugMesh = this.createPickupRadiusDebugMesh();
    this.createAnchorDebugMeshes();
    this.reset();
    this.setDebugVisible(options.debugVisible ?? false);
  }

  get visualLoadState(): PlayerVisualLoadState {
    return this.loadState;
  }

  applyGameplayState(
    visualSnapshot: Readonly<PlayerVisualSnapshot>,
    colliderSnapshot: Readonly<PlayerColliderSnapshot>
  ): void {
    this.assertActive();

    const { playerRoot, groundAnchor, shadowAnchor, effectAnchor } = this.nodes;
    playerRoot.position.set(
      visualSnapshot.positionX,
      this.groundY + visualSnapshot.positionY,
      this.playerZ
    );

    const groundCompensation = -visualSnapshot.positionY;
    groundAnchor.position.y = groundCompensation;
    shadowAnchor.position.y = groundCompensation;
    effectAnchor.position.y = groundCompensation;

    this.applyColliderSnapshot(colliderSnapshot);
    this.updateDebugAnchorPositions();
  }

  attachCat(
    attachment: TransformNode | PlayerVisualAttachment,
    options: PlayerAttachmentOptions = {}
  ): void {
    this.catAttachment = this.attach(
      this.catAttachment,
      this.boardAttachment,
      attachment,
      this.nodes.catMount,
      options
    );
  }

  attachBoard(
    attachment: TransformNode | PlayerVisualAttachment,
    options: PlayerAttachmentOptions = {}
  ): void {
    this.boardAttachment = this.attach(
      this.boardAttachment,
      this.catAttachment,
      attachment,
      this.nodes.boardMount,
      options
    );
  }

  detachVisuals(): void {
    this.catAttachment = this.detach(this.catAttachment);
    this.boardAttachment = this.detach(this.boardAttachment);
  }

  setDebugVisible(visible: boolean): void {
    this.assertActive();
    this.nodes.debugRoot.setEnabled(visible);

    for (const mesh of this.debugMeshes) {
      mesh.setEnabled(visible);
    }
  }

  setVisualLoadState(state: PlayerVisualLoadState): void {
    this.assertActive();
    this.loadState = state;

    if (state === "loading") {
      this.loadFailureReported = false;
    }
  }

  reportVisualLoadFailure(error: unknown, useFallback = true): void {
    this.assertActive();

    if (!this.loadFailureReported) {
      console.error("[PlayerRig] Player visual failed to load.", error);
      this.loadFailureReported = true;
    }

    this.loadState = useFallback ? "fallback" : "failed";
  }

  reset(): void {
    this.assertActive();

    const {
      playerRoot,
      colliderRoot,
      visualRoot,
      catMount,
      boardMount,
      importedVisualContainer,
      groundAnchor,
      shadowAnchor,
      effectAnchor,
      cameraTargetAnchor,
      debugRoot
    } = this.nodes;

    playerRoot.position.set(LANE_X_POSITIONS[1], this.groundY, this.playerZ);
    playerRoot.rotation.set(0, 0, 0);
    playerRoot.scaling.setAll(1);
    colliderRoot.position.set(0, 0, 0);
    colliderRoot.rotation.set(0, 0, 0);
    colliderRoot.scaling.setAll(1);
    visualRoot.position.set(0, 0, 0);
    visualRoot.rotation.set(0, 0, 0);
    visualRoot.scaling.setAll(1);
    importedVisualContainer.position.set(0, 0, 0);
    importedVisualContainer.rotation.set(0, 0, 0);
    importedVisualContainer.scaling.setAll(1);
    groundAnchor.position.set(0, 0, 0);
    shadowAnchor.position.set(0, 0, 0);
    effectAnchor.position.set(0, 0, 0);
    cameraTargetAnchor.position.set(0, this.cameraTargetYOffset, 0);
    debugRoot.position.set(0, 0, 0);
    debugRoot.rotation.set(0, 0, 0);
    debugRoot.scaling.setAll(1);

    this.applyStandingColliderDebugState();
    this.catAttachment?.attachment.resetVisualState();
    this.boardAttachment?.attachment.resetVisualState();
    this.updateDebugAnchorPositions();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.detachVisuals();
    this.disposed = true;
    this.nodes.playerRoot.dispose(false, false);
    this.debugMaterial.dispose();
    this.debugMeshes.length = 0;
  }

  isDisposed(): boolean {
    return this.disposed || this.nodes.playerRoot.isDisposed();
  }

  private createBodyColliderDebugMesh(): Mesh {
    const mesh = MeshBuilder.CreateBox(
      "player-body-collider-debug",
      {
        width: this.colliderConfig.width,
        height: this.colliderConfig.standingHeight,
        depth: this.colliderConfig.depth
      },
      this.scene
    );
    mesh.parent = this.nodes.colliderRoot;
    mesh.material = this.debugMaterial;
    mesh.isPickable = false;
    mesh.receiveShadows = false;
    this.debugMeshes.push(mesh);
    return mesh;
  }

  private createPickupRadiusDebugMesh(): Mesh {
    const mesh = MeshBuilder.CreateSphere(
      "player-pickup-radius-debug",
      { diameter: this.colliderConfig.pickupRadius * 2, segments: 12 },
      this.scene
    );
    mesh.parent = this.nodes.colliderRoot;
    mesh.material = this.debugMaterial;
    mesh.isPickable = false;
    mesh.receiveShadows = false;
    this.debugMeshes.push(mesh);
    return mesh;
  }

  private createAnchorDebugMeshes(): void {
    const anchorNames = [
      "ground",
      "shadow",
      "effect",
      "camera-target",
      "cat-mount",
      "board-mount"
    ];

    for (const name of anchorNames) {
      const marker = MeshBuilder.CreateBox(
        `player-${name}-debug`,
        { size: name === "camera-target" ? 0.14 : 0.1 },
        this.scene
      );
      marker.parent = this.nodes.debugRoot;
      marker.material = this.debugMaterial;
      marker.isPickable = false;
      marker.receiveShadows = false;
      this.debugMeshes.push(marker);
    }
  }

  private applyColliderSnapshot(snapshot: Readonly<PlayerColliderSnapshot>): void {
    const localCenterX = snapshot.centerX - this.nodes.playerRoot.position.x;
    const localCenterY = snapshot.centerY - this.nodes.playerRoot.position.y;
    const localCenterZ = snapshot.centerZ - this.nodes.playerRoot.position.z;

    this.nodes.colliderRoot.setEnabled(snapshot.isEnabled);
    this.bodyColliderDebugMesh.position.set(
      localCenterX,
      localCenterY,
      localCenterZ
    );
    this.bodyColliderDebugMesh.scaling.set(
      snapshot.width / this.colliderConfig.width,
      snapshot.height / this.colliderConfig.standingHeight,
      snapshot.depth / this.colliderConfig.depth
    );
    this.pickupRadiusDebugMesh.position.copyFrom(
      this.bodyColliderDebugMesh.position
    );
    this.pickupRadiusDebugMesh.scaling.setAll(
      snapshot.pickupRadius / this.colliderConfig.pickupRadius
    );
  }

  private applyStandingColliderDebugState(): void {
    this.nodes.colliderRoot.setEnabled(true);
    this.bodyColliderDebugMesh.position.set(
      0,
      this.colliderConfig.centerYOffset +
        this.colliderConfig.standingHeight / 2,
      0
    );
    this.bodyColliderDebugMesh.scaling.setAll(1);
    this.pickupRadiusDebugMesh.position.copyFrom(
      this.bodyColliderDebugMesh.position
    );
    this.pickupRadiusDebugMesh.scaling.setAll(1);
  }

  private updateDebugAnchorPositions(): void {
    const groundMarker = this.debugMeshes[2];
    const shadowMarker = this.debugMeshes[3];
    const effectMarker = this.debugMeshes[4];
    const cameraMarker = this.debugMeshes[5];
    const catMarker = this.debugMeshes[6];
    const boardMarker = this.debugMeshes[7];

    groundMarker?.position.copyFrom(this.nodes.groundAnchor.position);
    shadowMarker?.position.copyFrom(this.nodes.shadowAnchor.position);
    effectMarker?.position.copyFrom(this.nodes.effectAnchor.position);
    cameraMarker?.position.copyFrom(this.nodes.cameraTargetAnchor.position);
    catMarker?.position.copyFrom(this.nodes.catMount.position);
    boardMarker?.position.copyFrom(this.nodes.boardMount.position);
  }

  private attach(
    current: ManagedAttachment | undefined,
    other: ManagedAttachment | undefined,
    value: TransformNode | PlayerVisualAttachment,
    mount: TransformNode,
    options: PlayerAttachmentOptions
  ): ManagedAttachment {
    this.assertActive();
    const attachment = normalizeAttachment(value);

    if (other?.attachment.root === attachment.root) {
      throw new Error("A player visual root cannot be attached to both mounts.");
    }

    if (current?.attachment.root === attachment.root) {
      return current;
    }

    this.detach(current);
    attachment.root.parent = mount;
    attachment.root.position.set(0, 0, 0);
    attachment.root.rotation.set(0, 0, 0);
    attachment.root.scaling.setAll(1);
    attachment.resetVisualState();

    return {
      attachment,
      disposeOnDetach: options.disposeOnDetach ?? true
    };
  }

  private detach(
    managed: ManagedAttachment | undefined
  ): ManagedAttachment | undefined {
    if (!managed) {
      return undefined;
    }

    if (managed.disposeOnDetach) {
      managed.attachment.dispose();
    } else if (!managed.attachment.root.isDisposed()) {
      managed.attachment.root.parent = null;
    }

    return undefined;
  }

  private assertActive(): void {
    if (this.disposed) {
      throw new Error("PlayerRig has already been disposed.");
    }
  }
}

function normalizeAttachment(
  value: TransformNode | PlayerVisualAttachment
): PlayerVisualAttachment {
  if ("root" in value) {
    return value;
  }

  return {
    root: value,
    resetVisualState: () => {},
    dispose: () => value.dispose()
  };
}
