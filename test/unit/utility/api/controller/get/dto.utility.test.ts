import "reflect-metadata";

import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiEntity } from "@interface/entity";

import { EApiControllerGetListQueryPaginationMode, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { ApiControllerGetDto } from "@utility/api/controller/get/dto.utility";
import { describe, expect, it } from "vitest";

import { SharedItemDto as FirstSharedItemDto } from "./fixture/first-shared-item.dto";
import { SharedItemDto as SecondSharedItemDto } from "./fixture/second-shared-item.dto";

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
	const cursorPlan = { pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } as unknown as IApiControllerGetListQueryPlan;
	const pagePlan = { controllerName: "PageController", filter: { fields: {}, isLegacy: true }, order: { fields: {}, isLegacy: true }, schemaName: "PageQueryDTO", signature: "page" } as IApiControllerGetListQueryPlan;

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

	it("keeps PAGE custom response wrapper cache identity unchanged when a query plan is present", () => {
		const route = { dto: { response: { itemType: GetDtoItemDto } } };
		const baseline = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, route);
		const planned = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, route, pagePlan);

		expect(planned).toBe(baseline);
	});

	it("keeps a manual full response DTO under CURSOR pagination", () => {
		const dto = ApiControllerGetDto(
			properties,
			entityMetadata,
			EApiRouteType.GET_LIST,
			EApiDtoType.RESPONSE,
			{
				dto: { response: GetDtoListDto },
			},
			cursorPlan,
		);

		expect(dto).toBe(GetDtoListDto);
	});

	it("generates the flat CURSOR wrapper around a configured item DTO", () => {
		const dto = ApiControllerGetDto(
			properties,
			entityMetadata,
			EApiRouteType.GET_LIST,
			EApiDtoType.RESPONSE,
			{
				dto: { response: { itemType: GetDtoItemDto } },
			},
			cursorPlan,
		);
		const itemsMetadata = Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, dto?.prototype, "items");

		expect(dto?.name).toBe("GetDtoEntityGetListResponseGetDtoItemDtoCursor");
		expect(itemsMetadata?.type).toBe(GetDtoItemDto);
		expect(Reflect.hasMetadata(DECORATORS.API_MODEL_PROPERTIES, dto?.prototype, "nextCursor")).toBe(true);
		expect(Reflect.hasMetadata(DECORATORS.API_MODEL_PROPERTIES, dto?.prototype, "previousCursor")).toBe(true);
		expect(Reflect.hasMetadata(DECORATORS.API_MODEL_PROPERTIES, dto?.prototype, "totalCount")).toBe(false);
	});

	it("keys generated CURSOR wrappers by item constructor identity rather than class name", () => {
		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: FirstSharedItemDto } } }, cursorPlan)).not.toThrow();
		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: SecondSharedItemDto } } }, cursorPlan)).toThrow("configure a unique response DTO name");

		const first = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: FirstSharedItemDto, name: "FirstSharedCursorResponse" } } }, cursorPlan);
		const second = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: SecondSharedItemDto, name: "SecondSharedCursorResponse" } } }, cursorPlan);

		expect(first).not.toBe(second);
		expect(Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, first?.prototype, "items")?.type).toBe(FirstSharedItemDto);
		expect(Reflect.getMetadata(DECORATORS.API_MODEL_PROPERTIES, second?.prototype, "items")?.type).toBe(SecondSharedItemDto);
	});

	it("rejects one explicit wrapper schema name shared by PAGE and CURSOR envelopes", () => {
		const response = { itemType: GetDtoItemDto, name: "SharedPageAndCursorResponse" };

		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response } })).not.toThrow();
		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response } }, cursorPlan)).toThrow("another item constructor or pagination mode");
	});
});
