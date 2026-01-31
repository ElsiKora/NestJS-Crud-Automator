import "reflect-metadata";

import { GetEntityColumns } from "@utility/get/entity-columns.utility";
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("relation_targets")
class RelationTarget {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("column_entities")
class ColumnEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar", default: "title" })
	public title!: string;

	@Column({ type: "varchar" })
	public name!: string;

	@Column({ type: "int", generated: "increment" })
	public sequence!: number;

	@ManyToOne(() => RelationTarget)
	public owner!: RelationTarget;
}

describe("GetEntityColumns", () => {
	it("returns columns and relations by default", () => {
		const result = GetEntityColumns<ColumnEntity>({ entity: ColumnEntity });

		expect(result).toEqual(expect.arrayContaining(["id", "title", "name", "sequence", "owner"]));
	});

	it("returns only relations when requested", () => {
		const result = GetEntityColumns<ColumnEntity>({ entity: ColumnEntity, shouldTakeRelationsOnly: true });

		expect(result).toEqual(["owner"]);
	});

	it("returns generated/default columns with relations", () => {
		const result = GetEntityColumns<ColumnEntity>({ entity: ColumnEntity, shouldTakeGeneratedOnly: true });

		expect(result).toEqual(expect.arrayContaining(["title", "sequence", "owner"]));
		expect(result).not.toContain("name");
		expect(result).not.toContain("id");
	});
});
