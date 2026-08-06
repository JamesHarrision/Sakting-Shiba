import type {
  ObstacleItemType,
  SpawnItemType
} from "../../contracts/spawn-pattern.contract";

export function isObstacleItem(
  item: Exclude<SpawnItemType, "empty">
): item is ObstacleItemType {
  return (
    item === "obstacle_box" ||
    item === "obstacle_fence" ||
    item === "obstacle_dumpster"
  );
}
