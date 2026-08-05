export type LaneIndex = 0 | 1 | 2;

export type PlayerState =
  | "running"
  | "switching_lane"
  | "jumping"
  | "crouching"
  | "hit"
  | "dead";

export interface RunState {
  distance: number;
  score: number;
  fish: number;
  speed: number;
  combo: number;
  isGameOver: boolean;
}

export interface InputSnapshot {
  moveLeft: boolean;
  moveRight: boolean;
  jump: boolean;
  crouch: boolean;
  pause: boolean;
}
