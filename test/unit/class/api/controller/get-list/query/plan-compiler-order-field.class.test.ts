import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity } from "@interface/entity";
import type { CanActivate } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiControllerGetListQueryPlanCompiler } from "@class/api/controller/get-list/query";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOrderDirection } from "@enum/filter";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ApiProperty } from "@nestjs/swagger";
import { Column, Entity, PrimaryColumn } from "typeorm";
import { describe, expect, it } from "vitest";

class OrderFieldAdminGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

class OrderFieldUserGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

const describeRank = (properties?: Record<string, unknown>, extra?: Record<string, unknown>): TApiPropertyDescribeProperties => ({ description: "rank", exampleValue: 1, format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, properties, type: EApiPropertyDescribeType.NUMBER, ...extra }) as unknown as TApiPropertyDescribeProperties;

@Entity("order_field_reason_entities")
class OrderFieldReasonEntity {
	@Column({ type: "int" })
	@ApiPropertyDescribe(describeRank(undefined, { isAutoDtoEnabled: false }))
	public autoDtoDisabled!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe(describeRank({ [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { isExpose: false, isResponse: true } } }))
	public exposeHidden!: number;

	@PrimaryColumn({ type: "uuid" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
	public id!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe(describeRank({ [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { useAsOrderByFilter: false } } }))
	public optedOut!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe(describeRank({ [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { isEnabled: false } } }))
	public queryDisabled!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe(describeRank())
	public rank!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe(describeRank({ [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { guard: { guards: [OrderFieldAdminGuard] } } } }))
	public responseGuarded!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe(describeRank({ [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { isEnabled: false } } }))
	public responseHidden!: number;
}

class OrderFieldReasonItemDto {
	@ApiProperty()
	public id!: string;
}

class OrderFieldReasonController {}

const ROUTE: string = 'Controller "OrderFieldReasonController" route "getList": GET_LIST order field';

const createRouteConfig = (field: string, options: { isCursor?: boolean; isResponseDto?: boolean }): TApiControllerPropertiesRoute<OrderFieldReasonEntity, EApiRouteType.GET_LIST> =>
	({
		...(options.isResponseDto ? { dto: { [EApiDtoType.RESPONSE]: { itemType: OrderFieldReasonItemDto } } } : {}),
		request: {
			[EApiControllerRequestTarget.QUERY]: {
				order: {
					...(options.isCursor ? { tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }] } : {}),
					fields: { [field]: { isEnabled: true } },
					unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
				},
				...(options.isCursor ? { pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } : {}),
			},
		},
		security: { authentication: { guard: OrderFieldUserGuard } },
	}) as unknown as TApiControllerPropertiesRoute<OrderFieldReasonEntity, EApiRouteType.GET_LIST>;

const getEntityMetadata = (): IApiEntity<OrderFieldReasonEntity> => GenerateEntityInformation<OrderFieldReasonEntity>(OrderFieldReasonEntity as unknown as IApiBaseEntity);

const compileOrderField = (field: string, options: { isCursor?: boolean; isResponseDto?: boolean } = {}): void => {
	ApiControllerGetListQueryPlanCompiler.compile(OrderFieldReasonController, OrderFieldReasonEntity, getEntityMetadata(), createRouteConfig(field, options));
};

const assertOrderField = (field: string): void => {
	ApiControllerGetListQueryPlanCompiler.assertOrderFieldsPublished(OrderFieldReasonController, OrderFieldReasonEntity, getEntityMetadata(), createRouteConfig(field, { isResponseDto: true }));
};

describe("ApiControllerGetListQueryPlanCompiler order fields", () => {
	it.each([
		["autoDtoDisabled", "it sets isAutoDtoEnabled: false"],
		["optedOut", "it sets useAsOrderByFilter: false"],
		["queryDisabled", "it is not enabled as a GET_LIST query field for the route guard"],
		["responseHidden", "the GET_LIST response does not expose it for the route guard"],
		["responseGuarded", "the GET_LIST response does not expose it for the route guard"],
		["exposeHidden", "it sets isExpose: false in the GET_LIST response"],
	])("names the route and why %s is not orderable on PAGE and CURSOR routes", (field: string, reason: string) => {
		expect(() => compileOrderField(field)).toThrow(`${ROUTE} "${field}" is not orderable: ${reason}`);
		expect(() => compileOrderField(field, { isCursor: true })).toThrow(`${ROUTE} "${field}" is not orderable: ${reason}`);
	});

	it("names a field the manual GET_LIST response DTO does not publish once the classes are loaded on a PAGE route", () => {
		expect(() => compileOrderField("rank", { isResponseDto: true })).not.toThrow();
		expect(() => assertOrderField("rank")).toThrow(`${ROUTE} "rank" is not orderable: the manual GET_LIST response DTO does not publish it`);
		expect(() => assertOrderField("id")).not.toThrow();
	});

	it("names a field the manual GET_LIST response DTO does not publish while a CURSOR plan compiles", () => {
		expect(() => compileOrderField("rank", { isCursor: true, isResponseDto: true })).toThrow(`${ROUTE} "rank" is not orderable: the manual GET_LIST response DTO does not publish it`);
	});

	it.each(["missing", "owner.name"])("keeps the scalar path message for %s, which names no direct scalar column", (field: string) => {
		expect(() => compileOrderField(field)).toThrow(`${ROUTE} "${field}" is not an enabled direct scalar path`);
	});
});
