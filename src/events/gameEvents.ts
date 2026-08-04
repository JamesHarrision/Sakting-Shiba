import type { LaneIndex, PlayerState, RunState } from "../contracts/gameplay";

export const GAME_EVENTS = {
  RUN_STARTED: "RUN_STARTED",
  RUN_PAUSED: "RUN_PAUSED",
  RUN_RESUMED: "RUN_RESUMED",
  PLAYER_JUMPED: "PLAYER_JUMPED",
  PLAYER_LANDED: "PLAYER_LANDED",
  PLAYER_HIT: "PLAYER_HIT",
  PLAYER_STATE_CHANGED: "PLAYER_STATE_CHANGED",
  LANE_CHANGED: "LANE_CHANGED",
  FISH_COLLECTED: "FISH_COLLECTED",
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
  FISH_COLLECTED: { amount: number; totalFish: number };
  SCORE_CHANGED: { score: number; distance: number; combo: number };
  RUN_ENDED: { state: RunState };
}
