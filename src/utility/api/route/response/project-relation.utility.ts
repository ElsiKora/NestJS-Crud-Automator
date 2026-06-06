import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPropertiesRouteBaseRelationsResponse } from "@interface/decorator/api";

import { EApiControllerRelationReferenceShape } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Projects loaded relation objects into the configured response reference shape.
 * @template E - Entity type that owns the relation configuration.
 * @template R - Response value type.
 * @param {IApiControllerPropertiesRouteBaseRelationsResponse<E> | undefined} relationConfig - Response relation projection configuration.
 * @param {R} response - Response value to project.
 * @returns {R} Response value with projected relation references.
 */
export function ApiRouteProjectRelationResponse<E extends IApiBaseEntity, R>(relationConfig: IApiControllerPropertiesRouteBaseRelationsResponse<E> | undefined, response: R): R {
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

		if (responseValue !== null && typeof responseValue === "object" && "items" in responseValue && Array.isArray((responseValue as { items?: unknown }).items)) {
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

			const referenceValue: unknown = (relationValue as Record<string, unknown>)[referenceKey];
			projectedResponse[relationName] = relationConfig.reference.shape === EApiControllerRelationReferenceShape.SCALAR ? referenceValue : { [referenceKey]: referenceValue };
		}
	}

	return response;
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

	if (!Object.values(EApiControllerRelationReferenceShape).includes(referenceConfig.shape)) {
		throw ErrorException("Response relation reference shape must be OBJECT or SCALAR");
	}

	if (referenceConfig.key?.length === 0) {
		throw ErrorException("Response relation reference key must not be empty");
	}
}
