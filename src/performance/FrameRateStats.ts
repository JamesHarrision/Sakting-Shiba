export interface FrameRateSnapshot {
  readonly currentFps: number;
  readonly minimumFps: number;
  readonly averageFps: number;
}

const EMPTY_SNAPSHOT: Readonly<FrameRateSnapshot> = Object.freeze({
  currentFps: 0,
  minimumFps: 0,
  averageFps: 0
});

export class FrameRateStats {
  private totalFrames = 0;
  private totalSeconds = 0;
  private currentFps = 0;
  private minimumFps = Number.POSITIVE_INFINITY;

  addWindow(frameCount: number, elapsedSeconds: number): void {
    if (
      !Number.isFinite(frameCount) ||
      !Number.isFinite(elapsedSeconds) ||
      frameCount <= 0 ||
      elapsedSeconds <= 0
    ) {
      return;
    }

    this.currentFps = frameCount / elapsedSeconds;
    this.minimumFps = Math.min(this.minimumFps, this.currentFps);
    this.totalFrames += frameCount;
    this.totalSeconds += elapsedSeconds;
  }

  getSnapshot(): Readonly<FrameRateSnapshot> {
    if (this.totalSeconds === 0) return EMPTY_SNAPSHOT;
    return Object.freeze({
      currentFps: this.currentFps,
      minimumFps: this.minimumFps,
      averageFps: this.totalFrames / this.totalSeconds
    });
  }

  reset(): void {
    this.totalFrames = 0;
    this.totalSeconds = 0;
    this.currentFps = 0;
    this.minimumFps = Number.POSITIVE_INFINITY;
  }
}
