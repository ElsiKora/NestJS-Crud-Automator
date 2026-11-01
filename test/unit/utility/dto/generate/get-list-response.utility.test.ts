import "reflect-metadata";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { DtoGenerateGetListResponse } from "@utility/dto/generate/get-list";
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
		const dto = DtoGenerateGetListResponse(ListEntity, ListEntity, "DecoratedListDTO");

		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto.prototype, "items");
		expect(metadata).toBeDefined();
	});
});
