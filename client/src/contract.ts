import {
  HIVE_CATEGORY_TOOL_NAMES,
  HIVE_CORE_TOOL_NAMES,
  HIVE_REMOVED_CATEGORY_TOOL_NAMES,
} from "./constants.js";

const REQUIRED_ROOT_TOOL_NAMES = new Set<string>(HIVE_CORE_TOOL_NAMES);
const REMOVED_CATEGORY_TOOL_NAMES = new Set<string>(
  HIVE_REMOVED_CATEGORY_TOOL_NAMES
);

export function isHiveCurrentRootToolName(toolName: string): boolean {
  return REQUIRED_ROOT_TOOL_NAMES.has(toolName);
}

export function isRemovedHiveCategoryToolName(toolName: string): boolean {
  return REMOVED_CATEGORY_TOOL_NAMES.has(toolName);
}

export function inspectHiveRootContract(toolNames: Iterable<string>) {
  const available = new Set(toolNames);
  const missingCoreTools = HIVE_CORE_TOOL_NAMES.filter(
    (toolName) => !available.has(toolName)
  );
  const availableCategoryTools = HIVE_CATEGORY_TOOL_NAMES.filter((toolName) =>
    available.has(toolName)
  );
  const missingCategoryTools = HIVE_CATEGORY_TOOL_NAMES.filter(
    (toolName) => !available.has(toolName)
  );
  const removedCategoryToolsPresent = HIVE_REMOVED_CATEGORY_TOOL_NAMES.filter(
    (toolName) => available.has(toolName)
  );

  return {
    availableCategoryTools,
    hasRemovedCategoryTools: removedCategoryToolsPresent.length > 0,
    missingCategoryTools,
    missingCoreTools,
    ok:
      missingCoreTools.length === 0 &&
      removedCategoryToolsPresent.length === 0,
    removedCategoryToolsPresent,
  };
}
