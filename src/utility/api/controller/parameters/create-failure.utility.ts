import { ValidationError } from "class-validator";

/**
 * Builds the failure of a path value that no class-validator rule names, for an `ApiRequestValidationException`.
 * The failure holds no `value` or `target`, so it carries nothing of the request but the parameter name.
 * @param {string} parameter - Path parameter name.
 * @param {string} constraint - Stable constraint name.
 * @param {string} message - Message of the failure, as the default body lists it.
 * @returns {ValidationError} The failure.
 */
export function ApiControllerParametersCreateFailure(parameter: string, constraint: string, message: string): ValidationError {
	return Object.assign(new ValidationError(), { children: [], constraints: { [constraint]: message }, property: parameter });
}
