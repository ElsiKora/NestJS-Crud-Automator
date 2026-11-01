import { ExceptionDetailsForeignKeyViolationDTO, ExceptionDetailsInvalidReferenceDTO, ExceptionDetailsUniqueViolationDTO } from "@class/utility/dto/exception/details";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { EApiExceptionDetailsType } from "@enum/utility";
import { HttpStatus } from "@nestjs/common";
import { DtoGenerateException } from "@utility/dto/generate/exception.utility";
import { describe, expect, it } from "vitest";

const getProperty = (status: HttpStatus, key: string): Record<string, unknown> | undefined => Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, DtoGenerateException(status).prototype as object, key) as Record<string, unknown> | undefined;

describe("DtoGenerateException", () => {
	it("caches generated DTOs per status code", () => {
		const first = DtoGenerateException(HttpStatus.BAD_REQUEST);
		const second = DtoGenerateException(HttpStatus.BAD_REQUEST);

		expect(first).toBe(second);
	});

	it("names generated DTOs based on status", () => {
		const dto = DtoGenerateException(HttpStatus.NOT_FOUND);

		expect(dto.name).toBe("ExceptionNotFoundDTO");
	});

	it("keeps the property order of the error body", () => {
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, DtoGenerateException(HttpStatus.CONFLICT).prototype as object)).toEqual([":correlationID", ":details", ":error", ":message", ":statusCode", ":timestamp"]);
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, DtoGenerateException(HttpStatus.NOT_FOUND).prototype as object)).toEqual([":correlationID", ":error", ":message", ":statusCode", ":timestamp"]);
	});

	it("describes the message as free text or a string array on every status", () => {
		for (const status of [HttpStatus.BAD_REQUEST, HttpStatus.NOT_FOUND, HttpStatus.INTERNAL_SERVER_ERROR]) {
			const message: Record<string, unknown> | undefined = getProperty(status, "message");

			expect(message, String(status)).toMatchObject({ oneOf: [{ type: "string" }, { items: { type: "string" }, type: "array" }], required: true });
			expect(message, String(status)).not.toHaveProperty("pattern");
			expect(message, String(status)).not.toHaveProperty("maxLength");
		}
	});

	it("describes details only for the statuses that carry them", () => {
		const reference = (dto: { name: string }): string => `#/components/schemas/${dto.name}`;

		expect(getProperty(HttpStatus.BAD_REQUEST, "details")).toMatchObject({ discriminator: { mapping: { [EApiExceptionDetailsType.FOREIGN_KEY_VIOLATION]: reference(ExceptionDetailsForeignKeyViolationDTO), [EApiExceptionDetailsType.INVALID_REFERENCE]: reference(ExceptionDetailsInvalidReferenceDTO) }, propertyName: "type" }, required: false });
		expect(getProperty(HttpStatus.CONFLICT, "details")).toMatchObject({ discriminator: { mapping: { [EApiExceptionDetailsType.UNIQUE_VIOLATION]: reference(ExceptionDetailsUniqueViolationDTO) }, propertyName: "type" }, required: false });

		for (const status of [HttpStatus.UNAUTHORIZED, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.INTERNAL_SERVER_ERROR]) {
			expect(getProperty(status, "details"), String(status)).toBeUndefined();
		}
	});
});
