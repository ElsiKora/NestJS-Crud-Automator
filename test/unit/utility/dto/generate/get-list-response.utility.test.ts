import "reflect-metadata";

import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { DtoGenerateGetListResponse } from "@utility/dto/generate/get-list-response.utility";
import { describe, expect, it } from "vitest";

class ListEntity {
	public id?: string;
}

describe("DtoGenerateGetListResponse", () => {
	it("creates a named list response DTO", () => {
		const dto = DtoGenerateGetListResponse(ListEntity, ListEntity, "CustomListDTO");

		expect(dto.name).toBe("CustomListDTO");
	});

	it("decorates list response properties", () => {
		const dto = DtoGenerateGetListResponse(ListEntity, ListEntity, "CustomListDTO");

		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, dto.prototype, "items");
		expect(metadata).toBeDefined();
	});
});
