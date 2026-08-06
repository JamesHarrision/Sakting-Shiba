export type CosmeticCategory = "cat" | "board";

export interface PlayerProfile {
  readonly coins: number;
  readonly ownedCosmetics: readonly string[];
  readonly equippedCat: string;
  readonly equippedBoard: string;
  readonly tutorialCompleted: boolean;
  readonly bestScore: number;
  readonly bestDistance: number;
  readonly totalRuns: number;
}

export interface RunRecordResult {
  readonly isNewBestScore: boolean;
  readonly isNewBestDistance: boolean;
}

interface StoragePort {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = "catboard-rush.profile.v1";
const DEFAULT_PROFILE: PlayerProfile = Object.freeze({
  coins: 0,
  ownedCosmetics: Object.freeze(["cat.default", "board.default"]),
  equippedCat: "cat.default",
  equippedBoard: "board.default",
  tutorialCompleted: false,
  bestScore: 0,
  bestDistance: 0,
  totalRuns: 0
});

export class PlayerProfileStore {
  private profile: PlayerProfile;

  constructor(private readonly storage?: StoragePort) {
    this.profile = this.load();
  }

  getSnapshot(): PlayerProfile {
    return {
      ...this.profile,
      ownedCosmetics: [...this.profile.ownedCosmetics]
    };
  }

  addCoins(amount: number): void {
    if (!Number.isFinite(amount) || amount <= 0) return;
    this.update({ coins: this.profile.coins + Math.floor(amount) });
  }

  purchase(id: string, price: number): boolean {
    if (
      !id ||
      price < 0 ||
      this.profile.coins < price ||
      this.profile.ownedCosmetics.includes(id)
    ) {
      return false;
    }
    this.update({
      coins: this.profile.coins - price,
      ownedCosmetics: [...this.profile.ownedCosmetics, id]
    });
    return true;
  }

  equip(category: CosmeticCategory, id: string): boolean {
    if (!this.profile.ownedCosmetics.includes(id)) return false;
    this.update(
      category === "cat" ? { equippedCat: id } : { equippedBoard: id }
    );
    return true;
  }

  completeTutorial(): void {
    this.update({ tutorialCompleted: true });
  }

  recordRun(score: number, distance: number): RunRecordResult {
    const normalizedScore = Math.max(0, Math.floor(Number.isFinite(score) ? score : 0));
    const normalizedDistance = Math.max(0, Number.isFinite(distance) ? distance : 0);
    const isNewBestScore = normalizedScore > this.profile.bestScore;
    const isNewBestDistance = normalizedDistance > this.profile.bestDistance;
    this.update({
      bestScore: Math.max(this.profile.bestScore, normalizedScore),
      bestDistance: Math.max(this.profile.bestDistance, normalizedDistance),
      totalRuns: this.profile.totalRuns + 1
    });
    return { isNewBestScore, isNewBestDistance };
  }

  private update(changes: Partial<PlayerProfile>): void {
    this.profile = Object.freeze({ ...this.profile, ...changes });
    this.persist();
  }

  private load(): PlayerProfile {
    if (!this.storage) return DEFAULT_PROFILE;
    try {
      const raw = this.storage.getItem(STORAGE_KEY);
      if (!raw) return DEFAULT_PROFILE;
      const value = JSON.parse(raw) as Partial<PlayerProfile>;
      return Object.freeze({
        coins: Math.max(0, Math.floor(value.coins ?? 0)),
        ownedCosmetics: Object.freeze([
          ...new Set([
            "cat.default",
            "board.default",
            ...(value.ownedCosmetics ?? [])
          ])
        ]),
        equippedCat: value.equippedCat ?? "cat.default",
        equippedBoard: value.equippedBoard ?? "board.default",
        tutorialCompleted: value.tutorialCompleted ?? false,
        bestScore: Math.max(0, Math.floor(value.bestScore ?? 0)),
        bestDistance: Math.max(0, value.bestDistance ?? 0),
        totalRuns: Math.max(0, Math.floor(value.totalRuns ?? 0))
      });
    } catch {
      return DEFAULT_PROFILE;
    }
  }

  private persist(): void {
    try {
      this.storage?.setItem(STORAGE_KEY, JSON.stringify(this.profile));
    } catch {
      // Storage can be unavailable in private mode; gameplay remains in-memory.
    }
  }
}
