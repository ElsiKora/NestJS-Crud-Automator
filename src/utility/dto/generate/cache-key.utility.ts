import type { IDtoGenerateCacheKey } from "@interface/utility";
import type { Type } from "@nestjs/common";

const LIST_RESPONSE_IDENTIFIERS: WeakMap<Type<unknown>, number> = new WeakMap<Type<unknown>, number>();
let nextListResponseIdentifier: number = 0;

/**
 * Generates a unique cache key for DTO instances based on controller, entity, route, DTO type, guard, manual list response, config, normalized query plan, response variant, and custom route name.
 * @param {IDtoGenerateCacheKey} key - The key object containing entity name, method, DTO type, guard name, and DTO config
 * @returns {string} A unique string key for caching DTO instances
 */
export function DtoGenerateCacheKey(key: IDtoGenerateCacheKey): string {
	const baseKey: string = `${key.controllerName ?? "no-controller"}_${key.entityName}_${key.method}_${key.dtoType}_${key.guardName ?? "no-guard"}_${key.queryPlanSignature ?? "no-query-plan"}_${JSON.stringify(key.dtoConfig ?? {})}`;

	const listResponseKey: string = key.listResponseDto
		? `${baseKey}_list-response-${[key.listResponseDto]
				.flat()
				.map((dto: Type<unknown>): number => getListResponseIdentifier(dto))
				.join("-")}`
		: baseKey;
	const variantKey: string = key.responseVariantName ? `${listResponseKey}_${key.responseVariantName}` : listResponseKey;

	return key.routeName ? `${variantKey}_route_${key.routeName}` : variantKey;
}

/**
 * Gives a list response class a key of its own, because two classes may share a name and publish different fields.
 * @param {Type<unknown>} listResponseDto - The list response class.
 * @returns {number} Identifier of that class.
 */
function getListResponseIdentifier(listResponseDto: Type<unknown>): number {
	let identifier: number | undefined = LIST_RESPONSE_IDENTIFIERS.get(listResponseDto);

	if (identifier === undefined) {
		identifier = nextListResponseIdentifier;
		nextListResponseIdentifier += 1;
		LIST_RESPONSE_IDENTIFIERS.set(listResponseDto, identifier);
	}

	return identifier;
}
