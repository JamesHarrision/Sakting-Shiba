import { TrackChunk, seededRandom } from "./TrackChunk";

/**
 * StraightChunkC — industrial variant: trees, lamps, pipes, vents, antennas,
 * warning lights, cones and a dumpster.
 */
export class StraightChunkC extends TrackChunk {
  protected buildVariantProps(seedOffset: number): void {
    const rand = seededRandom(640 + seedOffset * 131);
    const len = this.chunkLength;
    let seed = 3000 + seedOffset * 3000;

    for (const side of [-1, 1] as const) {
      this.placeProp("tree", side * this.rooftopX, 6 + rand() * 4, seed++);
      this.placeProp("lamp", side * this.rooftopX, len - 7 - rand() * 3, seed++);
      this.placeProp("pipe", side * this.rooftopX, 12 + rand() * 4, seed++);
      this.placeProp("vent", side * this.rooftopX, len / 2, seed++);
      this.placeProp(
        "warningLight",
        side * this.rooftopX,
        len / 2 + 5 + rand() * 3,
        seed++
      );
      this.placeProp("antenna", side * this.rooftopX, 9 + rand() * 4, seed++);
      this.placeProp("cone", side * this.rooftopX, len - 14 - rand() * 4, seed++);
    }

    this.placeProp("building", this.rooftopX, len - 5, seed++);
    this.placeProp("building", -this.rooftopX, 5, seed++);
    this.placeProp("dumpster", -this.rooftopX, len / 2 + 2, seed++);
  }
}
