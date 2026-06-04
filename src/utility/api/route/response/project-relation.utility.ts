import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerPropertiesRouteBaseRelationsResponse } from "@interface/decorator/api";

import { EApiControllerRelationReferenceShape } from "@enum/decorator/api";

/**
 * Projects loaded relation objects into the configured response reference shape.
 * @template E - Entity type that owns the relation configuration.
 * @template R - Response value type.
 * @param {IApiControllerPropertiesRouteBaseRelationsResponse<E> | undefined} relationConfig - Response relation projection configuration.
 * @param {R} response - Response value to project.
 * @returns {R} Response value with projected relation references.
 */
export function ApiRouteProjectRelationResponse<E extends IApiBaseEntity, R>(relationConfig: IApiControllerPropertiesRouteBaseRelationsResponse<E> | undefined, response: R): R {
	if (!relationConfig?.load?.include) {
		return response;
	}

	const relationNames: Array<string> = Object.keys(relationConfig.load.include);
	const referenceKey: string = relationConfig.reference.key ?? "id";
	const responses: Array<Record<string, unknown>> = [];
	let projectedArray: Array<unknown> | undefined;

	if (Array.isArray(response)) {
		projectedArray = response.map((item: unknown): unknown => {
			if (item === null || typeof item !== "object") {
				return item;
			}

			const projectedItem: Record<string, unknown> = { ...(item as Record<string, unknown>) };
			responses.push(projectedItem);

			return projectedItem;
		});
	} else {
		const responseValue: unknown = response;

		if (responseValue !== null && typeof responseValue === "object" && "items" in responseValue && Array.isArray((responseValue as { items?: unknown }).items)) {
			(responseValue as { items: Array<unknown> }).items = (responseValue as { items: Array<unknown> }).items.map((item: unknown): unknown => {
				if (item === null || typeof item !== "object") {
					return item;
				}

				const projectedItem: Record<string, unknown> = { ...(item as Record<string, unknown>) };
				responses.push(projectedItem);

				return projectedItem;
			});
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

	return projectedArray ? (projectedArray as R) : response;
}
