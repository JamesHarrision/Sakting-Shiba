import { TrackChunk, seededRandom } from "./TrackChunk";

/**
 * StraightChunkB — urban variant: dense building silhouettes (near + far
 * rows), barriers and AC units. Keeps the same lanes/width/ground.
 */
export class StraightChunkB extends TrackChunk {
  protected buildVariantProps(seedOffset: number): void {
    const rand = seededRandom(530 + seedOffset * 113);
    const len = this.chunkLength;

    for (const side of [-1, 1] as const) {
      // Building skyline: near edge, far mid, near edge
      this.placeProp("building", side * this.rooftopX, 3 + rand() * 3, rand);
      this.placeProp("building", side * (this.rooftopX + 1.6), len / 2, rand);
      this.placeProp("building", side * this.rooftopX, len - 4 - rand() * 3, rand);

      // Barrier + AC units
      this.placeProp("barrier", side * this.rooftopX, len / 2 - 3 + rand() * 2, rand);
      this.placeProp("ac", side * this.rooftopX, 8 + rand() * 6, rand);
      this.placeProp("ac", side * this.rooftopX, len - 10 - rand() * 6, rand);
    }
  }
}
