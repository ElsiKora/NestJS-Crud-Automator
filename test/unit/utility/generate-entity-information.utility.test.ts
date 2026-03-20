import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("info_entities")
class InfoEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

class PlainEntity {
	public id?: string;
}

abstract class InheritedInfoBaseEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "slug",
		exampleValue: "shared-slug",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public slug!: string;
}

@Entity("extended_info_entities")
class ExtendedInfoEntity extends InheritedInfoBaseEntity {
	@Column({ type: "varchar" })
	public name!: string;
}

describe("GenerateEntityInformation", () => {
	it("builds entity metadata with table name and primary key", () => {
		const metadata = GenerateEntityInformation<InfoEntity>(InfoEntity as unknown as IApiBaseEntity);

		expect(metadata.tableName).toBe("info_entities");
		expect(metadata.primaryKey?.name).toBe("id");
		expect(metadata.columns.map(({ name }) => name)).toContain("name");
	});

	it("throws when entity metadata is missing", () => {
		expect(() => GenerateEntityInformation<PlainEntity>(PlainEntity as unknown as IApiBaseEntity)).toThrowError("[NestJS-Crud-Automator] Table for entity PlainEntity not found in metadata storage");
	});

	it("includes inherited columns and property metadata from ancestor entities", () => {
		const metadata = GenerateEntityInformation<ExtendedInfoEntity>(ExtendedInfoEntity as unknown as IApiBaseEntity);

		expect(metadata.primaryKey?.name).toBe("id");
		expect(metadata.columns.find((column) => column.name === "id")?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]).toMatchObject({
			type: EApiPropertyDescribeType.UUID,
		});
		expect(metadata.columns.find((column) => column.name === "slug")?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]).toMatchObject({
			type: EApiPropertyDescribeType.STRING,
		});
	});
});
