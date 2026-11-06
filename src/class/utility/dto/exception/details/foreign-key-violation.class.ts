import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";

const DETAILS_ENTITY: IApiBaseEntity = { name: "ErrorDetails" };

// A foreign key refusal answers one body on every driver, so it carries no driver text such as the constraint, table, column or key value; the log carries those.
export class ExceptionDetailsForeignKeyViolationDTO {
	@ApiPropertyEnum({
		entity: DETAILS_ENTITY,
		enum: { FOREIGN_KEY_VIOLATION: EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION },
		enumName: "ExceptionDetailsForeignKeyViolationType",
		exampleValue: EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION,
		isRequired: true,
		isResponse: true,
	})
	type: EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION = EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION;
}
