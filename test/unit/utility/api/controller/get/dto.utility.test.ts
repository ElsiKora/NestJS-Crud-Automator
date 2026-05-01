import "reflect-metadata";

import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";

import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { ApiControllerGetDto } from "@utility/api/controller/get/dto.utility";
import { describe, expect, it } from "vitest";

class GetDtoEntity {}

class GetDtoItemDto {}

class GetDtoListDto {}

describe("ApiControllerGetDto", () => {
	const entityMetadata: IApiEntity<GetDtoEntity> = {
		columns: [],
		name: "GetDtoEntity",
		primaryKey: undefined,
		tableName: "get_dto_entities",
	};
	const properties: IApiControllerProperties<GetDtoEntity> = {
		entity: GetDtoEntity,
		routes: {},
	};

	it("supports full GET_LIST response wrapper DTO mode", () => {
		const dto = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, {
			dto: {
				response: GetDtoListDto,
			},
		});

		expect(dto).toBe(GetDtoListDto);
	});

	it("generates a GET_LIST wrapper around a configured item response DTO", () => {
		const dto = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, {
			dto: {
				response: {
					itemType: GetDtoItemDto,
				},
			},
		});
		const itemsMetadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, dto?.prototype, "items");

		expect(dto?.name).toBe("GetDtoEntityGetListResponseGetDtoItemDto");
		expect(itemsMetadata?.type).toBe(GetDtoItemDto);
	});

	it("uses explicit GET_LIST item response wrapper names", () => {
		const dto = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, {
			dto: {
				response: {
					itemType: GetDtoItemDto,
					name: "ExplicitGetDtoListDto",
				},
			},
		});

		expect(dto?.name).toBe("ExplicitGetDtoListDto");
	});
});
