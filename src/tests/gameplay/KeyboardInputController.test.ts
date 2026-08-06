import { describe, expect, it, vi } from "vitest";

import { KeyboardInputController } from "../../input/KeyboardInputController";

describe("KeyboardInputController", () => {
  it("accepts one-shot actions from touch controls", () => {
    const input = new KeyboardInputController();
    input.queueAction("jump");
    input.queueAction("crouch");
    expect(input.getSnapshot()).toMatchObject({ jump: true, crouch: true });
    expect(input.getSnapshot()).toMatchObject({ jump: false, crouch: false });
  });

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

  it("clears held and pending input when reset", () => {
    const input = new KeyboardInputController();

    input.handleKeyDown("ArrowDown");
    input.handleKeyDown("Space");
    input.reset();

    expect(input.getSnapshot()).toMatchObject({
      crouch: false,
      jump: false
    });
  });

  it("attaches and detaches listeners idempotently", () => {
    const target = {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    } as unknown as Window;
    const input = new KeyboardInputController(target);

    input.attach();
    input.attach();
    input.detach();
    input.detach();

    expect(target.addEventListener).toHaveBeenCalledTimes(2);
    expect(target.removeEventListener).toHaveBeenCalledTimes(2);
  });
});
