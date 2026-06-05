import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ApiControllerGetListTransformFilter } from "@utility/api/controller/get-list/transform/filter.utility";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("owners")
class OwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.UUID,
		description: "owner id",
	} as TApiPropertyDescribeProperties)
	public id!: string;

	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.STRING,
		description: "item name",
	} as TApiPropertyDescribeProperties)
	@Column({ type: "varchar" })
	public name!: string;
}

@Entity("items")
class ItemEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.STRING,
		description: "item name",
	} as TApiPropertyDescribeProperties)
	@Column({ type: "varchar" })
	public name!: string;

	@ManyToOne(() => OwnerEntity)
	@ApiPropertyDescribe({
		type: EApiPropertyDescribeType.RELATION,
		description: "owner",
	} as TApiPropertyDescribeProperties)
	public owner!: OwnerEntity;
}

describe("ApiControllerGetListTransformFilter", () => {
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

	it("transforms explicit relation id filters", () => {
		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const query = {
			"owner.id[operator]": EFilterOperation.EQ,
			"owner.id[value]": "owner-1",
		};

		const filter = ApiControllerGetListTransformFilter<ItemEntity>(query, metadata);

		expect(filter).toHaveProperty("owner");
		expect(filter.owner).toHaveProperty("id");
		expect(((filter.owner as { id?: { value?: unknown } }).id as { value?: unknown }).value).toBe("owner-1");
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
});
