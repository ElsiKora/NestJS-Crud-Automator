import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { EApiPropertyStringType } from "@enum/decorator/api";
import { EApiControllerRelationReferenceShape } from "@enum/decorator/api/controller/relation-reference-shape.enum";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";

const DETAILS_ENTITY: IApiBaseEntity = { name: "ErrorDetails" };

const DETAILS_MIN_LENGTH: number = 0;
const DETAILS_MAX_LENGTH_IDENTIFIER: number = 128;

const DETAILS_PATTERN_IDENTIFIER: string = String.raw`/^[\s\S]{0,128}$/`;

export class ExceptionDetailsInvalidReferenceDTO {
	@ApiPropertyEnum({
		entity: DETAILS_ENTITY,
		enum: EApiControllerRelationReferenceShape,
		enumName: "EApiControllerRelationReferenceShape",
		exampleValue: EApiControllerRelationReferenceShape.SCALAR,
		isRequired: true,
		isResponse: true,
	})
	expectedShape!: EApiControllerRelationReferenceShape;

	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "owner",
		format: EApiPropertyStringType.STRING,
		isRequired: true,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_IDENTIFIER,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_IDENTIFIER,
	})
	propertyName!: string;

	@ApiPropertyString({
		entity: DETAILS_ENTITY,
		exampleValue: "id",
		format: EApiPropertyStringType.STRING,
		isRequired: true,
		isResponse: true,
		maxLength: DETAILS_MAX_LENGTH_IDENTIFIER,
		minLength: DETAILS_MIN_LENGTH,
		pattern: DETAILS_PATTERN_IDENTIFIER,
	})
	referenceKey!: string;

	@ApiPropertyEnum({
		entity: DETAILS_ENTITY,
		enum: { INVALID_REFERENCE: EApiExceptionDetailsType.INVALID_REFERENCE },
		enumName: "ExceptionDetailsInvalidReferenceType",
		exampleValue: EApiExceptionDetailsType.INVALID_REFERENCE,
		isRequired: true,
		isResponse: true,
	})
	type: EApiExceptionDetailsType.INVALID_REFERENCE = EApiExceptionDetailsType.INVALID_REFERENCE;
}
