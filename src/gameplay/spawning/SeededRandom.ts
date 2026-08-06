export class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = normalizeSeed(seed);
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }

  reset(seed: number): void {
    this.state = normalizeSeed(seed);
  }
}

function normalizeSeed(seed: number): number {
  if (!Number.isFinite(seed)) {
    throw new Error("Spawn seed must be a finite number.");
  }
  return Math.trunc(seed) >>> 0;
}
