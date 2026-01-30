import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { MetadataStorage } from "@class/metadata-storage.class";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ApiControllerGetListTransformFilter } from "@utility/api/controller/get-list/transform/filter.utility";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("owners")
class OwnerEntity {
	@PrimaryGeneratedColumn("uuid")
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
	it("transforms relation filters to use nested id", () => {
		const storage = MetadataStorage.getInstance();
		storage.setMetadata(ItemEntity.name, "name", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, {
			type: EApiPropertyDescribeType.STRING,
			description: "item name",
		} as TApiPropertyDescribeProperties);
		storage.setMetadata(ItemEntity.name, "owner", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, {
			type: EApiPropertyDescribeType.RELATION,
			description: "owner",
		} as TApiPropertyDescribeProperties);

		const metadata = GenerateEntityInformation<ItemEntity>(ItemEntity as unknown as IApiBaseEntity);
		const query = {
			"name[operator]": EFilterOperation.EQ,
			"name[value]": "Sample",
			"owner[operator]": EFilterOperation.EQ,
			"owner[value]": "owner-1",
		};

		const filter = ApiControllerGetListTransformFilter<ItemEntity>(query, metadata);

		expect(filter).toHaveProperty("name");
		expect(filter).toHaveProperty("owner");
		expect(filter.owner).toHaveProperty("id");
	});
});
