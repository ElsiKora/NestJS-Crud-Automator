import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { EApiPropertyStringType } from "@enum/decorator/api";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";

const DETAILS_ENTITY: IApiBaseEntity = { name: "ErrorDetails" };

const DETAILS_MIN_LENGTH: number = 0;
const DETAILS_MAX_LENGTH_IDENTIFIER: number = 128;
const DETAILS_MAX_LENGTH_DETAIL: number = 1024;

const DETAILS_PATTERN_IDENTIFIER: string = String.raw`/^[\s\S]{0,128}$/`;
const DETAILS_PATTERN_DETAIL: string = String.raw`/^[\s\S]{0,1024}$/`;

export class ExceptionDetailsUniqueViolationDTO {
	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "UQ_user_login",
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
		exampleValue: "Key (login)=(jack) already exists.",
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
		exampleValue: "login",
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
		exampleValue: "user",
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
		exampleValue: EApiExceptionDetailsType.UNIQUE_VIOLATION,
		isRequired: true,
		isResponse: true,
	})
	type: EApiExceptionDetailsType = EApiExceptionDetailsType.UNIQUE_VIOLATION;

	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "jack",
		format: EApiPropertyStringType.STRING,
		isRequired: false,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_DETAIL,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_DETAIL,
	})
	value?: string;
}
