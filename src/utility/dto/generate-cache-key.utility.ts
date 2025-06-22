import type { IDtoGenerateCacheKey } from "@interface/utility";

/**
 * Generates a unique cache key for DTO instances based on entity name, route method, DTO type, guard, and config.
 * @param {IDtoGenerateCacheKey} key - The key object containing entity name, method, DTO type, guard name, and DTO config
 * @returns {string} A unique string key for caching DTO instances
 */
export function DtoGenerateCacheKey(key: IDtoGenerateCacheKey): string {
	return `${key.entityName}_${key.method}_${key.dtoType}_${key.guardName ?? "no-guard"}_${JSON.stringify(key.dtoConfig ?? {})}`;
}
