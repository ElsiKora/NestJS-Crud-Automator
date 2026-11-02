import type { ValidationError } from "class-validator";

import { BadRequestException } from "@nestjs/common";
import { ApiRouteValidationFlattenErrors } from "@utility/api/route/validation-flatten-errors.utility";

/**
 * A request refused before any pipe ran, which a host's own `exceptionFactory` therefore never saw.
 * The response is the message list a `ValidationPipe` answers with, and `validationErrors` holds the same failures for a host filter that translates them.
 * A failure's `property` can hold client text: read it, do not send it. A failure that class-validator raised on a path value keeps its `value` and `target`, as a pipe's `exceptionFactory` gets it; every other failure has neither.
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/guides/error-handling | Guides - Error Handling}
 */
export class ApiRequestValidationException extends BadRequestException {
	public readonly validationErrors: Array<ValidationError>;

	public constructor(validationErrors: Array<ValidationError>) {
		super(ApiRouteValidationFlattenErrors(validationErrors));
		this.validationErrors = validationErrors;
	}
}
