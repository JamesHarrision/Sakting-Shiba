import { TrackChunk, seededRandom } from "./TrackChunk";

/**
 * StraightChunkA — balanced rooftop mix: building silhouettes, lamps, plants
 * and classic rooftop staples (vent, AC, pipes, antennas, warning lights).
 */
export class StraightChunkA extends TrackChunk {
  protected buildVariantProps(seedOffset: number): void {
    const rand = seededRandom(420 + seedOffset * 97);
    const len = this.chunkLength;
    let seed = 1000 + seedOffset * 1000;

    // Skyline silhouettes near the chunk edges
    this.placeProp("building", this.rooftopX, 5 + rand() * 3, seed++);
    this.placeProp("building", -this.rooftopX, len - 6 - rand() * 3, seed++);
    this.placeProp("skyline", this.rooftopX, len / 2 + 3, seed++);
    this.placeProp("skyline", -this.rooftopX, len / 2 - 3, seed++);

    // Lamps + potted plants along the rooftop edges
    for (const side of [-1, 1] as const) {
      this.placeProp("lamp", side * this.rooftopX, 8 + rand() * 4, seed++);
      this.placeProp("plant", side * this.rooftopX, len - 8 - rand() * 4, seed++);
    }

    // Rooftop mix along both sides
    for (const side of [-1, 1] as const) {
      let z = 6 + rand() * 4;
      while (z < len - 6) {
        const r2 = rand();
        const kind =
          r2 < 0.3
            ? "vent"
            : r2 < 0.5
              ? "ac"
              : r2 < 0.68
                ? "pipe"
                : r2 < 0.85
                  ? "antenna"
                  : "warningLight";
        this.placeProp(kind, side * this.rooftopX, z, seed++);
        z += 8 + rand() * 6;
      }
    }
  }
}
