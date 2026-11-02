import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiEntity } from "@interface/entity";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
import { BadRequestException } from "@nestjs/common";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ApiControllerGetListTransformFilter } from "@utility/api/controller/get-list/transform/filter.utility";
import { DtoGenerateGetListQueryProperties } from "@utility/dto/generate/get-list/query-properties.utility";
import { Column, Entity, IsNull, ManyToOne, Not, OneToMany, PrimaryGeneratedColumn } from "typeorm";
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

	@OneToMany(() => NoteEntity, (note: NoteEntity) => note.item)
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.RELATION,
		description: "notes",
	} as TApiPropertyDescribeProperties)
	public notes!: Array<NoteEntity>;
}

@Entity("notes")
class NoteEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "note id",
		type: EApiPropertyDescribeType.UUID,
	} as TApiPropertyDescribeProperties)
	public id!: string;

	@ManyToOne(() => ItemEntity, (item: ItemEntity) => item.notes)
	public item!: ItemEntity;

	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.STRING,
		description: "note text",
	} as TApiPropertyDescribeProperties)
	@Column({ type: "varchar" })
	public text!: string;
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

function expectInvalidFilter<E>(query: Record<string, unknown>, metadata: IApiEntity<E>): void {
	let error: unknown;

	try {
		ApiControllerGetListTransformFilter<E>(query, metadata);
	} catch (caught: unknown) {
		error = caught;
	}

	expect(error).toBeInstanceOf(BadRequestException);
	expect((error as BadRequestException).getResponse()).toEqual({ error: "Bad Request", message: "FILTER_NOT_VALID", statusCode: 400 });
}

describe("ApiControllerGetListTransformFilter", () => {
	it("publishes and applies one-hop filters on to-one relations only", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const relationProperties = metadata.columns.filter((column): boolean => column.name === "owner" || column.name === "notes").map((column) => ({ isPrimary: false, metadata: column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties, name: column.name }));
		const publishedNames: Array<string> = DtoGenerateGetListQueryProperties(metadata, relationProperties).map(({ name }: { name: string }): string => name);

		expect(publishedNames).toEqual(["owner.name"]);
		expectInvalidFilter({ "notes.text[operator]": EFilterOperation.EQ, "notes.text[value]": "x" }, metadata);
	});

	it("rejects root primary filters that legacy query DTOs do not publish", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);

		expectInvalidFilter({ "id[operator]": EFilterOperation.EQ, "id[value]": "item-1" }, metadata);
	});

	it("applies isnull and notnull from the operator alone", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);

		expect(ApiControllerGetListTransformFilter<ItemEntity>({ "name[operator]": EFilterOperation.ISNULL }, metadata)).toEqual({ name: IsNull() });
		expect(ApiControllerGetListTransformFilter<ItemEntity>({ "name[operator]": EFilterOperation.NOTNULL }, metadata)).toEqual({ name: Not(IsNull()) });
	});

	it.each([
		["an operator without a value", { "name[operator]": EFilterOperation.EQ }],
		["a value without an operator", { "name[value]": "x" }],
		["values without an operator", { "name[values]": ["x", "y"] }],
		["an unknown operator", { "name[operator]": "bogus", "name[value]": "x" }],
		["both value and values", { "name[operator]": EFilterOperation.EQ, "name[value]": "x", "name[values]": ["y", "z"] }],
		["a valueless operator with a value", { "name[operator]": EFilterOperation.ISNULL, "name[value]": "x" }],
		["a valueless operator with values", { "name[operator]": EFilterOperation.NOTNULL, "name[values]": ["x", "y"] }],
		["a null value", { "name[operator]": EFilterOperation.EQ, "name[value]": null }],
		["a group without a field", { "[operator]": EFilterOperation.EQ, "[value]": "x" }],
	])("rejects %s", (_case: string, query: Record<string, unknown>) => {
		expectInvalidFilter(query, GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity));
	});

	it("leaves keys that are not filter groups, and keys a subscriber cleared, to the QUERY DTO", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);

		expect(ApiControllerGetListTransformFilter<ItemEntity>({ campaign: "spring", "name[foo]": "x", "name[operator]": undefined, "name[value]": undefined }, metadata)).toEqual({});
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

	it("rejects a globally hidden nested relation primary key", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);

		expectInvalidFilter({ "owner.id[operator]": EFilterOperation.EQ, "owner.id[value]": "owner-1" }, metadata);
	});

	it("rejects globally hidden direct scalar filters", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);

		expectInvalidFilter({ "internalReference[operator]": EFilterOperation.EQ, "internalReference[value]": "internal-1" }, metadata);
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

	it.each(["owner", "foo", "owner.missing", "owner.name..deep", "owner.name.deep", ".name", "owner.", "notes.text", "owner.group", "owner.hiddenName", "owner.metadata"])("rejects a filter on %s, which it cannot apply", (field: string) => {
		expectInvalidFilter({ [`${field}[operator]`]: EFilterOperation.EQ, [`${field}[value]`]: "x" }, GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity));
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
