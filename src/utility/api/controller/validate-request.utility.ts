import { ErrorString } from "../../error-string.utility";

import type { IApiControllerProperties, IApiRequestValidator } from "../../../interface";
import type {TApiFunctionGetListProperties} from "../../../type";

export async function ApiControllerValidateRequest<E>(validators: Array<IApiRequestValidator<E>> | undefined, properties: IApiControllerProperties<E>, parameters: Partial<E> | TApiFunctionGetListProperties<E>): Promise<void> {
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
