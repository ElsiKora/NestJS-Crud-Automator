import { HttpStatus } from "@nestjs/common";
import { DtoGenerateException } from "@utility/dto/generate/exception.utility";
import { describe, expect, it } from "vitest";

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
});
