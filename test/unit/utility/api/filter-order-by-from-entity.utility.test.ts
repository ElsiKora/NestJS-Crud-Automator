import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { Column, Entity } from "typeorm";
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

describe("FilterOrderByFromEntity", () => {
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
});
