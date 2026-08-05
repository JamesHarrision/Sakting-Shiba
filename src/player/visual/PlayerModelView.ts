import type { Scene } from "@babylonjs/core/scene";
import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { TransformNode } from "@babylonjs/core/Meshes/transformNode";
import type { PlayerAssetLoader, PlayerModelInstance } from "../../assets/PlayerAssetLoader";
import { PLAYER_MODEL_CONFIG } from "../../config/visual/player-model.config";

/**
 * Wraps a loaded player model with a calibration hierarchy:
 *
 * CatMount (parented to gameplay root)
 *   └── CatCalibration (scale, rotation, offset)
 *         └── ImportedCatRoot (loaded asset instance)
 *
 * BoardMount (parented to gameplay root)
 *   └── BoardCalibration
 *         └── ImportedBoardRoot
 *
 * Both mounts are siblings under the gameplay player-root transform.
 */
export class PlayerModelView {
  readonly catMount: TransformNode;
  readonly boardMount: TransformNode;

  private catCalibration!: TransformNode;
  private boardCalibration!: TransformNode;

  private catInstance: PlayerModelInstance | null = null;
  private boardInstance: PlayerModelInstance | null = null;

  private _catLoaded = false;
  private _boardLoaded = false;

  get catLoaded(): boolean {
    return this._catLoaded;
  }
  get boardLoaded(): boolean {
    return this._boardLoaded;
  }
  get isFullyLoaded(): boolean {
    return this._catLoaded && this._boardLoaded;
  }

  get catMeshes(): readonly AbstractMesh[] {
    return this.catInstance?.meshes ?? [];
  }
  get boardMeshes(): readonly AbstractMesh[] {
    return this.boardInstance?.meshes ?? [];
  }
  /** All loaded model meshes (cat + board) */
  get allMeshes(): readonly AbstractMesh[] {
    return [...this.catMeshes, ...this.boardMeshes];
  }

  constructor(
    private readonly scene: Scene,
    private readonly loader: PlayerAssetLoader,
    gameplayRoot: TransformNode,
  ) {
    const cfg = PLAYER_MODEL_CONFIG;

    // Board mount
    this.boardMount = new TransformNode("board-mount", scene);
    this.boardMount.parent = gameplayRoot;

    this.boardCalibration = new TransformNode("board-calibration", scene);
    this.boardCalibration.parent = this.boardMount;
    this.boardCalibration.position.set(
      cfg.skateboard.position.x,
      cfg.skateboard.position.y,
      cfg.skateboard.position.z,
    );
    this.boardCalibration.rotation.set(
      degToRad(cfg.skateboard.rotationDegrees.x),
      degToRad(cfg.skateboard.rotationDegrees.y),
      degToRad(cfg.skateboard.rotationDegrees.z),
    );
    this.boardCalibration.scaling.setAll(cfg.skateboard.scale);

    // Cat mount - child of board mount so cat sits on board
    this.catMount = new TransformNode("cat-mount", scene);
    this.catMount.parent = this.boardMount;
    this.catMount.position.y = cfg.catSeatHeight;

    this.catCalibration = new TransformNode("cat-calibration", scene);
    this.catCalibration.parent = this.catMount;
    this.catCalibration.position.set(
      cfg.cat.position.x,
      cfg.cat.position.y - cfg.catSeatHeight,
      cfg.cat.position.z,
    );
    this.catCalibration.rotation.set(
      degToRad(cfg.cat.rotationDegrees.x),
      degToRad(cfg.cat.rotationDegrees.y),
      degToRad(cfg.cat.rotationDegrees.z),
    );
    this.catCalibration.scaling.setAll(cfg.cat.scale);
  }

  async loadAssets(): Promise<void> {
    try {
      await Promise.all([
        this.loadCat(),
        this.loadBoard(),
      ]);
    } catch {
      // Errors logged individually
    }
  }

  private async loadCat(): Promise<void> {
    if (this._catLoaded) return;
    try {
      this.catInstance = await this.loader.createCatInstance(
        this.catCalibration,
      );
      this._catLoaded = true;
    } catch (err) {
      console.warn("[PlayerModelView] Cat model load failed, using fallback:", err);
      throw err;
    }
  }

  private async loadBoard(): Promise<void> {
    if (this._boardLoaded) return;
    try {
      this.boardInstance = await this.loader.createBoardInstance(
        this.boardCalibration,
      );
      this._boardLoaded = true;
    } catch (err) {
      console.warn("[PlayerModelView] Board model load failed, using fallback:", err);
      throw err;
    }
  }

  hideModels(): void {
    for (const m of this.allMeshes) {
      m.setEnabled(false);
    }
  }

  showModels(): void {
    for (const m of this.allMeshes) {
      m.setEnabled(true);
    }
  }

  disposeModelInstances(): void {
    this.catInstance?.dispose();
    this.boardInstance?.dispose();
    this.catInstance = null;
    this.boardInstance = null;
    this._catLoaded = false;
    this._boardLoaded = false;
  }

  dispose(): void {
    this.disposeModelInstances();
    this.catCalibration?.dispose();
    this.boardCalibration?.dispose();
    this.catMount.dispose();
    this.boardMount.dispose();
  }
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}
