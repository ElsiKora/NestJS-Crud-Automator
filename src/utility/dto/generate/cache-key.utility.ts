import type { IDtoGenerateCacheKey } from "@interface/utility";

/**
 * Generates a unique cache key for DTO instances based on controller, entity, route, DTO type, guard, config, and normalized query plan.
 * @param {IDtoGenerateCacheKey} key - The key object containing entity name, method, DTO type, guard name, and DTO config
 * @returns {string} A unique string key for caching DTO instances
 */
export function DtoGenerateCacheKey(key: IDtoGenerateCacheKey): string {
	return `${key.controllerName ?? "no-controller"}_${key.entityName}_${key.method}_${key.dtoType}_${key.guardName ?? "no-guard"}_${key.queryPlanSignature ?? "no-query-plan"}_${JSON.stringify(key.dtoConfig ?? {})}`;
}
