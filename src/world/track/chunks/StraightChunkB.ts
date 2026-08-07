import { TrackChunk, seededRandom } from "./TrackChunk";

/**
 * StraightChunkB — urban variant: dense building silhouettes, fences,
 * traffic cones, dumpsters and boxes.
 */
export class StraightChunkB extends TrackChunk {
  protected buildVariantProps(seedOffset: number): void {
    const rand = seededRandom(530 + seedOffset * 113);
    const len = this.chunkLength;
    let seed = 2000 + seedOffset * 2000;

    for (const side of [-1, 1] as const) {
      // Building skyline: near edge, far mid, near edge
      this.placeProp("building", side * this.rooftopX, 3 + rand() * 3, seed++);
      this.placeProp(
        "skyline",
        side * this.rooftopX,
        len / 2,
        seed++
      );
      this.placeProp("building", side * this.rooftopX, len - 4 - rand() * 3, seed++);

      // Fence along one edge + traffic cones near the mid skyline
      this.placeProp("fence", side * this.rooftopX, 10 + rand() * 2, seed++);
      this.placeProp("cone", side * this.rooftopX, len / 2 - 2 + rand() * 2, seed++);
      this.placeProp("cone", side * this.rooftopX, len / 2 + 4 + rand() * 2, seed++);

      // Dumpster + box + tree
      this.placeProp("dumpster", side * this.rooftopX, 16 + rand() * 4, seed++);
      this.placeProp("box", side * this.rooftopX, len - 12 - rand() * 4, seed++);
      this.placeProp("tree", side * this.rooftopX, len / 2 - 3 + rand() * 2, seed++);
    }
  }
}
