import { TrackChunk, seededRandom } from "./TrackChunk";

/**
 * StraightChunkC — industrial variant: pipes, vents, antennas and warning
 * lights with a couple of building silhouettes.
 */
export class StraightChunkC extends TrackChunk {
  protected buildVariantProps(seedOffset: number): void {
    const rand = seededRandom(640 + seedOffset * 131);
    const len = this.chunkLength;

    for (const side of [-1, 1] as const) {
      this.placeProp("pipe", side * this.rooftopX, 6 + rand() * 4, rand);
      this.placeProp("pipe", side * this.rooftopX, len - 8 - rand() * 4, rand);
      this.placeProp("vent", side * this.rooftopX, 12 + rand() * 4, rand);
      this.placeProp("vent", side * this.rooftopX, len / 2, rand);
      this.placeProp(
        "warningLight",
        side * this.rooftopX,
        len / 2 + 5 + rand() * 3,
        rand
      );
      this.placeProp("antenna", side * this.rooftopX, 9 + rand() * 4, rand);
    }

    this.placeProp("building", this.rooftopX, len - 5, rand);
    this.placeProp("building", -this.rooftopX, 5, rand);
  }
}
