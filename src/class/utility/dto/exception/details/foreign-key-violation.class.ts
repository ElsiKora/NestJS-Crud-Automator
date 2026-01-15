import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { EApiPropertyStringType } from "@enum/decorator/api";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details";

const DETAILS_ENTITY: IApiBaseEntity = { name: "ErrorDetails" };

const DETAILS_MIN_LENGTH: number = 0;
const DETAILS_MAX_LENGTH_IDENTIFIER: number = 128;
const DETAILS_MAX_LENGTH_DETAIL: number = 1024;

const DETAILS_PATTERN_IDENTIFIER: string = String.raw`/^[\s\S]{0,128}$/`;
const DETAILS_PATTERN_DETAIL: string = String.raw`/^[\s\S]{0,1024}$/`;

export class ExceptionDetailsForeignKeyViolationDTO {
	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "FK_5bc39ec0540f37ff97f5aba36e1",
		format: EApiPropertyStringType.STRING,
		isRequired: false,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_IDENTIFIER,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_IDENTIFIER,
	})
	constraint?: string;

	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: 'Key (user_id)=(123) is not present in table "user".',
		format: EApiPropertyStringType.STRING,
		isRequired: false,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_DETAIL,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_DETAIL,
	})
	detail?: string;

	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "user_id",
		format: EApiPropertyStringType.STRING,
		isRequired: false,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_IDENTIFIER,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_IDENTIFIER,
	})
	field?: string;

	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "id",
		format: EApiPropertyStringType.STRING,
		isRequired: false,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_IDENTIFIER,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_IDENTIFIER,
	})
	referencedField?: string;

	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "user",
		format: EApiPropertyStringType.STRING,
		isRequired: false,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_IDENTIFIER,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_IDENTIFIER,
	})
	referencedTable?: string;

	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "user_balance",
		format: EApiPropertyStringType.STRING,
		isRequired: false,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_IDENTIFIER,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_IDENTIFIER,
	})
	table?: string;

	@ApiPropertyEnum({
		entity: DETAILS_ENTITY,
		enum: EApiExceptionDetailsType,
		enumName: "EApiExceptionDetailsType",
		exampleValue: EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION,
		isRequired: true,
		isResponse: true,
	})
	type: EApiExceptionDetailsType = EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION;

	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "123",
		format: EApiPropertyStringType.STRING,
		isRequired: false,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_DETAIL,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_DETAIL,
	})
	value?: string;
}
