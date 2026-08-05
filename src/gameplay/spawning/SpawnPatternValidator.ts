import type {
  SpawnItemType,
  SpawnPattern,
  SpawnRow
} from "../../contracts/spawn-pattern.contract";

const VALID_ITEM_TYPES = new Set<SpawnItemType>([
  "debug_obstacle",
  "debug_pickup",
  "empty"
]);

export interface SpawnPatternValidationIssue {
  readonly patternId: string;
  readonly message: string;
}

export function hasEscapeLane(row: Readonly<SpawnRow>): boolean {
  return row.lanes.includes("empty");
}

export function validateSpawnPatterns(
  patterns: readonly SpawnPattern[]
): readonly SpawnPatternValidationIssue[] {
  const issues: SpawnPatternValidationIssue[] = [];
  const ids = new Set<string>();
  let easyPatternCount = 0;

  for (const pattern of patterns) {
    if (!pattern.id.trim()) {
      issues.push({ patternId: pattern.id, message: "Pattern id is empty." });
    } else if (ids.has(pattern.id)) {
      issues.push({ patternId: pattern.id, message: "Pattern id is duplicated." });
    }
    ids.add(pattern.id);

    if (!Number.isInteger(pattern.minimumDifficulty) || pattern.minimumDifficulty < 0) {
      issues.push({
        patternId: pattern.id,
        message: "minimumDifficulty must be a non-negative integer."
      });
    }
    if (!Number.isFinite(pattern.weight) || pattern.weight <= 0) {
      issues.push({ patternId: pattern.id, message: "Weight must be positive." });
    }
    if (!Number.isFinite(pattern.length) || pattern.length <= 0) {
      issues.push({ patternId: pattern.id, message: "Length must be positive." });
    }
    if (pattern.rows.length === 0) {
      issues.push({ patternId: pattern.id, message: "Pattern has no rows." });
    }

    if (pattern.minimumDifficulty === 0) easyPatternCount += 1;
    let previousOffset = -Infinity;

    for (const row of pattern.rows) {
      if (!Number.isFinite(row.offsetZ) || row.offsetZ < 0) {
        issues.push({
          patternId: pattern.id,
          message: "Row offsetZ must be a non-negative finite number."
        });
      }
      if (row.offsetZ <= previousOffset) {
        issues.push({
          patternId: pattern.id,
          message: "Row offsets must be strictly increasing."
        });
      }
      if (row.offsetZ >= pattern.length) {
        issues.push({
          patternId: pattern.id,
          message: "Every row must fit inside the pattern length."
        });
      }
      if (row.lanes.length !== 3) {
        issues.push({
          patternId: pattern.id,
          message: "Every row must define exactly three lanes."
        });
      }
      if (!row.lanes.every((item) => VALID_ITEM_TYPES.has(item))) {
        issues.push({
          patternId: pattern.id,
          message: "Row contains an unsupported item type."
        });
      }
      if (!hasEscapeLane(row)) {
        issues.push({
          patternId: pattern.id,
          message: "Every row must contain at least one empty escape lane."
        });
      }
      if (
        pattern.minimumDifficulty === 0 &&
        row.lanes.filter((item) => item === "debug_obstacle").length > 1
      ) {
        issues.push({
          patternId: pattern.id,
          message: "Starting patterns may contain at most one obstacle per row."
        });
      }

      previousOffset = row.offsetZ;
    }
  }

  if (easyPatternCount < 3) {
    issues.push({
      patternId: "<collection>",
      message: "At least three starting patterns are required."
    });
  }

  return issues;
}

export function assertSpawnPatternsSafe(
  patterns: readonly SpawnPattern[]
): void {
  const issues = validateSpawnPatterns(patterns);
  if (issues.length === 0) return;

  const details = issues
    .map((issue) => `${issue.patternId}: ${issue.message}`)
    .join("\n");
  throw new Error(`Unsafe spawn pattern configuration:\n${details}`);
}
