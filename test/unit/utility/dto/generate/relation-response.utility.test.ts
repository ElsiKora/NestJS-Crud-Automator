import type { IApiEntity } from "@interface/entity";

import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
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

	it.each([
		["created_by", "OrderGetResponseCreatedByDTO"],
		["userID", "OrderGetResponseUserIDDTO"],
		["HTMLContent", "OrderGetResponseHTMLContentDTO"],
		["x-id", "OrderGetResponseXIdDTO"],
	])("names the relation DTO of property %s %s, with separators removed and every other letter kept as written", (propertyName: string, name: string) => {
		expect(DtoGenerateRelationResponse(entity, EApiRouteType.GET, EApiDtoType.RESPONSE, propertyName, { dtoNameBase: "OrderGetResponse" }).name).toBe(name);
	});

	it("decorates the id property", () => {
		const dto = DtoGenerateRelationResponse(entity, EApiRouteType.GET, EApiDtoType.RESPONSE, "owner", { dtoNameBase: "DecoratedOrderGetResponse" });
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto.prototype, "id");

		expect(metadata).toBeDefined();
	});

	it("uses relation-aware metadata for the id description", () => {
		const dto = DtoGenerateRelationResponse(entity, EApiRouteType.GET, EApiDtoType.RESPONSE, "owner", {
			dtoNameBase: "DescribedOrderGetResponse",
			relationDescription: "owner",
		});
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto.prototype, "id");

		expect(metadata.description).toBe("Order owner identifier");
		expect(metadata.description).not.toBe("Order identifier");
	});

	it("uses the relation property name when relation description is missing", () => {
		const dto = DtoGenerateRelationResponse(entity, EApiRouteType.GET, EApiDtoType.RESPONSE, "owner", { dtoNameBase: "UndescribedOrderGetResponse" });
		const metadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto.prototype, "id");

		expect(metadata.description).toBe("Order owner identifier");
	});
});
