import type { ValidationError } from "class-validator";

/**
 * Flattens class-validator errors into the same message array shape used by Nest ValidationPipe.
 * @param {Array<ValidationError>} errors - Validation errors to flatten.
 * @param {string} [parentProperty] - Parent property path.
 * @returns {Array<string>} Flattened validation messages.
 */
export function ApiRouteValidationFlattenErrors(errors: Array<ValidationError>, parentProperty?: string): Array<string> {
	const messages: Array<string> = [];

	for (const error of errors) {
		const propertyPath: string = parentProperty ? `${parentProperty}.${error.property}` : error.property;

		if (error.constraints) {
			messages.push(
				...Object.values(error.constraints).map((message: string): string => {
					return parentProperty ? message.replace(`${error.property} `, `${propertyPath} `) : message;
				}),
			);
		}

		if (error.children && error.children.length > 0) {
			messages.push(...ApiRouteValidationFlattenErrors(error.children, propertyPath));
		}
	}

	return messages;
}
