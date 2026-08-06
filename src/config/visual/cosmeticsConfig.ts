import type { CosmeticCategory } from "../../gameplay/PlayerProfileStore";

export interface CosmeticItem {
  readonly id: string;
  readonly category: CosmeticCategory;
  readonly name: string;
  readonly price: number;
  readonly color: string;
  readonly accent: string;
}

export const COSMETICS: readonly CosmeticItem[] = Object.freeze([
  { id: "cat.default", category: "cat", name: "Sunset Shiba", price: 0, color: "#E87848", accent: "#FFD08A" },
  { id: "cat.calico", category: "cat", name: "Calico Pop", price: 120, color: "#F2C879", accent: "#3E8F7C" },
  { id: "cat.midnight", category: "cat", name: "Midnight Dash", price: 260, color: "#343746", accent: "#7EE0D2" },
  { id: "board.default", category: "board", name: "Street Timber", price: 0, color: "#68503E", accent: "#E8A84B" },
  { id: "board.mint", category: "board", name: "Mint Circuit", price: 160, color: "#3FAE9B", accent: "#F4D35E" },
  { id: "board.comet", category: "board", name: "Comet Deck", price: 320, color: "#D84C67", accent: "#79B8FF" }
]);

export function getCosmetic(id: string): CosmeticItem {
  return COSMETICS.find((item) => item.id === id) ?? COSMETICS[0];
}
