export interface PlayerColliderConfig {
  readonly width: number;
  readonly standingHeight: number;
  readonly crouchingHeight: number;
  readonly depth: number;
  readonly centerYOffset: number;
  readonly pickupRadius: number;
}

export interface PlayerColliderSnapshot {
  readonly centerX: number;
  readonly centerY: number;
  readonly centerZ: number;
  readonly width: number;
  readonly height: number;
  readonly depth: number;
  readonly pickupRadius: number;
  readonly isCrouching: boolean;
  readonly isEnabled: boolean;
}
