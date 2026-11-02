import "reflect-metadata";

import { ResolveMetadataTarget } from "@utility/resolve/metadata-target.utility";
import { Entity, EntitySchema, getMetadataArgsStorage, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("metadata_target_entities")
class MetadataTargetEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("metadata_target_duplicate_first_entities")
class MetadataTargetDuplicateEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

((): unknown => {
	@Entity("metadata_target_duplicate_second_entities")
	class MetadataTargetDuplicateEntity {
		@PrimaryGeneratedColumn("uuid")
		public id!: string;
	}

	return MetadataTargetDuplicateEntity;
})();

class MetadataTargetSchemaClass {
	public id!: string;
}

describe("ResolveMetadataTarget", () => {
	it("returns a class as is", () => {
		expect(ResolveMetadataTarget(MetadataTargetEntity)).toBe(MetadataTargetEntity);
	});

	it("resolves a name through TypeORM entity metadata to the entity class", () => {
		expect(ResolveMetadataTarget({ name: "MetadataTargetEntity" })).toBe(MetadataTargetEntity);
	});

	it("resolves an EntitySchema to its target class", () => {
		const schema = new EntitySchema<MetadataTargetSchemaClass>({ columns: { id: { primary: true, type: "uuid" } }, name: "metadata_target_schema", target: MetadataTargetSchemaClass });

		expect(ResolveMetadataTarget(schema)).toBe(MetadataTargetSchemaClass);
	});

	it("fails for an EntitySchema without a target class, naming the schema", () => {
		const schema = new EntitySchema<MetadataTargetSchemaClass>({ columns: { id: { primary: true, type: "uuid" } }, name: "metadata_target_targetless_schema" });

		expect(() => ResolveMetadataTarget(schema)).toThrowError('Metadata target "metadata_target_targetless_schema" does not match an entity class in TypeORM metadata');
	});

	it("fails for an EntitySchema without a target class even when an unrelated entity class has its name", () => {
		const schema = new EntitySchema<MetadataTargetEntity>({ columns: { id: { primary: true, type: "uuid" } }, name: MetadataTargetEntity.name });

		expect(() => ResolveMetadataTarget(schema)).toThrowError(`Metadata target "${MetadataTargetEntity.name}" does not match an entity class in TypeORM metadata`);
	});

	it("fails for a name that matches no entity class, naming the target", () => {
		expect(() => ResolveMetadataTarget({ name: "MetadataTargetMissingEntity" })).toThrowError('Metadata target "MetadataTargetMissingEntity" does not match an entity class in TypeORM metadata');
	});

	it("fails for a name that matches several entity classes, naming the target", () => {
		expect(MetadataTargetDuplicateEntity.name).toBe("MetadataTargetDuplicateEntity");
		expect(() => ResolveMetadataTarget({ name: "MetadataTargetDuplicateEntity" })).toThrowError('Metadata target "MetadataTargetDuplicateEntity" matches 2 entity classes in TypeORM metadata');
	});

	it("names the table of each class when a name matches several", () => {
		const generate = (): unknown => ResolveMetadataTarget({ name: "MetadataTargetDuplicateEntity" });
		const tables: Array<string> = getMetadataArgsStorage()
			.tables.filter((table) => typeof table.target === "function" && table.target.name === "MetadataTargetDuplicateEntity")
			.map((table) => String(table.name));

		expect(tables).toHaveLength(2);
		expect(generate).toThrowError(`(tables ${tables[0]} and ${tables[1]})`);
		expect(generate).toThrowError("Pass the entity class instead of its name");
	});

	it("fails for a reference without a class or a name", () => {
		expect(() => ResolveMetadataTarget({})).toThrowError("Metadata target has neither a class nor a name");
	});
});
