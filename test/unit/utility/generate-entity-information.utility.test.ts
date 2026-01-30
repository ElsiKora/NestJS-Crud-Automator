import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

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

describe("GenerateEntityInformation", () => {
	it("builds entity metadata with table name and primary key", () => {
		const metadata = GenerateEntityInformation<InfoEntity>(InfoEntity as unknown as IApiBaseEntity);

		expect(metadata.tableName).toBe("info_entities");
		expect(metadata.primaryKey?.name).toBe("id");
		expect(metadata.columns.some((column) => column.name === "name")).toBe(true);
	});

	it("throws when entity metadata is missing", () => {
		expect(() => GenerateEntityInformation<PlainEntity>(PlainEntity as unknown as IApiBaseEntity)).toThrowError("[NestJS-Crud-Automator] Table for entity PlainEntity not found in metadata storage");
	});
});
