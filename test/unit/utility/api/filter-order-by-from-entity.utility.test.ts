import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { CanActivate } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiRouteType } from "@enum/decorator/api";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ChildEntity, Column, Entity, TableInheritance } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("filter_entities")
class FilterEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "internal reference",
		isAutoDtoEnabled: false,
		properties: {
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.QUERY]: {
					isEnabled: true,
				},
			},
		},
		type: EApiPropertyDescribeType.STRING,
	} as TApiPropertyDescribeProperties)
	public internalReference!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "id",
		properties: {
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.QUERY]: {
					useAsOrderByFilter: false,
				},
			},
		},
		type: EApiPropertyDescribeType.STRING,
	} as TApiPropertyDescribeProperties)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "name",
		type: EApiPropertyDescribeType.STRING,
	} as TApiPropertyDescribeProperties)
	public name!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "count",
		type: EApiPropertyDescribeType.NUMBER,
	} as TApiPropertyDescribeProperties)
	public count!: number;
}

@Entity("filter_unselected_entities")
class FilterUnselectedEntity {
	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "rank", type: EApiPropertyDescribeType.NUMBER } as TApiPropertyDescribeProperties)
	public rank!: number;

	@Column({ select: false, type: "int" })
	@ApiPropertyDescribe({ description: "pin", type: EApiPropertyDescribeType.NUMBER } as TApiPropertyDescribeProperties)
	public pin!: number;
}

@Entity("filter_instant_entities")
class FilterInstantEntity {
	@Column({ type: "uuid" })
	@ApiPropertyDescribe({
		description: "external id",
		type: EApiPropertyDescribeType.UUID,
	} as TApiPropertyDescribeProperties)
	public externalId!: string;

	@Column({ type: "timestamptz" })
	@ApiPropertyDescribe({
		description: "posted at",
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.DATE,
		type: EApiPropertyDescribeType.DATE,
	} as TApiPropertyDescribeProperties)
	public postedAt!: Date;

	@Column({ type: "timestamp with time zone" })
	@ApiPropertyDescribe({
		description: "settled at",
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.DATE,
		type: EApiPropertyDescribeType.DATE,
	} as TApiPropertyDescribeProperties)
	public settledAt!: Date;

	@Column({ type: "boolean" })
	@ApiPropertyDescribe({
		description: "is settled",
		type: EApiPropertyDescribeType.BOOLEAN,
	} as TApiPropertyDescribeProperties)
	public isSettled!: boolean;
}

class AdminGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

class UserGuard implements CanActivate {
	public canActivate(): boolean {
		return true;
	}
}

@Entity("visibility_entities")
class VisibilityEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "name", type: EApiPropertyDescribeType.STRING } as TApiPropertyDescribeProperties)
	public name!: string;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "disabled as a list query field",
		properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { isEnabled: false } } },
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	} as TApiPropertyDescribeProperties)
	public queryDisabled!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "hidden from list responses",
		properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { isEnabled: false } } },
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	} as TApiPropertyDescribeProperties)
	public responseHidden!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "listed in responses without its value",
		properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { isExpose: false, isResponse: true } } },
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	} as TApiPropertyDescribeProperties)
	public exposeHidden!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "listed in responses for administrators only",
		properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.RESPONSE]: { guard: { guards: [AdminGuard] } } } },
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	} as unknown as TApiPropertyDescribeProperties)
	public adminScore!: number;

	@Column({ type: "int" })
	@ApiPropertyDescribe({
		description: "filterable by administrators only",
		properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { guard: { guards: [AdminGuard] } } } },
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	} as unknown as TApiPropertyDescribeProperties)
	public adminRank!: number;
}

abstract class OrderBaseEntity {
	@Column({ type: "int" })
	@ApiPropertyDescribe({ description: "base rank", format: EApiPropertyNumberType.INTEGER, maximum: 100, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER } as TApiPropertyDescribeProperties)
	public baseRank!: number;
}

@Entity("order_base_children")
class OrderBaseChildEntity extends OrderBaseEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "label", type: EApiPropertyDescribeType.STRING } as TApiPropertyDescribeProperties)
	public label!: string;
}

@Entity("order_sti_roots")
@TableInheritance({ column: { name: "kind", type: "varchar" } })
class OrderStiRootEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "name", type: EApiPropertyDescribeType.STRING } as TApiPropertyDescribeProperties)
	public name!: string;
}

@ChildEntity("child")
class OrderStiChildEntity extends OrderStiRootEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "extra", type: EApiPropertyDescribeType.STRING } as TApiPropertyDescribeProperties)
	public extra!: string;
}

describe("FilterOrderByFromEntity", () => {
	it("orders by columns an abstract parent class or a table inheritance root declares", () => {
		const baseChildMetadata = GenerateEntityInformation<OrderBaseChildEntity>(OrderBaseChildEntity as unknown as IApiBaseEntity);
		const stiChildMetadata = GenerateEntityInformation<OrderStiChildEntity>(OrderStiChildEntity as unknown as IApiBaseEntity);

		expect(FilterOrderByFromEntity(OrderBaseChildEntity, baseChildMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY)).toEqual({ BASE_RANK: "baseRank", LABEL: "label" });
		expect(FilterOrderByFromEntity(OrderStiChildEntity, stiChildMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY)).toEqual({ EXTRA: "extra", NAME: "name" });
		expect(FilterOrderByFromEntity(OrderBaseChildEntity, baseChildMetadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, { baseRank: false })).toEqual({ LABEL: "label" });
	});

	it("orders only by columns listed in the response and enabled as query fields for the route guard", () => {
		const metadata = GenerateEntityInformation<VisibilityEntity>(VisibilityEntity as unknown as IApiBaseEntity);

		expect(FilterOrderByFromEntity(VisibilityEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, AdminGuard)).toEqual({ ADMIN_RANK: "adminRank", ADMIN_SCORE: "adminScore", NAME: "name" });
		expect(FilterOrderByFromEntity(VisibilityEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, UserGuard)).toEqual({ NAME: "name" });
	});

	it("does not order by a column the database does not select", () => {
		const metadata = GenerateEntityInformation<FilterUnselectedEntity>(FilterUnselectedEntity as unknown as IApiBaseEntity);

		expect(FilterOrderByFromEntity(FilterUnselectedEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY)).toEqual({ RANK: "rank" });
	});

	it("maps entity columns to order by filters", () => {
		const metadata = GenerateEntityInformation<FilterEntity>(FilterEntity as unknown as IApiBaseEntity);
		const result = FilterOrderByFromEntity(FilterEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY);

		expect(result).toMatchObject({
			COUNT: "count",
			NAME: "name",
		});
		expect(result).not.toHaveProperty("ID");
		expect(result).not.toHaveProperty("INTERNAL_REFERENCE");
	});

	it("applies field selectors and rejects unknown fields", () => {
		const metadata = GenerateEntityInformation<FilterEntity>(FilterEntity as unknown as IApiBaseEntity);
		const result = FilterOrderByFromEntity(FilterEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, { count: false });

		expect(result).toMatchObject({
			NAME: "name",
		});
		expect(result).not.toHaveProperty("COUNT");
		expect(result).not.toHaveProperty("INTERNAL_REFERENCE");

		expect(() => FilterOrderByFromEntity(FilterEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, { missing: true })).toThrow('Field "missing" does not exist in the entity.');
	});

	it("does not let a legacy field selector expose a globally hidden field", () => {
		const metadata = GenerateEntityInformation<FilterEntity>(FilterEntity as unknown as IApiBaseEntity);
		const result = FilterOrderByFromEntity(FilterEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, { internalReference: true });

		expect(result).not.toHaveProperty("INTERNAL_REFERENCE");
	});

	it("maps timestamptz and uuid columns to order by filters and keeps other column types out", () => {
		const metadata = GenerateEntityInformation<FilterInstantEntity>(FilterInstantEntity as unknown as IApiBaseEntity);
		const result = FilterOrderByFromEntity(FilterInstantEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY);

		expect(result).toEqual({
			EXTERNAL_ID: "externalId",
			POSTED_AT: "postedAt",
			SETTLED_AT: "settledAt",
		});
	});
});
