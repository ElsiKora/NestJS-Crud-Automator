import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";

const DETAILS_ENTITY: IApiBaseEntity = { name: "ErrorDetails" };

// A duplicate key answers one body whether the create's own check or the database refused the row, so it carries no driver text such as the constraint, table or key value.
export class ExceptionDetailsUniqueViolationDTO {
	@ApiPropertyEnum({
		entity: DETAILS_ENTITY,
		enum: { UNIQUE_VIOLATION: EApiExceptionDetailsType.UNIQUE_VIOLATION },
		enumName: "ExceptionDetailsUniqueViolationType",
		exampleValue: EApiExceptionDetailsType.UNIQUE_VIOLATION,
		isRequired: true,
		isResponse: true,
	})
	type: EApiExceptionDetailsType.UNIQUE_VIOLATION = EApiExceptionDetailsType.UNIQUE_VIOLATION;
}
