import { STATUS_CODES } from "node:http";

import { ExceptionDetailsForeignKeyViolationDTO, ExceptionDetailsUniqueViolationDTO } from "@class/utility/dto/exception/details";
import { DATE_CONSTANT } from "@constant/date.constant";
import { NUMBER_CONSTANT } from "@constant/number.constant";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyDataType, EApiPropertyNumberType } from "@enum/decorator/api";
import { EApiExceptionDetailsType } from "@enum/utility/exception-details-type.enum";
import { HttpStatus, type Type } from "@nestjs/common";
import { ApiExtraModels, ApiProperty, type ApiPropertyOptions } from "@nestjs/swagger";
import { CamelCaseString } from "@utility/camel-case-string.utility";

// Free text, or the list of messages a ValidationPipe answers
const ERROR_MESSAGE_PROPERTY_OPTIONS: ApiPropertyOptions = {
	description: "Error message",
	example: "Error message",
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	nullable: false,
	oneOf: [{ type: EApiPropertyDataType.STRING }, { items: { type: EApiPropertyDataType.STRING }, type: "array" }],
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	readOnly: true,
	// eslint-disable-next-line @elsikora/typescript/naming-convention
	required: true,
};

const exceptionDtoCache: Map<HttpStatus, Type<unknown>> = new Map<HttpStatus, Type<unknown>>();

/**
 * Creates exception DTOs with standardized properties based on HTTP status codes.
 * Generates a class with properties like correlationID, error name, message, status code, and timestamp,
 * all properly decorated with Swagger and validation decorators.
 * @param {HttpStatus} httpStatus - The HTTP status code for the exception
 * @returns {Type<unknown>} A generated DTO class for the exception
 */
export function DtoGenerateException(httpStatus: HttpStatus): Type<unknown> {
	const cached: Type<unknown> | undefined = exceptionDtoCache.get(httpStatus);

	if (cached) {
		return cached;
	}

	const errorName: string = HttpStatus[httpStatus];
	const errorText: string = STATUS_CODES[httpStatus] ?? "Error";

	// Free text: the status text, or a string the thrown exception sets
	const errorNameOptions: ApiPropertyOptions = {
		description: "Error name",
		example: errorText,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		nullable: false,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		readOnly: true,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		required: true,
		type: EApiPropertyDataType.STRING,
	};

	class GeneratedErrorDTO {
		@ApiPropertyUUID({ entity: { name: "Correlation" }, isResponse: true })
		correlationID!: string;

		@ApiPropertyObject({
			description: "details",
			discriminator: {
				mapping: {
					[EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION]: ExceptionDetailsForeignKeyViolationDTO,
					[EApiExceptionDetailsType.UNIQUE_VIOLATION]: ExceptionDetailsUniqueViolationDTO,
				},
				propertyName: "type",
				shouldKeepDiscriminatorProperty: true,
			},
			entity: { name: "Error" },
			isRequired: false,
			isResponse: true,
			type: [ExceptionDetailsForeignKeyViolationDTO, ExceptionDetailsUniqueViolationDTO],
		})
		details?: Record<string, unknown>;

		@ApiProperty(errorNameOptions)
		error: string = errorText;

		@ApiProperty(ERROR_MESSAGE_PROPERTY_OPTIONS)
		message: Array<string> | string = "Error message";

		@ApiPropertyEnum({
			description: "status code",
			entity: { name: "Error" },
			enum: HttpStatus,
			enumName: "EHttpStatus",
			exampleValue: httpStatus,
			isResponse: true,
		})
		statusCode: HttpStatus = httpStatus;

		@ApiPropertyNumber({
			description: "timestamp",
			entity: { name: "Error" },
			exampleValue: Date.now(),
			format: EApiPropertyNumberType.INTEGER,
			isResponse: true,
			maximum: DATE_CONSTANT.MAXIMUM_UNIX_TIME,
			minimum: DATE_CONSTANT.MINIMUM_UNIX_TIME,
			multipleOf: NUMBER_CONSTANT.ONE,
		})
		timestamp!: number;
	}

	// Register discriminator DTOs so Swagger includes their schemas in components.schemas
	ApiExtraModels(ExceptionDetailsForeignKeyViolationDTO, ExceptionDetailsUniqueViolationDTO)(GeneratedErrorDTO);

	Object.defineProperty(GeneratedErrorDTO, "name", { value: `Exception${CamelCaseString(errorName)}DTO` });

	exceptionDtoCache.set(httpStatus, GeneratedErrorDTO);

	return GeneratedErrorDTO;
}
