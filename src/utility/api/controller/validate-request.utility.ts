import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiControllerPropertiesRouteBaseRequestTarget } from "@interface/decorator/api/controller/properties/route/base";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";

import { ErrorString } from "@utility/error/string.utility";

/**
 * Validates incoming request parameters against defined validators.
 * Sequentially applies validation functions and throws appropriate exceptions with error messages when validation fails.
 * @param {IApiControllerPropertiesRouteBaseRequestTarget<E> | undefined} target - Target request pipeline configuration
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {Partial<E> | TApiControllerGetListQuery<E>} parameters - The request parameters to validate
 * @returns {Promise<void>} A promise that resolves when validation passes
 * @template E - The entity type
 */
export async function ApiControllerValidateRequest<E extends IApiBaseEntity, M extends EApiControllerGetListQueryPaginationMode = EApiControllerGetListQueryPaginationMode.PAGE>(target: IApiControllerPropertiesRouteBaseRequestTarget<E, M> | undefined, properties: IApiControllerProperties<E>, parameters: Partial<E> | TApiControllerGetListQuery<E, M>): Promise<void> {
	if (!target?.validators) {
		return;
	}

	for (const validator of target.validators) {
		const result: boolean | Promise<boolean> = validator.validationFunction(parameters);
		const isValid: boolean = result instanceof Promise ? await result : result;

		if (!isValid) {
			throw new validator.exception(ErrorString({ entity: properties.entity, type: validator.errorType }));
		}
	}
}
