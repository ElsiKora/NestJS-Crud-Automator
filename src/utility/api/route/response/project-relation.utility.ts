import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPropertiesRouteBaseRelationsResponse } from "@interface/decorator/api";

import { EApiControllerRelationReferenceShape, EApiRouteType } from "@enum/decorator/api";
import { EnumIsValue } from "@utility/enum/is-value.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Projects loaded relation objects into the configured response reference shape.
 * To-many relations are projected element by element, so the array itself is preserved.
 * Only a GET_LIST response is read as an `{ items }` envelope: on any other route `items` is a property of the entity.
 * @template E - Entity type that owns the relation configuration.
 * @template R - Response value type.
 * @param {IApiControllerPropertiesRouteBaseRelationsResponse<E> | undefined} relationConfig - Response relation projection configuration.
 * @param {R} response - Response value to project.
 * @param {EApiRouteType} [routeType] - Type of the route producing the response.
 * @returns {R} Response value with projected relation references.
 */
export function ApiRouteProjectRelationResponse<E extends IApiBaseEntity, R>(relationConfig: IApiControllerPropertiesRouteBaseRelationsResponse<E> | undefined, response: R, routeType?: EApiRouteType): R {
	if (!relationConfig?.load?.include || Object.keys(relationConfig.load.include).length === 0) {
		return response;
	}

	validateResponseReferenceConfig(relationConfig.reference);

	const relationNames: Array<string> = Object.keys(relationConfig.load.include);
	const referenceKey: string = relationConfig.reference.key ?? "id";
	const responses: Array<Record<string, unknown>> = [];

	if (Array.isArray(response)) {
		for (const item of response) {
			if (item === null || typeof item !== "object") {
				continue;
			}

			responses.push(item as Record<string, unknown>);
		}
	} else {
		const responseValue: unknown = response;

		if (routeType === EApiRouteType.GET_LIST && responseValue !== null && typeof responseValue === "object" && "items" in responseValue && Array.isArray((responseValue as { items?: unknown }).items)) {
			for (const item of (responseValue as { items: Array<unknown> }).items) {
				if (item === null || typeof item !== "object") {
					continue;
				}

				responses.push(item as Record<string, unknown>);
			}
		} else if (responseValue !== null && typeof responseValue === "object") {
			responses.push(responseValue as Record<string, unknown>);
		}
	}

	for (const projectedResponse of responses) {
		for (const relationName of relationNames) {
			const relationValue: unknown = projectedResponse[relationName];

			if (relationValue === null || relationValue === undefined || typeof relationValue !== "object") {
				continue;
			}

			projectedResponse[relationName] = Array.isArray(relationValue) ? relationValue.map((relationItem: unknown): unknown => projectRelationReference(relationConfig.reference, referenceKey, relationItem)) : projectRelationReference(relationConfig.reference, referenceKey, relationValue);
		}
	}

	return response;
}

/**
 * Projects one loaded relation object into the configured reference shape.
 * @param {IApiControllerPropertiesRouteBaseRelationsResponse<IApiBaseEntity>["reference"]} referenceConfig - Response relation reference config.
 * @param {string} referenceKey - Relation key exposed by the reference.
 * @param {unknown} relationValue - Loaded relation object, or a value that is returned unchanged.
 * @returns {unknown} Projected relation reference.
 */
function projectRelationReference(referenceConfig: IApiControllerPropertiesRouteBaseRelationsResponse<IApiBaseEntity>["reference"], referenceKey: string, relationValue: unknown): unknown {
	if (relationValue === null || relationValue === undefined || typeof relationValue !== "object") {
		return relationValue;
	}

	const referenceValue: unknown = (relationValue as Record<string, unknown>)[referenceKey];

	return referenceConfig.shape === EApiControllerRelationReferenceShape.SCALAR ? referenceValue : { [referenceKey]: referenceValue };
}

/**
 * Ensures response relation reference settings are valid route configuration.
 * @param {IApiControllerPropertiesRouteBaseRelationsResponse<IApiBaseEntity>["reference"] | undefined} referenceConfig - Response relation reference config.
 * @returns {void}
 */
function validateResponseReferenceConfig(referenceConfig: IApiControllerPropertiesRouteBaseRelationsResponse<IApiBaseEntity>["reference"] | undefined): void {
	if (!referenceConfig) {
		throw ErrorException("Response relation reference config is required when relation loading is configured");
	}

	if (!EnumIsValue(EApiControllerRelationReferenceShape, referenceConfig.shape)) {
		throw ErrorException("Response relation reference shape must be OBJECT or SCALAR");
	}

	if (referenceConfig.key?.length === 0) {
		throw ErrorException("Response relation reference key must not be empty");
	}
}
