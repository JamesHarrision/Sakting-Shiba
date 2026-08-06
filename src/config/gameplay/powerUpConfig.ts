export type PowerUpType = "magnet" | "rush" | "rocket";

export interface PowerUpConfig {
  readonly durationSeconds: number;
  readonly speedMultiplier: number;
  readonly collectionDistance: number;
  readonly flightHeight: number;
}

export const POWER_UP_CONFIG: Readonly<Record<PowerUpType, PowerUpConfig>> =
  Object.freeze({
    magnet: Object.freeze({
      durationSeconds: 8,
      speedMultiplier: 1,
      collectionDistance: 10,
      flightHeight: 0
    }),
    rush: Object.freeze({
      durationSeconds: 5,
      speedMultiplier: 1.35,
      collectionDistance: 0,
      flightHeight: 0
    }),
    rocket: Object.freeze({
      durationSeconds: 6,
      speedMultiplier: 1.12,
      collectionDistance: 14,
      flightHeight: 4.2
    })
  });
