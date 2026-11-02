import type { ValidationError } from "class-validator";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";

const MAXIMUM_CAUSES: number = 16;

/**
 * Reads the validation failures of an `ApiRequestValidationException`, thrown as is or kept in the `cause` chain, as `CorrelationIDResponseBodyInterceptor` keeps what it caught.
 * Any value can be thrown, so the walk is bounded, which also ends a cycle, and a value that throws on being read counts as holding no failures.
 * @param {unknown} exception - The value an exception filter caught.
 * @returns {Array<ValidationError> | undefined} The failures, or undefined when the value holds none.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/guides/error-handling | Guides - Error Handling}
 */
export function ApiRequestValidationGetErrors(exception: unknown): Array<ValidationError> | undefined {
	try {
		let current: unknown = exception;

		for (let index: number = 0; index < MAXIMUM_CAUSES; index += 1) {
			if (current instanceof ApiRequestValidationException) {
				return current.validationErrors;
			}

			if (typeof current !== "object" || current === null) {
				return undefined;
			}

			current = Reflect.get(current, "cause");
		}
	} catch {
		return undefined;
	}

	return undefined;
}
