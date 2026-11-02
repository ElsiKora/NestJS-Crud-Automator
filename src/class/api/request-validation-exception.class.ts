import type { ValidationError } from "class-validator";

import { BadRequestException } from "@nestjs/common";
import { ApiRouteValidationFlattenErrors } from "@utility/api/route/validation-flatten-errors.utility";

/**
 * A request refused before any pipe ran, which a host's own `exceptionFactory` therefore never saw.
 * The response is the message list a `ValidationPipe` answers with, and `validationErrors` holds the same failures for a host filter that translates them.
 * A failure's `property` can hold client text and it has no `value` or `target`: read it, do not send it.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/guides/error-handling | Guides - Error Handling}
 */
export class ApiRequestValidationException extends BadRequestException {
	public readonly validationErrors: Array<ValidationError>;

	public constructor(validationErrors: Array<ValidationError>) {
		super(ApiRouteValidationFlattenErrors(validationErrors));
		this.validationErrors = validationErrors;
	}
}
