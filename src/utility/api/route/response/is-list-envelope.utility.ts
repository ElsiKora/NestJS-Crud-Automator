import type { Type } from "@nestjs/common";

import { MetadataStorage } from "@class/metadata-storage.class";
import { EApiRouteType } from "@enum/decorator/api";
import { getMetadataArgsStorage } from "typeorm";

const ENVELOPE_PROPERTY_NAME: string = "items";

/**
 * Decides whether a response object is a list `{ items }` envelope rather than an entity.
 * A declared route type decides on its own: GET_LIST is an envelope, any other type is an entity.
 * An undeclared type exists only on custom routes: the response is an envelope unless the route entity owns an `items` property.
 * @param {unknown} response - Response value to inspect.
 * @param {EApiRouteType} [routeType] - Declared type of the route producing the response.
 * @param {Type<unknown>} [entity] - Entity of the route producing the response.
 * @returns {boolean} Whether the response is a list envelope.
 */
export function ApiRouteResponseIsListEnvelope(response: unknown, routeType?: EApiRouteType, entity?: Type<unknown>): response is { items: Array<unknown> } {
	if (response === null || typeof response !== "object" || !Array.isArray((response as { items?: unknown }).items)) {
		return false;
	}

	if (routeType !== undefined) {
		return routeType === EApiRouteType.GET_LIST;
	}

	return !entity || !hasEntityProperty(entity, ENVELOPE_PROPERTY_NAME);
}

/**
 * Checks whether an entity or one of its parents declares a property through TypeORM or Automator metadata.
 * @param {Type<unknown>} entity - Entity class to inspect.
 * @param {string} propertyName - Property name to look for.
 * @returns {boolean} Whether the property is declared.
 */
function hasEntityProperty(entity: Type<unknown>, propertyName: string): boolean {
	const hierarchy: Array<Type<unknown>> = [];
	let current: unknown = entity;

	while (typeof current === "function" && current !== Function.prototype) {
		hierarchy.push(current as Type<unknown>);
		current = Object.getPrototypeOf(current);
	}

	return (
		getMetadataArgsStorage()
			.filterColumns(hierarchy)
			.some((column: { propertyName: string }): boolean => column.propertyName === propertyName) ||
		getMetadataArgsStorage()
			.filterRelations(hierarchy)
			.some((relation: { propertyName: string }): boolean => relation.propertyName === propertyName) ||
		hierarchy.some((currentEntity: Type<unknown>): boolean => MetadataStorage.getInstance().getMetadata(currentEntity.name, propertyName) !== undefined)
	);
}
