import { describe, expect, it } from "vitest";

import { buildMusicSamples } from "../../audio/GameAudioManager";

describe("procedural music buffer", () => {
  it("builds a finite, audible and normalized loop", () => {
    const samples = buildMusicSamples(8000, 1);
    expect(samples).toHaveLength(8000);
    let peak = 0;
    let energy = 0;
    for (const sample of samples) {
      expect(Number.isFinite(sample)).toBe(true);
      peak = Math.max(peak, Math.abs(sample));
      energy += sample * sample;
    }
    expect(peak).toBeLessThanOrEqual(1);
    expect(energy).toBeGreaterThan(1);
  });

  it("ends a complete musical phrase without a loud loop seam", () => {
    const samples = buildMusicSamples(8000, 2.5);
    const seamDelta = Math.abs(samples[0] - samples[samples.length - 1]);

    expect(seamDelta).toBeLessThan(0.05);
  });
});
