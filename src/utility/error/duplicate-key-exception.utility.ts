import type { TApiEntityReference } from "@type/api-entity-reference.type";

import { EErrorStringAction } from "@enum/utility";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";
import { ConflictException, HttpStatus } from "@nestjs/common";
import { ErrorString } from "@utility/error/string.utility";

/**
 * Creates the one 409 a built-in function answers for a duplicate key, whether its own check or the database refused the row.
 * The body carries no driver text, such as the constraint, table or key value, so both paths answer the same body on every driver.
 * @param {TApiEntityReference} entity - Entity of the function, named in the code
 * @param {unknown} [cause] - Database error that refused the row, kept for logs and exception filters
 * @returns {ConflictException} The duplicate key conflict
 */
export function ErrorDuplicateKeyException(entity: TApiEntityReference, cause?: unknown): ConflictException {
	const message: string = ErrorString({ entity, type: EErrorStringAction.DUPLICATE_KEY });

	return new ConflictException({ details: { type: EApiExceptionDetailsType.UNIQUE_VIOLATION }, error: "Conflict", message, statusCode: HttpStatus.CONFLICT }, cause === undefined ? undefined : { cause });
}
