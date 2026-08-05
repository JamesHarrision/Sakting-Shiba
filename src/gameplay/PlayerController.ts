import {
  GAMEPLAY_CONFIG,
  LANE_X_POSITIONS
} from "../config/gameplay/gameplayConfig";
import type {
  InputSnapshot,
  LaneIndex,
  PlayerState
} from "../contracts/gameplay";
import type { PlayerVisualSnapshot } from "../contracts/player-visual.contract";
import type { PlayerCameraTargetSnapshot } from "../contracts/player-camera-target.contract";
import { GameEventBus } from "../events/GameEventBus";

export interface PlayerControllerSnapshot {
  lane: LaneIndex;
  x: number;
  y: number;
  state: PlayerState;
  isGrounded: boolean;
  isCrouching: boolean;
  isSwitchingLane: boolean;
  verticalVelocity: number;
  crouchProgress: number;
}

export interface PlayerControllerOptions {
  initialLane?: LaneIndex;
}

export class PlayerController {
  private targetLane: LaneIndex;
  private x: number;
  private y = 0;
  private verticalVelocity = 0;
  private state: PlayerState = "running";
  private laneSwitchStartX = 0;
  private laneSwitchElapsed = 0;
  private crouchTimeRemaining = 0;

  constructor(
    private readonly eventBus: GameEventBus,
    options: PlayerControllerOptions = {}
  ) {
    this.targetLane = options.initialLane ?? 1;
    this.x = LANE_X_POSITIONS[this.targetLane];
    this.laneSwitchStartX = this.x;
  }

  update(input: InputSnapshot, deltaSeconds: number): PlayerControllerSnapshot {
    const safeDeltaSeconds = Math.max(0, deltaSeconds);

    this.handleLaneInput(input);
    this.handleJumpInput(input);
    this.handleCrouchInput(input);
    this.updateLaneSwitch(safeDeltaSeconds);
    this.updateVerticalMovement(safeDeltaSeconds);
    this.updateCrouch(safeDeltaSeconds);
    this.setState(this.resolveState());

    return this.getSnapshot();
  }

  reset(): void {
    this.targetLane = 1;
    this.x = LANE_X_POSITIONS[1];
    this.y = 0;
    this.verticalVelocity = 0;
    this.laneSwitchStartX = this.x;
    this.laneSwitchElapsed = 0;
    this.crouchTimeRemaining = 0;
    this.setState("running");
  }

  getSnapshot(): PlayerControllerSnapshot {
    return {
      lane: this.targetLane,
      x: this.x,
      y: this.y,
      state: this.state,
      isGrounded: this.isGrounded(),
      isCrouching: this.isCrouching(),
      isSwitchingLane: this.isSwitchingLane(),
      verticalVelocity: this.verticalVelocity,
      crouchProgress: Math.min(
        1,
        this.crouchTimeRemaining / GAMEPLAY_CONFIG.crouchDuration
      )
    };
  }

  getVisualSnapshot(): PlayerVisualSnapshot {
    const snapshot = this.getSnapshot();
    const targetX = LANE_X_POSITIONS[snapshot.lane];

    return Object.freeze({
      laneIndex: snapshot.lane,
      positionX: snapshot.x,
      positionY: snapshot.y,
      verticalVelocity: snapshot.verticalVelocity,
      state: snapshot.state,
      horizontalDirection: snapshot.isSwitchingLane
        ? Math.sign(targetX - snapshot.x) as -1 | 1
        : 0,
      isGrounded: snapshot.isGrounded,
      isCrouching: snapshot.isCrouching,
      crouchProgress: snapshot.crouchProgress
    });
  }

  getCameraTargetSnapshot(
    isPaused = false
  ): Readonly<PlayerCameraTargetSnapshot> {
    const snapshot = this.getSnapshot();

    return Object.freeze({
      targetX: snapshot.x,
      targetY: snapshot.y,
      targetZ: 0,
      isPaused
    });
  }

  private handleLaneInput(input: InputSnapshot): void {
    if (this.isSwitchingLane() || input.moveLeft === input.moveRight) {
      return;
    }

    const direction = input.moveLeft ? -1 : 1;
    const nextLane = clampLane(this.targetLane + direction);

    if (nextLane === this.targetLane) {
      return;
    }

    const previousLane = this.targetLane;
    this.targetLane = nextLane;
    this.laneSwitchStartX = this.x;
    this.laneSwitchElapsed = 0;

    this.eventBus.emit("LANE_CHANGED", {
      from: previousLane,
      to: nextLane
    });
  }

  private handleJumpInput(input: InputSnapshot): void {
    if (!input.jump || !this.isGrounded() || this.isCrouching()) {
      return;
    }

    this.verticalVelocity = Math.sqrt(
      2 * Math.abs(GAMEPLAY_CONFIG.gravity) * GAMEPLAY_CONFIG.jumpHeight
    );

    this.eventBus.emit("PLAYER_JUMPED", {
      lane: this.targetLane
    });
  }

  private handleCrouchInput(input: InputSnapshot): void {
    if (
      !input.crouch ||
      !this.isGrounded() ||
      this.verticalVelocity !== 0
    ) {
      return;
    }

    this.crouchTimeRemaining = GAMEPLAY_CONFIG.crouchDuration;
  }

  private updateLaneSwitch(deltaSeconds: number): void {
    if (!this.isSwitchingLane()) {
      return;
    }

    this.laneSwitchElapsed += deltaSeconds;
    const progress = Math.min(
      this.laneSwitchElapsed / GAMEPLAY_CONFIG.laneSwitchDuration,
      1
    );
    const easedProgress = smoothStep(progress);
    this.x = lerp(
      this.laneSwitchStartX,
      LANE_X_POSITIONS[this.targetLane],
      easedProgress
    );

    if (progress >= 1) {
      this.x = LANE_X_POSITIONS[this.targetLane];
    }
  }

  private updateVerticalMovement(deltaSeconds: number): void {
    if (this.isGrounded() && this.verticalVelocity === 0) {
      return;
    }

    const wasGrounded = this.isGrounded();
    this.verticalVelocity += GAMEPLAY_CONFIG.gravity * deltaSeconds;
    this.y += this.verticalVelocity * deltaSeconds;

    if (this.y <= 0) {
      this.y = 0;
      this.verticalVelocity = 0;

      if (!wasGrounded) {
        this.eventBus.emit("PLAYER_LANDED", {
          lane: this.targetLane,
          perfect: true
        });
      }
    }
  }

  private updateCrouch(deltaSeconds: number): void {
    if (this.crouchTimeRemaining <= 0) {
      return;
    }

    this.crouchTimeRemaining = Math.max(
      0,
      this.crouchTimeRemaining - deltaSeconds
    );
  }

  private resolveState(): PlayerState {
    if (!this.isGrounded()) {
      return "jumping";
    }

    if (this.isCrouching()) {
      return "crouching";
    }

    if (this.isSwitchingLane()) {
      return "switching_lane";
    }

    return "running";
  }

  private setState(nextState: PlayerState): void {
    if (nextState === this.state) {
      return;
    }

    const previousState = this.state;
    this.state = nextState;
    this.eventBus.emit("PLAYER_STATE_CHANGED", {
      from: previousState,
      to: nextState
    });
  }

  private isGrounded(): boolean {
    return this.y <= 0;
  }

  private isCrouching(): boolean {
    return this.crouchTimeRemaining > 0;
  }

  private isSwitchingLane(): boolean {
    return this.x !== LANE_X_POSITIONS[this.targetLane];
  }
}

function clampLane(lane: number): LaneIndex {
  return Math.min(Math.max(lane, 0), 2) as LaneIndex;
}

function lerp(from: number, to: number, progress: number): number {
  return from + (to - from) * progress;
}

function smoothStep(progress: number): number {
  return progress * progress * (3 - 2 * progress);
}
