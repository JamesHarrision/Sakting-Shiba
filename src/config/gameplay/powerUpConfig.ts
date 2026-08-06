export type PowerUpType = "magnet" | "spring" | "rocket" | "star";

export interface PowerUpConfig {
  readonly durationSeconds: number;
  readonly speedMultiplier: number;
  readonly collectionDistance: number;
  readonly flightHeight: number;
  readonly jumpMultiplier: number;
  readonly scoreMultiplier: number;
}

export const POWER_UP_CONFIG: Readonly<Record<PowerUpType, PowerUpConfig>> =
  Object.freeze({
    magnet: Object.freeze({
      durationSeconds: 8,
      speedMultiplier: 1,
      collectionDistance: 10,
      flightHeight: 0,
      jumpMultiplier: 1,
      scoreMultiplier: 1
    }),
    spring: Object.freeze({
      durationSeconds: 8,
      speedMultiplier: 1,
      collectionDistance: 0,
      flightHeight: 0,
      jumpMultiplier: 1.65,
      scoreMultiplier: 1
    }),
    rocket: Object.freeze({
      durationSeconds: 6,
      speedMultiplier: 1,
      collectionDistance: 14,
      flightHeight: 4.2,
      jumpMultiplier: 1,
      scoreMultiplier: 1
    }),
    star: Object.freeze({
      durationSeconds: 10,
      speedMultiplier: 1,
      collectionDistance: 0,
      flightHeight: 0,
      jumpMultiplier: 1,
      scoreMultiplier: 2
    })
  });
