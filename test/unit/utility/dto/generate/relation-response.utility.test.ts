import type { IApiEntity } from "@interface/entity";

import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { DtoGenerateRelationResponse } from "@utility/dto/generate/relation-response.utility";
import { describe, expect, it } from "vitest";

const entity: IApiEntity<{ name?: string }> = {
	columns: [],
	name: "Order",
	primaryKey: undefined,
	tableName: "orders",
};

describe("DtoGenerateRelationResponse", () => {
	it("creates a properly named relation DTO", () => {
		const dto = DtoGenerateRelationResponse(entity, EApiRouteType.GET, EApiDtoType.RESPONSE, "owner");

		expect(dto.name).toBe("OrderGetResponseOwnerDTO");
	});

	it("decorates the id property", () => {
		const dto = DtoGenerateRelationResponse(entity, EApiRouteType.GET, EApiDtoType.RESPONSE, "owner");
		const metadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, dto.prototype, "id");

		expect(metadata).toBeDefined();
	});
});
