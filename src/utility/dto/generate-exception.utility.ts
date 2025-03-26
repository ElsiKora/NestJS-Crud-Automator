import { DATE_CONSTANT } from "@constant/date.constant";
import { EXCEPTION_DTO_CONSTANT } from "@constant/dto";
import { NUMBER_CONSTANT } from "@constant/number.constant";
import { ApiPropertyEnum } from "@decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyString } from "@decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyNumberType, EApiPropertyStringType } from "@enum/decorator/api";
import { HttpStatus, type Type } from "@nestjs/common";
import { CamelCaseString } from "@utility/camel-case-string.utility";

/**
 * Creates exception DTOs with standardized properties based on HTTP status codes.
 * Generates a class with properties like correlationID, error name, message, status code, and timestamp,
 * all properly decorated with Swagger and validation decorators.
 * @param {HttpStatus} httpStatus - The HTTP status code for the exception
 * @returns {Type<unknown>} A generated DTO class for the exception
 */
export function DtoGenerateException(httpStatus: HttpStatus): Type<unknown> {
	const errorName: string = HttpStatus[httpStatus];

	class GeneratedErrorDTO {
		@ApiPropertyUUID({ entity: { name: "Correlation" }, isResponse: true })
		correlationID!: string;

		@ApiPropertyString({
			description: "name",
			entity: { name: "Error" },
			exampleValue: CamelCaseString(errorName),
			format: EApiPropertyStringType.STRING,
			isResponse: true,
			maxLength: EXCEPTION_DTO_CONSTANT.MAXIMUM_ERROR_LENGTH,
			minLength: EXCEPTION_DTO_CONSTANT.MINIMUM_ERROR_LENGTH,
			pattern: "/^[a-zA-Z_ ]{3,64}$/",
		})
		error: string = CamelCaseString(errorName);

		@ApiPropertyString({
			description: "message",
			entity: { name: "Error" },
			exampleValue: "Error message",
			format: EApiPropertyStringType.STRING,
			isResponse: true,
			maxLength: EXCEPTION_DTO_CONSTANT.MAXIMUM_ERROR_MESSAGE_LENGTH,
			minLength: EXCEPTION_DTO_CONSTANT.MINIMUM_ERROR_MESSAGE_LENGTH,
			pattern: "/^[a-zA-Z_ ]{3,64}$/",
		})
		message: string = "Error message";

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

	Object.defineProperty(GeneratedErrorDTO, "name", { value: `Exception${CamelCaseString(errorName)}DTO` });

	return GeneratedErrorDTO;
}
