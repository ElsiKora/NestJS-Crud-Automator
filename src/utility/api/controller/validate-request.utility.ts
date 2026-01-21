import type { IApiRequestValidator } from "@interface/api/request-validator.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";

import { ErrorString } from "@utility/error/string.utility";

/**
 * Validates incoming request parameters against defined validators.
 * Sequentially applies validation functions and throws appropriate exceptions with error messages when validation fails.
 * @param {Array<IApiRequestValidator<E>> | undefined} validators - List of request validators to apply
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {Partial<E> | TApiControllerGetListQuery<E>} parameters - The request parameters to validate
 * @returns {Promise<void>} A promise that resolves when validation passes
 * @template E - The entity type
 */
export async function ApiControllerValidateRequest<E>(validators: Array<IApiRequestValidator<E>> | undefined, properties: IApiControllerProperties<E>, parameters: Partial<E> | TApiControllerGetListQuery<E>): Promise<void> {
	if (validators) {
		for (const validator of validators) {
			const result: boolean | Promise<boolean> = validator.validationFunction(parameters);
			const isValid: boolean = result instanceof Promise ? await result : result;

			if (!isValid) {
				throw new validator.exception(ErrorString({ entity: properties.entity, type: validator.errorType }));
			}
		}
	}
}
