import type { CosmeticCategory } from "../../gameplay/PlayerProfileStore";

export interface CosmeticFit {
  /** Target world height (models are auto-scaled to fit). */
  readonly height?: number;
  /** Target horizontal extent along Z (boards); X is scaled proportionally. */
  readonly width?: number;
}

export interface CosmeticItem {
  readonly id: string;
  readonly category: CosmeticCategory;
  readonly name: string;
  readonly price: number;
  readonly color: string;
  readonly accent: string;
  /**
   * GLB path. "/src/..." paths are resolved through Vite's import.meta.glob
   * (hashed URLs survive the production build); "/assets/..." paths are the
   * public folder (player defaults). Null = no model (color swatch only).
   */
  readonly model: string | null;
  /** Auto-calibration target when a model is present. */
  readonly fit: CosmeticFit;
}

export const COSMETICS: readonly CosmeticItem[] = Object.freeze([
  // Hats (asset slot: src/assets/models/player/hat-*.glb)
  { id: "hat.default", category: "hat", name: "Classic Cap", price: 0, color: "#E87848", accent: "#FFD08A", model: null, fit: {} },
  { id: "hat.snapback", category: "hat", name: "Snapback", price: 90, color: "#D84C67", accent: "#79B8FF", model: "/src/assets/models/player/hat-snapback.glb", fit: { height: 0.34 } },
  { id: "hat.headphones", category: "hat", name: "Street Phones", price: 200, color: "#343746", accent: "#53E0C1", model: "/src/assets/models/player/hat-headphones.glb", fit: { height: 0.4 } },

  // Dogs (asset slot: src/assets/models/player/dog-*.glb)
  { id: "dog.default", category: "dog", name: "Sunset Shiba", price: 0, color: "#E87848", accent: "#FFD08A", model: "/assets/models/player/cat.glb", fit: { height: 1.64 } },
  { id: "dog.calico", category: "dog", name: "Calico Pop", price: 120, color: "#F2C879", accent: "#3E8F7C", model: "/src/assets/models/player/dog-calico.glb", fit: { height: 1.64 } },
  { id: "dog.midnight", category: "dog", name: "Midnight Dash", price: 260, color: "#343746", accent: "#7EE0D2", model: "/src/assets/models/player/dog-midnight.glb", fit: { height: 1.64 } },

  // Skateboards (asset slot: src/assets/models/player/board-*.glb)
  { id: "board.default", category: "board", name: "Street Timber", price: 0, color: "#68503E", accent: "#E8A84B", model: "/assets/models/player/skateboard.glb", fit: { width: 2.28 } },
  { id: "board.mint", category: "board", name: "Mint Circuit", price: 160, color: "#3FAE9B", accent: "#F4D35E", model: "/src/assets/models/player/board-mint.glb", fit: { width: 2.28 } },
  { id: "board.comet", category: "board", name: "Comet Deck", price: 320, color: "#D84C67", accent: "#79B8FF", model: "/src/assets/models/player/board-comet.glb", fit: { width: 2.28 } }
]);

export function getCosmetic(id: string): CosmeticItem {
  return COSMETICS.find((item) => item.id === id) ?? COSMETICS[0];
}

export function getCosmeticsForCategory(
  category: CosmeticCategory
): readonly CosmeticItem[] {
  return COSMETICS.filter((item) => item.category === category);
}

export const COSMETIC_CATEGORIES: readonly CosmeticCategory[] = Object.freeze([
  "hat",
  "dog",
  "board"
]);
