import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ApiControllerGetPrimaryColumn } from "@utility/api/controller/get/primary-column.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("primary_column_entities")
class PrimaryColumnEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public title!: string;
}

@Entity("no_primary_entities")
class NoPrimaryEntity {
	@Column({ type: "varchar" })
	public name!: string;
}

describe("ApiControllerGetPrimaryColumn", () => {
	it("returns the primary key and value from parameters", () => {
		const metadata = GenerateEntityInformation<PrimaryColumnEntity>(PrimaryColumnEntity as unknown as IApiBaseEntity);
		const primary = ApiControllerGetPrimaryColumn({ id: "entity-1" }, metadata);

		expect(primary).toEqual({
			key: "id",
			value: "entity-1",
		});
	});

	it("returns undefined when entity has no primary key", () => {
		const metadata = GenerateEntityInformation<NoPrimaryEntity>(NoPrimaryEntity as unknown as IApiBaseEntity);
		const primary = ApiControllerGetPrimaryColumn({ name: "sample" }, metadata);

		expect(primary).toBeUndefined();
	});
});
