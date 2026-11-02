import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiPropertyDescribeType, EApiPropertyStringType } from "@enum/decorator/api";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { ChildEntity, Column, Entity, ManyToOne, PrimaryGeneratedColumn, TableInheritance } from "typeorm";
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

@Entity("info_relation_target_entities")
class InfoRelationTargetEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@Entity("info_relation_owner_entities")
class InfoRelationOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ManyToOne(() => InfoRelationTargetEntity)
	@ApiPropertyDescribe({
		description: "target",
		type: EApiPropertyDescribeType.RELATION,
	})
	public target!: InfoRelationTargetEntity;
}

@Entity("info_inheritance_roots")
@TableInheritance({ column: { name: "type", type: "varchar" } })
class InfoInheritanceRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public type!: string;
}

@ChildEntity()
class InfoInheritanceDefaultValueEntity extends InfoInheritanceRootEntity {}

@ChildEntity()
abstract class InfoInheritanceIntermediateEntity extends InfoInheritanceRootEntity {}

abstract class InfoInheritancePlainBase extends InfoInheritanceIntermediateEntity {}

@ChildEntity("NESTED")
class InfoInheritanceNestedEntity extends InfoInheritancePlainBase {}

@Entity()
@TableInheritance({ column: { name: "type", type: "varchar" } })
class InfoUnnamedRootEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

@ChildEntity("UNNAMED")
class InfoUnnamedChildEntity extends InfoUnnamedRootEntity {}

abstract class InfoShadowedBaseEntity {
	@Column({ type: "varchar" })
	@ApiPropertyDescribe({
		description: "code",
		exampleValue: "code-1",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	})
	public code!: string;
}

@Entity("info_shadowed_entities")
class InfoShadowedEntity extends InfoShadowedBaseEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

// An unrelated class that only shares the ancestor's name.
((): unknown => {
	abstract class InfoShadowedBaseEntity {
		@ApiPropertyDescribe({ description: "unrelated code", type: EApiPropertyDescribeType.UUID })
		public code!: string;
	}

	return InfoShadowedBaseEntity;
})();

@Entity("info_duplicate_first_entities")
class InfoDuplicateNameEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe({ description: "first label", exampleValue: "first", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
	public label!: string;
}

const InfoDuplicateNameSecondEntity: new () => unknown = ((): new () => unknown => {
	@Entity("info_duplicate_second_entities")
	class InfoDuplicateNameEntity {
		@PrimaryGeneratedColumn("uuid")
		public id!: string;

		@Column({ type: "varchar" })
		@ApiPropertyDescribe({ description: "second label", exampleValue: "second", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING })
		public label!: string;
	}

	return InfoDuplicateNameEntity;
})();

@Entity("info_same_name_key_first_entities")
class InfoSameNameKeyEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ManyToOne(() => InfoRelationTargetEntity)
	public target!: InfoRelationTargetEntity;
}

const InfoSameNameKeySecondEntity: new () => unknown = ((): new () => unknown => {
	@Entity("info_same_name_key_second_entities")
	class InfoSameNameKeyEntity {
		@PrimaryGeneratedColumn("uuid")
		public code!: string;

		@Column({ type: "varchar" })
		public id!: string;
	}

	return InfoSameNameKeyEntity;
})();

/**
 * Declares an unrelated class that shares its name with an ancestor of an entity.
 * @returns {Function} Detached class with its own column.
 */
function createDetachedSharedNameBase() {
	abstract class InfoSharedNameBaseEntity {
		@Column({ type: "varchar" })
		public detachedColumn!: string;

		@ManyToOne(() => InfoRelationTargetEntity)
		public detachedRelation!: InfoRelationTargetEntity;
	}

	return InfoSharedNameBaseEntity;
}

createDetachedSharedNameBase();

abstract class InfoSharedNameBaseEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public sharedColumn!: string;
}

@Entity("info_shared_name_entities")
class InfoSharedNameEntity extends InfoSharedNameBaseEntity {}

/**
 * Declares an entity under a class name another entity also uses.
 * @param {string} tableName - Table of the entity.
 * @returns {Function} Entity class.
 */
function createSharedTableEntity(tableName: string) {
	@Entity(tableName)
	class InfoSharedTableEntity {
		@PrimaryGeneratedColumn("uuid")
		public id!: string;
	}

	return InfoSharedTableEntity;
}

const InfoSharedTableFirstEntity = createSharedTableEntity("info_shared_table_first");
const InfoSharedTableSecondEntity = createSharedTableEntity("info_shared_table_second");

abstract class InfoRedeclaredBaseEntity {
	@Column({ length: 16, type: "varchar" })
	public code!: string;
}

@Entity("info_redeclared_entities")
class InfoRedeclaredEntity extends InfoRedeclaredBaseEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ length: 32, type: "varchar" })
	public override code: string = "";
}

abstract class InfoAnonymousBase {
	@Column({ type: "varchar" })
	public anonymousColumn!: string;
}

Object.defineProperty(InfoAnonymousBase, "name", { value: "" });

@Entity("info_anonymous_ancestor_entities")
class InfoAnonymousAncestorEntity extends InfoAnonymousBase {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;
}

describe("GenerateEntityInformation", () => {
	it("matches the table, columns, relations and primary key of a same-named class by class identity", () => {
		const first = GenerateEntityInformation<InfoSameNameKeyEntity>(InfoSameNameKeyEntity as unknown as IApiBaseEntity);
		const second = GenerateEntityInformation<{ code: string; id: string }>(InfoSameNameKeySecondEntity as unknown as IApiBaseEntity);

		expect(first.tableName).toBe("info_same_name_key_first_entities");
		expect(first.primaryKey?.name).toBe("id");
		expect(first.columns.map(({ name }) => name).toSorted()).toEqual(["id", "target"]);
		expect(second.tableName).toBe("info_same_name_key_second_entities");
		expect(second.primaryKey?.name).toBe("code");
		expect(second.columns.map(({ name }) => name).toSorted()).toEqual(["code", "id"]);
		expect(second.columns.find(({ name }) => name === "id")?.isPrimary).toBe(false);
	});

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

	it("resolves the root table for a child entity without an explicit discriminator value", () => {
		const metadata = GenerateEntityInformation<InfoInheritanceDefaultValueEntity>(InfoInheritanceDefaultValueEntity as unknown as IApiBaseEntity);

		expect(metadata.tableName).toBe("info_inheritance_roots");
	});

	it("resolves the root table through intermediate child entities and plain classes", () => {
		const metadata = GenerateEntityInformation<InfoInheritanceNestedEntity>(InfoInheritanceNestedEntity as unknown as IApiBaseEntity);

		expect(metadata.tableName).toBe("info_inheritance_roots");
		expect(metadata.primaryKey?.name).toBe("id");
	});

	it("names the root table of a child entity after the root class when the root has no table name", () => {
		const metadata = GenerateEntityInformation<InfoUnnamedChildEntity>(InfoUnnamedChildEntity as unknown as IApiBaseEntity);

		expect(metadata.tableName).toBe("info_unnamed_root_entity");
	});

	it("preserves TypeORM relation target metadata", () => {
		const metadata = GenerateEntityInformation<InfoRelationOwnerEntity>(InfoRelationOwnerEntity as unknown as IApiBaseEntity);
		const relation = metadata.columns.find((column) => column.name === "target");

		expect(relation?.relation?.target).toBe(InfoRelationTargetEntity);
	});

	it("keeps an ancestor's property metadata when an unrelated class shares the ancestor's name", () => {
		const metadata = GenerateEntityInformation<InfoShadowedEntity>(InfoShadowedEntity as unknown as IApiBaseEntity);

		expect(metadata.columns.find((column) => column.name === "code")?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]).toMatchObject({
			description: "code",
			type: EApiPropertyDescribeType.STRING,
		});
	});

	it("keeps each entity's own property metadata when two entity classes share one name", () => {
		const first = GenerateEntityInformation<InfoDuplicateNameEntity>(InfoDuplicateNameEntity as unknown as IApiBaseEntity);
		const second = GenerateEntityInformation(InfoDuplicateNameSecondEntity as unknown as IApiBaseEntity);

		expect(first.columns.find((column) => column.name === "label")?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]).toMatchObject({ description: "first label" });
		expect(second.columns.find((column) => column.name === "label")?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]).toMatchObject({ description: "second label" });
	});

	it("fails for an entity name that matches more than one entity class", () => {
		expect(() => GenerateEntityInformation({ name: "InfoDuplicateNameEntity" })).toThrowError('Metadata target "InfoDuplicateNameEntity" matches 2 entity classes in TypeORM metadata');
	});

	it("reads the table of the entity class, not of another entity with the same name", () => {
		expect(GenerateEntityInformation(InfoSharedTableFirstEntity as unknown as IApiBaseEntity).tableName).toBe("info_shared_table_first");
		expect(GenerateEntityInformation(InfoSharedTableSecondEntity as unknown as IApiBaseEntity).tableName).toBe("info_shared_table_second");
	});

	it("still finds the table of an entity given only by name", () => {
		expect(GenerateEntityInformation({ name: "InfoEntity" }).tableName).toBe("info_entities");
	});

	it("reads columns and relations from the class hierarchy only, not from unrelated classes with the same name", () => {
		const metadata = GenerateEntityInformation<InfoSharedNameEntity>(InfoSharedNameEntity as unknown as IApiBaseEntity);

		expect(metadata.columns.map(({ name }) => String(name)).toSorted()).toEqual(["id", "sharedColumn"]);
	});

	it("lists a column declared again on a subclass once, as TypeORM maps it", () => {
		const metadata = GenerateEntityInformation<InfoRedeclaredEntity>(InfoRedeclaredEntity as unknown as IApiBaseEntity);

		expect(metadata.columns.map(({ name }) => String(name)).toSorted()).toEqual(["code", "id"]);
	});

	it("stops at an unnamed ancestor the way TypeORM builds the inheritance tree", () => {
		const metadata = GenerateEntityInformation<InfoAnonymousAncestorEntity>(InfoAnonymousAncestorEntity as unknown as IApiBaseEntity);

		expect(InfoAnonymousBase.name).toBe("");
		expect(metadata.columns.map(({ name }) => String(name))).toEqual(["id"]);
	});
});
