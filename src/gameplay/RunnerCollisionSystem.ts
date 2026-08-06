import { OBSTACLE_RULES } from "../config/gameplay/obstacleConfig";
import type { PlayerColliderSnapshot } from "../contracts/player-collider.contract";
import type {
  CollectibleHit,
  CollisionFrameResult,
  WorldItemSnapshot
} from "../contracts/world-item.contract";
import { isObstacleItem } from "./spawning/spawnItemGuards";

const EMPTY_RESULT: CollisionFrameResult = Object.freeze({
  obstacleHit: null,
  collectibles: Object.freeze([])
});

export class RunnerCollisionSystem {
  update(
    player: Readonly<PlayerColliderSnapshot>,
    items: readonly Readonly<WorldItemSnapshot>[],
    isInvulnerable = false
  ): Readonly<CollisionFrameResult> {
    if (!player.isEnabled) return EMPTY_RESULT;

    let collectibles: CollectibleHit[] | undefined;

    for (const item of items) {
      if (!overlapsDepth(player, item)) continue;

      if (isObstacleItem(item.type)) {
        if (!overlapsWidth(player, item)) continue;
        if (!isInvulnerable && !this.avoidsObstacle(player, item)) {
          return Object.freeze({
            obstacleHit: Object.freeze({
              itemId: item.id,
              type: item.type
            }),
            collectibles: collectibles
              ? Object.freeze(collectibles)
              : EMPTY_RESULT.collectibles
          });
        }
        continue;
      }

      const dx = player.centerX - item.centerX;
      const dy = player.centerY - item.centerY;
      const radius = player.pickupRadius + item.width / 2;
      if (dx * dx + dy * dy <= radius * radius) {
        (collectibles ??= []).push({ itemId: item.id, type: item.type });
      }
    }

    if (!collectibles) return EMPTY_RESULT;
    return Object.freeze({
      obstacleHit: null,
      collectibles: Object.freeze(collectibles)
    });
  }

  reset(): void {}

  private avoidsObstacle(
    player: Readonly<PlayerColliderSnapshot>,
    item: Readonly<WorldItemSnapshot>
  ): boolean {
    if (!isObstacleItem(item.type)) return true;
    const rule = OBSTACLE_RULES[item.type];
    if (rule.requiresCrouch) return player.isCrouching;
    if (rule.jumpClearance !== undefined) {
      const playerBottom = player.centerY - player.height / 2;
      return playerBottom >= rule.jumpClearance;
    }
    return false;
  }
}

function overlapsDepth(
  player: Readonly<PlayerColliderSnapshot>,
  item: Readonly<WorldItemSnapshot>
): boolean {
  return (
    Math.abs(player.centerZ - item.worldZ) <= (player.depth + item.depth) / 2
  );
}

function overlapsWidth(
  player: Readonly<PlayerColliderSnapshot>,
  item: Readonly<WorldItemSnapshot>
): boolean {
  return (
    Math.abs(player.centerX - item.centerX) <= (player.width + item.width) / 2
  );
}
