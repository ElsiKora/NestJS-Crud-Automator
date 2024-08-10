import { HttpStatus } from "@nestjs/common";
import { ApiPropertyNumber, ApiPropertyObject, ApiPropertyString, ApiPropertyUUID } from "../../decorator";
import { EApiPropertyDataType } from "../../enum";
import { DATE_CONSTANT, EXCEPTION_DTO_CONSTANT, NUMBER_CONSTANT } from "../../constant";

export class ExceptionNotFoundDTO {
	@ApiPropertyUUID({ entity: { name: "Correlation" }, expose: true, response: true })
	correlationID!: string;

	@ApiPropertyString({
		description: "name",
		entity: { name: "Error" },
		example: "Not Found",
		expose: true,
		format: EApiPropertyDataType.TEXT,
		maxLength: EXCEPTION_DTO_CONSTANT.MAXIMUM_ERROR_LENGTH,
		minLength: EXCEPTION_DTO_CONSTANT.MINIMUM_ERROR_LENGTH,
		pattern: "/^[a-zA-Z ]{3,64}$/",
		response: true,
		type: EApiPropertyDataType.STRING,
	})
	error: string = "Not Found";

	@ApiPropertyString({
		description: "message",
		entity: { name: "Error" },
		example: "Error message",
		expose: true,
		format: EApiPropertyDataType.TEXT,
		maxLength: EXCEPTION_DTO_CONSTANT.MAXIMUM_ERROR_MESSAGE_LENGTH,
		minLength: EXCEPTION_DTO_CONSTANT.MINIMUM_ERROR_MESSAGE_LENGTH,
		pattern: "/^[a-zA-Z ]{3,64}$/",
		response: true,
		type: EApiPropertyDataType.STRING,
	})
	message: string = "Error message";

	@ApiPropertyObject({
		default: HttpStatus.NOT_FOUND,
		description: "status code",
		entity: { name: "Error" },
		enum: HttpStatus,
		expose: true,
		response: true,
	})
	statusCode: HttpStatus = HttpStatus.NOT_FOUND;

	@ApiPropertyNumber({
		description: "timestamp",
		entity: { name: "Error" },
		example: Date.now(),
		expose: true,
		maximum: DATE_CONSTANT.MAXIMUM_UNIX_TIME,
		minimum: DATE_CONSTANT.MINIMUM_UNIX_TIME,
		multipleOf: NUMBER_CONSTANT.ONE,
		response: true,
		type: EApiPropertyDataType.INTEGER,
	})
	timestamp!: number;
}
