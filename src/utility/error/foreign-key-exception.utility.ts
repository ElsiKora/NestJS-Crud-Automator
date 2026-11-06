import type { TApiEntityReference } from "@type/api-entity-reference.type";

import { EApiFunctionType } from "@enum/decorator/api/function";
import { EErrorStringAction } from "@enum/utility";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";
import { BadRequestException, ConflictException, HttpStatus } from "@nestjs/common";
import { CapitalizeString } from "@utility/capitalize-string.utility";
import { DatabaseTypeOrmGetForeignKeyViolationDetails } from "@utility/database/typeorm/get/foreign-key-violation-details.utility";
import { DatabaseTypeOrmIsParentRowReferenced } from "@utility/database/typeorm/is/parent-row-referenced.utility";
import { FormatErrorEvidenceForLog } from "@utility/error/evidence-for-log.utility";
import { ErrorString } from "@utility/error/string.utility";
import { FormatUnknownForLog } from "@utility/format-unknown-for-log.utility";
import { LoggerUtility } from "@utility/logger.utility";

/**
 * Creates the one refusal a built-in function answers when the database refuses a row for a foreign key.
 * A DELETE, or a write the driver states hits a row that is still referenced, answers `409` with `{ENTITY}_REFERENCED`. Any other write names a related row that does not exist and answers `400` with `{ENTITY}_REFERENCE_NOT_VALID`.
 * The body carries no driver text, such as the constraint, table, column or key value. The log names the constraint, tables and columns the driver states, never the key value or the driver detail, and the driver error stays as the cause for exception filters.
 * @param {TApiEntityReference} entity - Entity of the function, named in the code
 * @param {EApiFunctionType} functionType - Function the database refused, which decides the direction when the driver does not state it
 * @param {unknown} cause - Database error that refused the row
 * @returns {BadRequestException | ConflictException} The foreign key refusal
 */
export function ErrorForeignKeyException(entity: TApiEntityReference, functionType: EApiFunctionType, cause: unknown): BadRequestException | ConflictException {
	const isReferenced: boolean = functionType === EApiFunctionType.DELETE || DatabaseTypeOrmIsParentRowReferenced(cause);

	// Schema names only: the key value and the driver detail quote what the client sent
	const violation: ReturnType<typeof DatabaseTypeOrmGetForeignKeyViolationDetails> = DatabaseTypeOrmGetForeignKeyViolationDetails(cause);
	const schemaNames: { constraint?: string; field?: string; referencedField?: string; referencedTable?: string; table?: string } = { constraint: violation?.constraint, field: violation?.field, referencedField: violation?.referencedField, referencedTable: violation?.referencedTable, table: violation?.table };

	LoggerUtility.getLogger(`ApiFunction${CapitalizeString(functionType)}`).verbose(`Foreign key violation ${isReferenced ? "(still referenced)" : "(reference not valid)"} for entity ${String(entity.name)}: ${FormatErrorEvidenceForLog(cause)} details=${FormatUnknownForLog(schemaNames)}`);

	const details: { type: EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION } = { type: EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION };

	if (isReferenced) {
		return new ConflictException({ details, error: "Conflict", message: ErrorString({ entity, type: EErrorStringAction.REFERENCED }), statusCode: HttpStatus.CONFLICT }, { cause });
	}

	return new BadRequestException({ details, error: "Bad Request", message: ErrorString({ entity, type: EErrorStringAction.REFERENCE_NOT_VALID }), statusCode: HttpStatus.BAD_REQUEST }, { cause });
}
