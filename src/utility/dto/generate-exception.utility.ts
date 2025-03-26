import { HttpStatus, type Type } from "@nestjs/common";

import { DATE_CONSTANT, EXCEPTION_DTO_CONSTANT, NUMBER_CONSTANT } from "../../constant";
import { ApiPropertyEnum } from "../../decorator/api/property/enum.decorator";
import { ApiPropertyNumber } from "../../decorator/api/property/number.decorator";
import { ApiPropertyString } from "../../decorator/api/property/string.decorator";
import { ApiPropertyUUID } from "../../decorator/api/property/uuid.decorator";
import { EApiPropertyNumberType, EApiPropertyStringType } from "../../enum";
import { CamelCaseString } from "../camel-case-string.utility";

/**
 *
 * @param httpStatus
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
