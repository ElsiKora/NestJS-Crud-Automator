import "reflect-metadata";

import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerTableInheritancePlan } from "@interface/class/api/controller/table-inheritance";
import type { IApiEntity } from "@interface/entity";

import { EApiControllerGetListQueryPaginationMode, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { ApiControllerGetDto, ApiControllerGetResponseDto } from "@utility/api/controller/get/dto.utility";
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
		const dto = ApiControllerGetDto(
			properties,
			entityMetadata,
			EApiRouteType.GET_LIST,
			EApiDtoType.RESPONSE,
			{
				dto: {
					response: GetDtoListDto,
				},
			},
			"TestController",
		);

		expect(dto).toBe(GetDtoListDto);
	});

	it("generates a GET_LIST wrapper around a configured item response DTO", () => {
		const dto = ApiControllerGetDto(
			properties,
			entityMetadata,
			EApiRouteType.GET_LIST,
			EApiDtoType.RESPONSE,
			{
				dto: {
					response: {
						itemType: GetDtoItemDto,
					},
				},
			},
			"TestController",
		);
		const itemsMetadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype, "items");

		expect(dto?.name).toBe("TestControllerGetListResponseGetDtoItemDto");
		expect(itemsMetadata?.type).toBe(GetDtoItemDto);
	});

	it("uses explicit GET_LIST item response wrapper names", () => {
		const dto = ApiControllerGetDto(
			properties,
			entityMetadata,
			EApiRouteType.GET_LIST,
			EApiDtoType.RESPONSE,
			{
				dto: {
					response: {
						itemType: GetDtoItemDto,
						name: "ExplicitGetDtoListDto",
					},
				},
			},
			"TestController",
		);

		expect(dto?.name).toBe("ExplicitGetDtoListDto");
	});

	it("keeps PAGE custom response wrapper cache identity unchanged when a query plan is present", () => {
		const route = { dto: { response: { itemType: GetDtoItemDto } } };
		const baseline = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, route, "TestController");
		const planned = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, route, "TestController", pagePlan);

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
			"TestController",
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
			"TestController",
			cursorPlan,
		);
		const itemsMetadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype, "items");

		expect(dto?.name).toBe("TestControllerGetListResponseGetDtoItemDtoCursor");
		expect(itemsMetadata?.type).toBe(GetDtoItemDto);
		expect(Reflect.hasMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype, "nextCursor")).toBe(true);
		expect(Reflect.hasMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype, "previousCursor")).toBe(true);
		expect(Reflect.hasMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto?.prototype, "totalCount")).toBe(false);
	});

	it("keys generated CURSOR wrappers by item constructor identity rather than class name", () => {
		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: FirstSharedItemDto } } }, "TestController", cursorPlan)).not.toThrow();
		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: SecondSharedItemDto } } }, "TestController", cursorPlan)).toThrow("configure a unique response DTO name");

		const first = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: FirstSharedItemDto, name: "FirstSharedCursorResponse" } } }, "TestController", cursorPlan);
		const second = ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: SecondSharedItemDto, name: "SecondSharedCursorResponse" } } }, "TestController", cursorPlan);

		expect(first).not.toBe(second);
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, first?.prototype, "items")?.type).toBe(FirstSharedItemDto);
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, second?.prototype, "items")?.type).toBe(SecondSharedItemDto);
	});

	it("keys generated PAGE wrappers by item constructor identity rather than class name", () => {
		class GetDtoPageSharedEntity {}

		const pageEntityMetadata: IApiEntity<GetDtoPageSharedEntity> = { columns: [], name: "GetDtoPageSharedEntity", primaryKey: undefined, tableName: "get_dto_page_shared_entities" };
		const pageProperties: IApiControllerProperties<GetDtoPageSharedEntity> = { entity: GetDtoPageSharedEntity, routes: {} };

		expect(() => ApiControllerGetDto(pageProperties, pageEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: FirstSharedItemDto } } }, "TestController")).not.toThrow();
		expect(() => ApiControllerGetDto(pageProperties, pageEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: SecondSharedItemDto } } }, "TestController")).toThrow("configure a unique response DTO name");

		const first = ApiControllerGetDto(pageProperties, pageEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: FirstSharedItemDto, name: "FirstSharedPageResponse" } } }, "TestController");
		const second = ApiControllerGetDto(pageProperties, pageEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: SecondSharedItemDto, name: "SecondSharedPageResponse" } } }, "TestController");

		expect(first).not.toBe(second);
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, first?.prototype, "items")?.type).toBe(FirstSharedItemDto);
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, second?.prototype, "items")?.type).toBe(SecondSharedItemDto);
	});

	it("keys generated CURSOR wrappers by entity class rather than entity name", () => {
		const createEntityClass = (): new () => object => class GetDtoCursorSameNameEntity {};
		const FirstEntity = createEntityClass();
		const SecondEntity = createEntityClass();
		const sameNameEntityMetadata: IApiEntity<object> = { columns: [], name: "GetDtoCursorSameNameEntity", primaryKey: undefined, tableName: "get_dto_cursor_same_name_entities" };

		const first = ApiControllerGetDto({ entity: FirstEntity, routes: {} }, sameNameEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: FirstSharedItemDto } } }, "TestController", cursorPlan);
		const second = ApiControllerGetDto({ entity: SecondEntity, routes: {} }, sameNameEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: SecondSharedItemDto } } }, "TestController", cursorPlan);

		expect(FirstEntity.name).toBe(SecondEntity.name);
		expect(first).not.toBe(second);
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, first?.prototype, "items")?.type).toBe(FirstSharedItemDto);
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, second?.prototype, "items")?.type).toBe(SecondSharedItemDto);

		const firstOfSharedItem = ApiControllerGetDto({ entity: FirstEntity, routes: {} }, sameNameEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: GetDtoItemDto } } }, "TestController", cursorPlan);
		const secondOfSharedItem = ApiControllerGetDto({ entity: SecondEntity, routes: {} }, sameNameEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: GetDtoItemDto } } }, "TestController", cursorPlan);

		expect(firstOfSharedItem).not.toBe(secondOfSharedItem);
	});

	it("keys generated PAGE wrappers by entity class rather than entity name", () => {
		const createEntityClass = (): new () => object => class GetDtoPageSameNameEntity {};
		const FirstEntity = createEntityClass();
		const SecondEntity = createEntityClass();
		const sameNameEntityMetadata: IApiEntity<object> = { columns: [], name: "GetDtoPageSameNameEntity", primaryKey: undefined, tableName: "get_dto_page_same_name_entities" };

		const first = ApiControllerGetDto({ entity: FirstEntity, routes: {} }, sameNameEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: GetDtoItemDto } } }, "TestController");
		const second = ApiControllerGetDto({ entity: SecondEntity, routes: {} }, sameNameEntityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response: { itemType: GetDtoItemDto } } }, "TestController");

		expect(FirstEntity.name).toBe(SecondEntity.name);
		expect(first).not.toBe(second);
	});

	it("rejects one explicit wrapper schema name shared by PAGE and CURSOR envelopes", () => {
		const response = { itemType: GetDtoItemDto, name: "SharedPageAndCursorResponse" };

		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response } }, "TestController")).not.toThrow();
		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response } }, "TestController", cursorPlan)).toThrow("another item constructor or pagination mode");
	});

	it("rejects one explicit wrapper schema name shared by CURSOR and then PAGE envelopes", () => {
		const response = { itemType: GetDtoItemDto, name: "SharedCursorAndPageResponse" };

		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response } }, "TestController", cursorPlan)).not.toThrow();
		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response } }, "TestController")).toThrow("another item constructor or pagination mode");
	});

	it.each([
		["PAGE then CURSOR", undefined, cursorPlan],
		["CURSOR then PAGE", cursorPlan, undefined],
	])("leaves one explicit wrapper name on two entity classes in the order %s to the schema name check of the application", (order, firstPlan, secondPlan) => {
		const createEntityClass = (): new () => object => class GetDtoOrderSameEntity {};
		const FirstEntity = createEntityClass();
		const SecondEntity = createEntityClass();

		const response = { itemType: GetDtoItemDto, name: `SharedAcrossEntities ${order}` };
		const first = ApiControllerGetDto({ entity: FirstEntity, routes: {} }, { ...entityMetadata, name: "GetDtoOrderSameEntity" }, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response } }, "TestController", firstPlan);
		const second = ApiControllerGetDto({ entity: SecondEntity, routes: {} }, { ...entityMetadata, name: "GetDtoOrderSameEntity" }, EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, { dto: { response } }, "TestController", secondPlan);

		expect(FirstEntity.name).toBe(SecondEntity.name);
		expect(first?.name).toBe(second?.name);
		expect(first).not.toBe(second);
	});

	it("rejects an item response DTO configuration outside the GET_LIST response", () => {
		expect(() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE, { dto: { response: { itemType: GetDtoItemDto } } } as never, "TestController")).toThrow("Custom item response DTO configuration is supported only for the GET_LIST RESPONSE DTO");
	});

	it("keeps a manual response DTO on a read route of a table inheritance root", () => {
		const tableInheritance: IApiControllerTableInheritancePlan = { childEntities: [], discriminatorPropertyName: "type", rootEntity: GetDtoEntity, variants: [{ discriminatorValue: "A", entity: GetDtoEntity, entityMetadata: entityMetadata as IApiEntity<unknown> }] };

		expect(ApiControllerGetResponseDto(properties, { ...entityMetadata, tableInheritance }, EApiRouteType.GET, { dto: { response: GetDtoListDto } }, "TestController")).toBe(GetDtoListDto);
		expect(ApiControllerGetResponseDto(properties, { ...entityMetadata, tableInheritance }, EApiRouteType.GET_LIST, { dto: { response: GetDtoListDto } }, "TestController")).toBe(GetDtoListDto);
	});
});
