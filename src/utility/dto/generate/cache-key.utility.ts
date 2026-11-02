import type { IDtoGenerateCacheKey } from "@interface/utility";
import type { Type } from "@nestjs/common";

import { DtoGenerateCacheClassIdentifier } from "@utility/dto/generate/cache-class-identifier.utility";

const symbolCacheIdentifiers: Map<symbol, number> = new Map<symbol, number>();

/**
 * Generates a unique cache key for DTO instances based on controller, entity class, route, DTO type, guard class, manual list response class, config, normalized query plan, response variant, custom route name, fields the path binds, and response relation config.
 * Two entity, guard, or validator classes that share a name get different keys.
 * @param {IDtoGenerateCacheKey} key - The key object containing entity class, method, DTO type, guard class, and DTO config
 * @returns {string} A unique string key for caching DTO instances
 */
export function DtoGenerateCacheKey(key: IDtoGenerateCacheKey): string {
	const baseKey: string = `${key.controllerName ?? "no-controller"}_${DtoGenerateCacheClassIdentifier(key.entity)}_${key.method}_${key.dtoType}_${key.guard ? DtoGenerateCacheClassIdentifier(key.guard) : "no-guard"}_${key.queryPlanSignature ?? "no-query-plan"}_${JSON.stringify(key.dtoConfig ?? {}, replaceWithCacheValue)}`;

	const listResponseKey: string = key.listResponseDto
		? `${baseKey}_list-response-${[key.listResponseDto]
				.flat()
				.map((dto: Type<unknown>): string => DtoGenerateCacheClassIdentifier(dto))
				.join("-")}`
		: baseKey;
	const variantKey: string = key.responseVariantName ? `${listResponseKey}_${key.responseVariantName}` : listResponseKey;

	const routeKey: string = key.routeName ? `${variantKey}_route_${key.routeName}` : variantKey;

	const pathKey: string = key.pathFields && key.pathFields.length > 0 ? `${routeKey}_path_${JSON.stringify(key.pathFields)}` : routeKey;

	const responseInclude: object | undefined = key.responseRelations?.load?.include;

	return responseInclude && Object.keys(responseInclude).length > 0 ? `${pathKey}_relations_${JSON.stringify({ include: responseInclude, reference: key.responseRelations?.reference })}` : pathKey;
}

/**
 * Returns the cache identifier of a symbol, because two symbols with one description are different values.
 * @param {symbol} target - Symbol in the DTO config.
 * @returns {string} Cache identifier of the symbol.
 */
function getSymbolCacheIdentifier(target: symbol): string {
	let identifier: number | undefined = symbolCacheIdentifiers.get(target);

	if (identifier === undefined) {
		identifier = symbolCacheIdentifiers.size;
		symbolCacheIdentifiers.set(target, identifier);
	}

	return `${String(target)}#${String(identifier)}`;
}

/**
 * Keeps in the serialized DTO config what `JSON.stringify` would drop or flatten: a class, a regular expression, a Map, a Set, a symbol, or a bigint.
 * @param {string} _key - Property name, unused.
 * @param {unknown} value - Serialized value.
 * @returns {unknown} A value that tells this one apart in the serialized config, any other value unchanged.
 */
function replaceWithCacheValue(_key: string, value: unknown): unknown {
	if (typeof value === "function") {
		return DtoGenerateCacheClassIdentifier(value);
	}

	if (typeof value === "symbol") {
		return { $symbol: getSymbolCacheIdentifier(value) };
	}

	if (typeof value === "bigint") {
		return { $bigint: String(value) };
	}

	if (value instanceof RegExp) {
		return { $regExp: String(value) };
	}

	if (value instanceof Map) {
		return { $map: [...value.entries()] };
	}

	if (value instanceof Set) {
		return { $set: [...value.values()] };
	}

	return value;
}
