import { PLAYER_COLLIDER_CONFIG } from "../config/gameplay/playerColliderConfig";
import { LANE_X_POSITIONS } from "../config/gameplay/gameplayConfig";
import type {
  PlayerColliderConfig,
  PlayerColliderSnapshot
} from "../contracts/player-collider.contract";
import type { PlayerControllerSnapshot } from "../gameplay/PlayerController";

export interface PlayerColliderControllerOptions {
  readonly groundY?: number;
  readonly playerZ?: number;
  readonly config?: Readonly<PlayerColliderConfig>;
}

export class PlayerColliderController {
  private readonly config: Readonly<PlayerColliderConfig>;
  private readonly groundY: number;
  private readonly playerZ: number;
  private enabled = true;
  private snapshot: Readonly<PlayerColliderSnapshot>;

  constructor(options: PlayerColliderControllerOptions = {}) {
    this.config = options.config ?? PLAYER_COLLIDER_CONFIG;
    this.groundY = options.groundY ?? 0;
    this.playerZ = options.playerZ ?? 0;
    this.snapshot = this.createSnapshot(
      LANE_X_POSITIONS[1],
      0,
      false
    );
  }

  update(
    playerSnapshot: Readonly<PlayerControllerSnapshot>
  ): Readonly<PlayerColliderSnapshot> {
    this.snapshot = this.createSnapshot(
      playerSnapshot.x,
      playerSnapshot.y,
      playerSnapshot.isCrouching
    );
    return this.snapshot;
  }

  getSnapshot(): Readonly<PlayerColliderSnapshot> {
    return this.snapshot;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.snapshot = Object.freeze({
      ...this.snapshot,
      isEnabled: enabled
    });
  }

  reset(): void {
    this.enabled = true;
    this.snapshot = this.createSnapshot(
      LANE_X_POSITIONS[1],
      0,
      false
    );
  }

  private createSnapshot(
    playerX: number,
    playerY: number,
    isCrouching: boolean
  ): Readonly<PlayerColliderSnapshot> {
    const height = isCrouching
      ? this.config.crouchingHeight
      : this.config.standingHeight;

    return Object.freeze({
      centerX: playerX,
      centerY:
        this.groundY +
        playerY +
        this.config.centerYOffset +
        height / 2,
      centerZ: this.playerZ,
      width: this.config.width,
      height,
      depth: this.config.depth,
      pickupRadius: this.config.pickupRadius,
      isCrouching,
      isEnabled: this.enabled
    });
  }
}
