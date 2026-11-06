import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { EApiPropertyStringType } from "@enum/decorator/api";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";

const DETAILS_ENTITY: IApiBaseEntity = { name: "ErrorDetails" };

const DETAILS_MIN_LENGTH: number = 0;
const DETAILS_MAX_LENGTH_DETAIL: number = 1024;

const DETAILS_PATTERN_DETAIL: string = String.raw`/^[\s\S]{0,1024}$/`;

export class ExceptionDetailsToManyUpdateKeyDTO {
	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "owner.tags",
		format: EApiPropertyStringType.STRING,
		isRequired: true,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_DETAIL,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_DETAIL,
	})
	propertyName!: string;

	@ApiPropertyEnum({
		entity: DETAILS_ENTITY,
		enum: { TO_MANY_UPDATE_KEY: EApiExceptionDetailsType.TO_MANY_UPDATE_KEY },
		enumName: "ExceptionDetailsToManyUpdateKeyType",
		exampleValue: EApiExceptionDetailsType.TO_MANY_UPDATE_KEY,
		isRequired: true,
		isResponse: true,
	})
	type: EApiExceptionDetailsType.TO_MANY_UPDATE_KEY = EApiExceptionDetailsType.TO_MANY_UPDATE_KEY;
}
