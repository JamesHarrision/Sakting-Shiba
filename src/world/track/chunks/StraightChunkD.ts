import { TrackChunk, seededRandom } from "./TrackChunk";

/** Compact residential skyline with offset silhouettes and rooftop gardens. */
export class StraightChunkD extends TrackChunk {
  protected buildVariantProps(seedOffset: number): void {
    const rand = seededRandom(780 + seedOffset * 149);
    const len = this.chunkLength;
    let seed = 5000 + seedOffset * 4000;

    for (const side of [-1, 1] as const) {
      this.placeProp("building", side * this.rooftopX, 5 + rand() * 4, seed++);
      this.placeProp(
        "skyline",
        side * this.rooftopX,
        len - 7 - rand() * 4,
        seed++
      );
      this.placeProp("plant", side * this.rooftopX, len / 2 - 3, seed++);
      this.placeProp("plant", side * this.rooftopX, len / 2 + 3, seed++);
      this.placeProp("lamp", side * this.rooftopX, len / 2, seed++);
      this.placeProp("ac", side * (this.rooftopX + 0.3), 12 + rand() * 4, seed++);
    }
  }
}
