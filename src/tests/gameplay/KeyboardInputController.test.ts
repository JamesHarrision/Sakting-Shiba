import { describe, expect, it } from "vitest";

import { KeyboardInputController } from "../../input/KeyboardInputController";

describe("KeyboardInputController", () => {
  it("emits one-shot lane input until the key is released", () => {
    const input = new KeyboardInputController();

    input.handleKeyDown("ArrowLeft");

    expect(input.getSnapshot().moveLeft).toBe(true);
    expect(input.getSnapshot().moveLeft).toBe(false);

    input.handleKeyUp("ArrowLeft");
    input.handleKeyDown("ArrowLeft");

    expect(input.getSnapshot().moveLeft).toBe(true);
  });

  it("keeps crouch active while the key is held", () => {
    const input = new KeyboardInputController();

    input.handleKeyDown("ArrowDown");

    expect(input.getSnapshot().crouch).toBe(true);
    expect(input.getSnapshot().crouch).toBe(true);

    input.handleKeyUp("ArrowDown");

    expect(input.getSnapshot().crouch).toBe(false);
  });

  it("maps WASD and pause keys", () => {
    const input = new KeyboardInputController();

    input.handleKeyDown("KeyD");
    input.handleKeyDown("KeyW");
    input.handleKeyDown("KeyP");

    expect(input.getSnapshot()).toMatchObject({
      moveRight: true,
      jump: true,
      pause: true
    });
  });
});
