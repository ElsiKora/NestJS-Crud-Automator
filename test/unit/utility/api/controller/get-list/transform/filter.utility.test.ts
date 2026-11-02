import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ApiControllerGetListTransformFilter } from "@utility/api/controller/get-list/transform/filter.utility";
import { Column, Entity, IsNull, ManyToOne, Not, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

import { OwnerGroupEntity, OwnerMetadata } from "./fixture/owner";

@Entity("owners")
class OwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "owner id",
		isAutoDtoEnabled: false,
		type: EApiPropertyDescribeType.UUID,
	} as TApiPropertyDescribeProperties)
	public id!: string;

	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.STRING,
		description: "item name",
	} as TApiPropertyDescribeProperties)
	@Column({ type: "varchar" })
	public name!: string;

	@ApiPropertyDescribe({
		description: "hidden owner name",
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
	@Column({ type: "varchar" })
	public hiddenName!: string;

	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.OBJECT,
		dataType: OwnerMetadata,
		description: "owner metadata",
	} as TApiPropertyDescribeProperties)
	@Column({ type: "json", nullable: true })
	public metadata?: OwnerMetadata;

	@ManyToOne(() => OwnerGroupEntity)
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.RELATION,
		description: "owner group",
	} as TApiPropertyDescribeProperties)
	public group!: OwnerGroupEntity;
}

@Entity("items")
class ItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "item id",
		type: EApiPropertyDescribeType.UUID,
	} as TApiPropertyDescribeProperties)
	public id!: string;

	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.STRING,
		description: "item name",
	} as TApiPropertyDescribeProperties)
	@Column({ type: "varchar" })
	public name!: string;

	@ApiPropertyDescribe({
		description: "internal item reference",
		isAutoDtoEnabled: false,
		type: EApiPropertyDescribeType.STRING,
	} as TApiPropertyDescribeProperties)
	@Column({ type: "varchar" })
	public internalReference!: string;

	@ManyToOne(() => OwnerEntity)
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.RELATION,
		description: "owner",
	} as TApiPropertyDescribeProperties)
	public owner!: OwnerEntity;
}

@Entity("filter_ambiguous_owner_first")
class FilterAmbiguousOwner {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "owner id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "owner label", exampleValue: "label", format: EApiPropertyStringType.STRING, maxLength: 32, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as TApiPropertyDescribeProperties)
	public label!: string;
}

// A second entity class with the owner's name makes the string relation target ambiguous.
((): unknown => {
	@Entity("filter_ambiguous_owner_second")
	class FilterAmbiguousOwner {
		@PrimaryGeneratedColumn("uuid")
		public id!: string;
	}

	return FilterAmbiguousOwner;
})();

@Entity("filter_ambiguous_holders")
class FilterAmbiguousHolder {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "holder id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
	public id!: string;

	@ManyToOne("FilterAmbiguousOwner")
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION } as TApiPropertyDescribeProperties)
	public owner!: FilterAmbiguousOwner;
}

describe("ApiControllerGetListTransformFilter", () => {
	it("ignores root primary filters that legacy query DTOs do not publish", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const query = {
			"id[operator]": EFilterOperation.EQ,
			"id[value]": "item-1",
		};

		const filter = ApiControllerGetListTransformFilter<ItemEntity>(query, metadata);

		expect(filter).not.toHaveProperty("id");
	});

	it("applies isnull and notnull from the operator alone", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);

		expect(ApiControllerGetListTransformFilter<ItemEntity>({ "name[operator]": EFilterOperation.ISNULL }, metadata)).toEqual({ name: IsNull() });
		expect(ApiControllerGetListTransformFilter<ItemEntity>({ "name[operator]": EFilterOperation.NOTNULL }, metadata)).toEqual({ name: Not(IsNull()) });
	});

	it("ignores any other operator without a value", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);

		expect(ApiControllerGetListTransformFilter<ItemEntity>({ "name[operator]": EFilterOperation.EQ }, metadata)).toEqual({});
	});

	it("transforms scalar filters", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const query = {
			"name[operator]": EFilterOperation.EQ,
			"name[value]": "Sample",
		};

		const filter = ApiControllerGetListTransformFilter<ItemEntity>(query, metadata);

		expect(filter).toHaveProperty("name");
		expect((filter.name as { value?: unknown }).value).toBe("Sample");
	});

	it("ignores a globally hidden nested relation primary key", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const query = {
			"owner.id[operator]": EFilterOperation.EQ,
			"owner.id[value]": "owner-1",
		};

		const filter = ApiControllerGetListTransformFilter<ItemEntity>(query, metadata);

		expect(filter).not.toHaveProperty("owner");
	});

	it("ignores globally hidden direct scalar filters", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const query = {
			"internalReference[operator]": EFilterOperation.EQ,
			"internalReference[value]": "internal-1",
		};

		const filter = ApiControllerGetListTransformFilter<ItemEntity>(query, metadata);

		expect(filter).not.toHaveProperty("internalReference");
	});

	it("transforms nested relation scalar filters", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const query = {
			"owner.name[operator]": EFilterOperation.EQ,
			"owner.name[value]": "Owner",
		};

		const filter = ApiControllerGetListTransformFilter<ItemEntity>(query, metadata);

		expect(filter).toHaveProperty("owner");
		expect(filter.owner).toHaveProperty("name");
		expect(((filter.owner as { name?: { value?: unknown } }).name as { value?: unknown }).value).toBe("Owner");
	});

	it("ignores legacy top-level relation filters", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const query = {
			"owner[operator]": EFilterOperation.EQ,
			"owner[value]": "owner-1",
		};

		const filter = ApiControllerGetListTransformFilter<ItemEntity>(query, metadata);

		expect(filter).not.toHaveProperty("owner");
	});

	it("ignores invalid nested relation paths", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const query = {
			"owner.missing[operator]": EFilterOperation.EQ,
			"owner.missing[value]": "Owner",
			"owner.name..deep[operator]": EFilterOperation.EQ,
			"owner.name..deep[value]": "Owner",
			"owner.name.deep[operator]": EFilterOperation.EQ,
			"owner.name.deep[value]": "Owner",
		};

		const filter = ApiControllerGetListTransformFilter<ItemEntity>(query, metadata);

		expect(filter).not.toHaveProperty("owner");
	});

	it("ignores related object, relation, and globally hidden fields even when locally enabled", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const query = {
			"owner.group[operator]": EFilterOperation.EQ,
			"owner.group[value]": "group-1",
			"owner.hiddenName[operator]": EFilterOperation.EQ,
			"owner.hiddenName[value]": "Hidden",
			"owner.metadata[operator]": EFilterOperation.EQ,
			"owner.metadata[value]": "Metadata",
		};

		const filter = ApiControllerGetListTransformFilter<ItemEntity>(query, metadata);

		expect(filter).not.toHaveProperty("owner");
	});

	it("fails for a nested relation filter whose string relation target names several entity classes", () => {
		const metadata = GenerateEntityInformation<FilterAmbiguousHolder>(FilterAmbiguousHolder as unknown as IApiBaseEntity);
		const query = {
			"owner.label[operator]": EFilterOperation.EQ,
			"owner.label[value]": "label",
		};

		expect(() => ApiControllerGetListTransformFilter<FilterAmbiguousHolder>(query, metadata)).toThrowError('Metadata target "FilterAmbiguousOwner" matches 2 entity classes in TypeORM metadata');
	});
});
