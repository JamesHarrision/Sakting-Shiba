import type { InputSnapshot } from "../contracts/gameplay";

export function createEmptyInputSnapshot(): InputSnapshot {
  return {
    moveLeft: false,
    moveRight: false,
    jump: false,
    crouch: false,
    pause: false
  };
}
