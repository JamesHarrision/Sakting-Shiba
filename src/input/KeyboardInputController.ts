import type { InputSnapshot } from "../contracts/gameplay";
import { createEmptyInputSnapshot } from "./inputSnapshot";

type InputAction = keyof InputSnapshot;

const KEY_TO_ACTION: Readonly<Record<string, InputAction>> = {
  ArrowLeft: "moveLeft",
  KeyA: "moveLeft",
  ArrowRight: "moveRight",
  KeyD: "moveRight",
  ArrowUp: "jump",
  KeyW: "jump",
  Space: "jump",
  ArrowDown: "crouch",
  KeyS: "crouch",
  Escape: "pause",
  KeyP: "pause"
};

const ONE_SHOT_ACTIONS = new Set<InputAction>([
  "moveLeft",
  "moveRight",
  "jump",
  "pause"
]);

export class KeyboardInputController {
  private readonly pressedKeys = new Set<string>();
  private readonly pendingActions = new Set<InputAction>();
  private attached = false;
  private readonly keydownHandler = (event: KeyboardEvent) => {
    this.handleKeyDown(event.code);

    if (KEY_TO_ACTION[event.code]) {
      event.preventDefault();
    }
  };

  private readonly keyupHandler = (event: KeyboardEvent) => {
    this.handleKeyUp(event.code);

    if (KEY_TO_ACTION[event.code]) {
      event.preventDefault();
    }
  };

  constructor(private readonly target?: Window) {}

  attach(): void {
    if (!this.target) {
      throw new Error("KeyboardInputController requires a window target to attach.");
    }

    if (this.attached) {
      return;
    }

    this.target.addEventListener("keydown", this.keydownHandler);
    this.target.addEventListener("keyup", this.keyupHandler);
    this.attached = true;
  }

  detach(): void {
    if (this.attached) {
      this.target?.removeEventListener("keydown", this.keydownHandler);
      this.target?.removeEventListener("keyup", this.keyupHandler);
      this.attached = false;
    }

    this.reset();
  }

  reset(): void {
    this.pressedKeys.clear();
    this.pendingActions.clear();
  }

  getSnapshot(): InputSnapshot {
    const snapshot = createEmptyInputSnapshot();

    for (const action of this.pendingActions) {
      snapshot[action] = true;
    }

    snapshot.crouch = this.isActionPressed("crouch");

    for (const action of ONE_SHOT_ACTIONS) {
      this.pendingActions.delete(action);
    }

    return snapshot;
  }

  handleKeyDown(code: string): void {
    const action = KEY_TO_ACTION[code];

    if (!action) {
      return;
    }

    if (!this.pressedKeys.has(code)) {
      this.pendingActions.add(action);
    }

    this.pressedKeys.add(code);
  }

  handleKeyUp(code: string): void {
    this.pressedKeys.delete(code);
  }

  private isActionPressed(action: InputAction): boolean {
    for (const key of this.pressedKeys) {
      if (KEY_TO_ACTION[key] === action) {
        return true;
      }
    }

    return false;
  }
}
