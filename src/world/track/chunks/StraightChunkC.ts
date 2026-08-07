import { TrackChunk, seededRandom } from "./TrackChunk";

/**
 * StraightChunkC — park variant: trees, lamps, cones, dumpsters and
 * building/skyline silhouettes.
 */
export class StraightChunkC extends TrackChunk {
  protected buildVariantProps(seedOffset: number): void {
    const rand = seededRandom(640 + seedOffset * 131);
    const len = this.chunkLength;
    let seed = 3000 + seedOffset * 3000;

    for (const side of [-1, 1] as const) {
      this.placeProp("tree", side * this.rooftopX, 6 + rand() * 4, seed++);
      this.placeProp("lamp", side * this.rooftopX, len - 7 - rand() * 3, seed++);
      this.placeProp("plant", side * this.rooftopX, 12 + rand() * 4, seed++);
      this.placeProp("cone", side * this.rooftopX, len / 2 + 1 + rand() * 3, seed++);
      this.placeProp("cone", side * this.rooftopX, len - 14 - rand() * 4, seed++);
      this.placeProp("box", side * this.rooftopX, 9 + rand() * 4, seed++);
      this.placeProp("skyline", side * this.rooftopX, len / 2 - 4, seed++);
    }

    this.placeProp("building", this.rooftopX, len - 5, seed++);
    this.placeProp("building", -this.rooftopX, 5, seed++);
    this.placeProp("dumpster", -this.rooftopX, len / 2 + 2, seed++);
  }
}
