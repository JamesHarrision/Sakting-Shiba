import { TrackChunk, seededRandom } from "./TrackChunk";

/**
 * StraightChunkA — balanced rooftop mix (ventilation, AC, pipes, antennas,
 * warning lights) with a couple of building silhouettes.
 */
export class StraightChunkA extends TrackChunk {
  protected buildVariantProps(seedOffset: number): void {
    const rand = seededRandom(420 + seedOffset * 97);
    const len = this.chunkLength;

    // Skyline silhouettes near the chunk edges
    this.placeProp("building", this.rooftopX, 5 + rand() * 3, rand);
    this.placeProp("building", -this.rooftopX, len - 6 - rand() * 3, rand);

    // Rooftop mix along both sides
    for (const side of [-1, 1] as const) {
      let z = 6 + rand() * 4;
      while (z < len - 6) {
        const r2 = rand();
        const kind =
          r2 < 0.35
            ? "vent"
            : r2 < 0.55
              ? "ac"
              : r2 < 0.7
                ? "pipe"
                : r2 < 0.85
                  ? "antenna"
                  : "warningLight";
        this.placeProp(kind, side * this.rooftopX, z, rand);
        z += 8 + rand() * 6;
      }
    }
  }
}
