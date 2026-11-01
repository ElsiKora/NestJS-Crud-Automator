import type { IDtoGenerateCacheKey } from "@interface/utility";

/**
 * Generates a unique cache key for DTO instances based on controller, entity, route, DTO type, guard, manual list response, config, normalized query plan, response variant, and custom route name.
 * @param {IDtoGenerateCacheKey} key - The key object containing entity name, method, DTO type, guard name, and DTO config
 * @returns {string} A unique string key for caching DTO instances
 */
export function DtoGenerateCacheKey(key: IDtoGenerateCacheKey): string {
	const baseKey: string = `${key.controllerName ?? "no-controller"}_${key.entityName}_${key.method}_${key.dtoType}_${key.guardName ?? "no-guard"}_${key.queryPlanSignature ?? "no-query-plan"}_${JSON.stringify(key.dtoConfig ?? {})}`;

	const listResponseKey: string = key.listResponseName ? `${baseKey}_list-response-${key.listResponseName}` : baseKey;
	const variantKey: string = key.responseVariantName ? `${listResponseKey}_${key.responseVariantName}` : listResponseKey;

	return key.routeName ? `${variantKey}_route_${key.routeName}` : variantKey;
}
