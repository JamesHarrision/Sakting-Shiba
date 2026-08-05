import type { PlayerColliderConfig } from "../../contracts/player-collider.contract";

export const PLAYER_COLLIDER_CONFIG: Readonly<PlayerColliderConfig> =
  Object.freeze({
    width: 0.9,
    standingHeight: 1.65,
    crouchingHeight: 0.9,
    depth: 1.05,
    centerYOffset: 0,
    pickupRadius: 1.4
  });
