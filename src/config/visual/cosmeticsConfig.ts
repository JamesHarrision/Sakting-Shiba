import type { CosmeticCategory } from "../../gameplay/PlayerProfileStore";

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
   * public folder. Null = no model (color swatch only).
   * After running `scripts/normalize-player-glb.mjs`, every cosmetic GLB is
   * self-calibrating (Y-up, feet at Y=0, centered, target height/length).
   */
  readonly model: string | null;
}

export const COSMETICS: readonly CosmeticItem[] = Object.freeze([
  // Hats
  { id: "hat.default", category: "hat", name: "Classic Cap", price: 0, color: "#E87848", accent: "#FFD08A", model: null },
  { id: "hat.snapback", category: "hat", name: "Snapback", price: 90, color: "#D84C67", accent: "#79B8FF", model: "/src/assets/models/player/hat-snapback.glb" },
  { id: "hat.headphones", category: "hat", name: "Street Phones", price: 200, color: "#343746", accent: "#53E0C1", model: "/src/assets/models/player/hat-headphones.glb" },

  // Dogs
  { id: "dog.default", category: "dog", name: "Sunset Shiba", price: 0, color: "#E87848", accent: "#FFD08A", model: "/assets/models/player/cat.glb" },
  { id: "dog.calico", category: "dog", name: "Calico Pop", price: 120, color: "#F2C879", accent: "#3E8F7C", model: "/src/assets/models/player/dog-calico.glb" },
  { id: "dog.midnight", category: "dog", name: "Midnight Dash", price: 260, color: "#343746", accent: "#7EE0D2", model: "/src/assets/models/player/dog-midnight.glb" },

  // Skateboards
  { id: "board.default", category: "board", name: "Street Timber", price: 0, color: "#68503E", accent: "#E8A84B", model: "/assets/models/player/skateboard.glb" },
  { id: "board.mint", category: "board", name: "Mint Circuit", price: 160, color: "#3FAE9B", accent: "#F4D35E", model: "/src/assets/models/player/board-mint.glb" },
  { id: "board.comet", category: "board", name: "Comet Deck", price: 320, color: "#D84C67", accent: "#79B8FF", model: "/src/assets/models/player/board-comet.glb" }
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
