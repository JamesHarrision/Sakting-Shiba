import type { GameEventBus } from "../events/GameEventBus";

export type TutorialStep = "lane" | "jump" | "crouch" | "coin" | "complete";

const STEPS: readonly TutorialStep[] = ["lane", "jump", "crouch", "coin", "complete"];

export class TutorialSystem {
  private active = false;
  private stepIndex = 0;
  private readonly unsubscribe: Array<() => void> = [];

  constructor(
    eventBus: GameEventBus,
    private readonly onStepChanged: (step: TutorialStep) => void,
    private readonly onCompleted: () => void
  ) {
    this.unsubscribe.push(
      eventBus.on("LANE_CHANGED", () => this.advanceFrom("lane")),
      eventBus.on("PLAYER_JUMPED", () => this.advanceFrom("jump")),
      eventBus.on("PLAYER_STATE_CHANGED", ({ to }) => {
        if (to === "crouching") this.advanceFrom("crouch");
      }),
      eventBus.on("COIN_COLLECTED", () => this.advanceFrom("coin"))
    );
  }

  start(): void {
    this.active = true;
    this.stepIndex = 0;
    this.onStepChanged(this.getStep());
  }

  skip(): void {
    if (!this.active) return;
    this.finish();
  }

  cancel(): void {
    this.active = false;
    this.stepIndex = 0;
    this.onStepChanged("complete");
  }

  getStep(): TutorialStep {
    return STEPS[this.stepIndex];
  }

  get isActive(): boolean {
    return this.active;
  }

  dispose(): void {
    for (const unsubscribe of this.unsubscribe) unsubscribe();
    this.unsubscribe.length = 0;
  }

  private advanceFrom(expected: TutorialStep): void {
    if (!this.active || this.getStep() !== expected) return;
    this.stepIndex += 1;
    const next = this.getStep();
    this.onStepChanged(next);
    if (next === "complete") this.finish();
  }

  private finish(): void {
    this.active = false;
    this.stepIndex = STEPS.length - 1;
    this.onStepChanged("complete");
    this.onCompleted();
  }
}
