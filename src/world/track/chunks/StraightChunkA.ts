import { TrackChunk, seededRandom } from "./TrackChunk";

/**
 * StraightChunkA — balanced rooftop mix: building + skyline silhouettes,
 * lamps, plants and small GLB street props (box, cone, tree).
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

    // Small GLB street props along both sides
    for (const side of [-1, 1] as const) {
      let z = 6 + rand() * 4;
      while (z < len - 6) {
        const r2 = rand();
        const kind =
          r2 < 0.35 ? "box" : r2 < 0.6 ? "cone" : r2 < 0.8 ? "plant" : "tree";
        this.placeProp(kind, side * this.rooftopX, z, seed++);
        z += 8 + rand() * 6;
      }
    }
  }
}
