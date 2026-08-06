import type { LaneIndex, PlayerState, RunState } from "../contracts/gameplay";
import type { PowerUpType } from "../config/gameplay/powerUpConfig";

export const GAME_EVENTS = {
  RUN_STARTED: "RUN_STARTED",
  RUN_PAUSED: "RUN_PAUSED",
  RUN_RESUMED: "RUN_RESUMED",
  PLAYER_JUMPED: "PLAYER_JUMPED",
  PLAYER_LANDED: "PLAYER_LANDED",
  PLAYER_HIT: "PLAYER_HIT",
  PLAYER_STATE_CHANGED: "PLAYER_STATE_CHANGED",
  LANE_CHANGED: "LANE_CHANGED",
  COIN_COLLECTED: "COIN_COLLECTED",
  POWERUP_ACTIVATED: "POWERUP_ACTIVATED",
  POWERUP_EXPIRED: "POWERUP_EXPIRED",
  SCORE_CHANGED: "SCORE_CHANGED",
  RUN_ENDED: "RUN_ENDED"
} as const;

export type GameEventName = keyof typeof GAME_EVENTS;

export interface GameEventPayloads {
  RUN_STARTED: { state: RunState };
  RUN_PAUSED: { state: RunState };
  RUN_RESUMED: { state: RunState };
  PLAYER_JUMPED: { lane: LaneIndex };
  PLAYER_LANDED: { lane: LaneIndex; perfect: boolean };
  PLAYER_HIT: { shielded: boolean };
  PLAYER_STATE_CHANGED: { from: PlayerState; to: PlayerState };
  LANE_CHANGED: { from: LaneIndex; to: LaneIndex };
  COIN_COLLECTED: { amount: number; totalCoins: number };
  POWERUP_ACTIVATED: { type: PowerUpType; duration: number };
  POWERUP_EXPIRED: { type: PowerUpType };
  SCORE_CHANGED: { score: number; distance: number; combo: number };
  RUN_ENDED: { state: RunState };
}
