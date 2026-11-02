import "reflect-metadata";

import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerate } from "@utility/dto/generate/core.utility";
import { DtoGetRelationRequestMetadata } from "@utility/dto/get/relation/request-metadata.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, type Relation } from "typeorm";
import { describe, expect, it } from "vitest";

const TEXT_DESCRIBE = { description: "text", exampleValue: "value", format: EApiPropertyStringType.STRING, maxLength: 16, minLength: 1, pattern: "/^.+$/", type: EApiPropertyDescribeType.STRING } as const;
const RELATION_DESCRIBE = { description: "parent", type: EApiPropertyDescribeType.RELATION } as const;

@Entity("relation_request_unit_parents")
class RelationRequestUnitParentEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_DESCRIBE)
	public id!: string;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_DESCRIBE)
	public tenantId!: string;
}

@Entity("relation_request_unit_bare_parents")
class RelationRequestUnitBareParentEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_DESCRIBE)
	public tenantId!: string;
}

@Entity("relation_request_unit_owners")
class RelationRequestUnitOwnerEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_DESCRIBE)
	public id!: string;
}

@Entity("relation_request_unit_bare_owners")
class RelationRequestUnitBareOwnerEntity {
	@PrimaryColumn({ type: "varchar" })
	public id!: string;
}

@Entity("relation_request_unit_children")
class RelationRequestUnitChildEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_DESCRIBE)
	public id!: string;

	@ApiPropertyDescribe(RELATION_DESCRIBE)
	@JoinColumn([
		{ name: "tenantId", referencedColumnName: "tenantId" },
		{ name: "parentId", referencedColumnName: "id" },
	])
	@ManyToOne(() => RelationRequestUnitParentEntity, { nullable: true })
	public parent?: null | Relation<RelationRequestUnitParentEntity>;

	@ApiPropertyDescribe(RELATION_DESCRIBE)
	@JoinColumn([
		{ name: "tenantId", referencedColumnName: "tenantId" },
		{ name: "bareId", referencedColumnName: "id" },
	])
	@ManyToOne(() => RelationRequestUnitBareParentEntity, { nullable: true })
	public bare?: null | Relation<RelationRequestUnitBareParentEntity>;

	@ApiPropertyDescribe(RELATION_DESCRIBE)
	@JoinColumn({ name: "singleId" })
	@ManyToOne(() => RelationRequestUnitOwnerEntity, { nullable: true })
	public single?: null | Relation<RelationRequestUnitOwnerEntity>;

	@ApiPropertyDescribe({ ...RELATION_DESCRIBE, isNullable: true })
	@ManyToOne(() => RelationRequestUnitOwnerEntity, { nullable: true })
	public implicit?: null | Relation<RelationRequestUnitOwnerEntity>;

	@ApiPropertyDescribe(RELATION_DESCRIBE)
	@JoinColumn({ name: "bareSingleId" })
	@ManyToOne(() => RelationRequestUnitBareOwnerEntity, { nullable: true })
	public bareSingle?: null | Relation<RelationRequestUnitBareOwnerEntity>;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({ ...TEXT_DESCRIBE, isNullable: true })
	public parentId?: null | string;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_DESCRIBE)
	public tenantId!: string;
}

@Entity("relation_request_unit_members")
class RelationRequestUnitMemberEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_DESCRIBE)
	public id!: string;

	@ApiPropertyDescribe(RELATION_DESCRIBE)
	@JoinColumn([
		{ name: "tenantId", referencedColumnName: "tenantId" },
		{ name: "parentId", referencedColumnName: "id" },
	])
	@ManyToOne(() => RelationRequestUnitParentEntity, { nullable: true })
	public parent?: null | Relation<RelationRequestUnitParentEntity>;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({ ...TEXT_DESCRIBE, isNullable: true })
	public parentId?: null | string;

	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe(TEXT_DESCRIBE)
	public tenantId!: string;
}

const entity: IApiEntity<RelationRequestUnitChildEntity> = GenerateEntityInformation<RelationRequestUnitChildEntity>(RelationRequestUnitChildEntity);

const resolve = (property: string, lockedFields: ReadonlyArray<string>): TApiPropertyDescribeProperties | undefined => {
	const column: IApiEntityColumn<RelationRequestUnitChildEntity> = entity.columns.find((candidate: IApiEntityColumn<RelationRequestUnitChildEntity>): boolean => candidate.name === property) as IApiEntityColumn<RelationRequestUnitChildEntity>;

	return DtoGetRelationRequestMetadata(RelationRequestUnitChildEntity, entity, column, column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties, EApiRouteType.CREATE, "RelationRequestUnitChildCreateBody", "RelationRequestUnitChildCreateBodyDTO", lockedFields);
};

describe("DtoGetRelationRequestMetadata", () => {
	it("describes a relation over one column as the value of the column it references", () => {
		expect(resolve("single", [])).toEqual({ ...TEXT_DESCRIBE, description: "parent", isAutoDtoEnabled: undefined, isNullable: undefined, properties: undefined });
	});

	it("reads a many-to-one without @JoinColumn as joining the related primary key, and keeps whether it may be null", () => {
		expect(resolve("implicit", [])).toEqual({ ...TEXT_DESCRIBE, description: "parent", isAutoDtoEnabled: undefined, isNullable: true, properties: undefined });
	});

	it("leaves a relation over one column out when its column is locked", () => {
		expect(resolve("single", ["singleId"])).toBeUndefined();
		expect(resolve("implicit", ["implicitId"])).toBeUndefined();
	});

	it("refuses a relation over one column whose referenced column is not described", () => {
		expect(() => resolve("bareSingle", [])).toThrow('Request relation RelationRequestUnitChildEntity.bareSingle in RelationRequestUnitChildCreateBodyDTO joins column "bareSingleId", so its referenced column "id" must be a scalar described with @ApiPropertyDescribe on RelationRequestUnitBareOwnerEntity');
	});

	it("describes a relation over several columns as an object of every join column it may write, which may be null", () => {
		const metadata = resolve("parent", []) as { dataType: new () => object; isNullable?: boolean; type: EApiPropertyDescribeType };

		expect(metadata.type).toBe(EApiPropertyDescribeType.OBJECT);
		expect(metadata.isNullable).toBeUndefined();
		expect(metadata.dataType.name).toBe("RelationRequestUnitChildCreateBodyParentDTO");
	});

	it("leaves out a join column the client may not write and refuses null once it does", () => {
		const metadata = resolve("parent", ["tenantId"]) as { isNullable?: boolean };

		expect(metadata.isNullable).toBe(false);
	});

	it("leaves the relation out once no join column is left", () => {
		expect(resolve("parent", ["tenantId", "parentId"])).toBeUndefined();
	});

	it("refuses a join column whose referenced column is not described on the related entity", () => {
		expect(() => resolve("bare", ["tenantId"])).toThrow('Request relation RelationRequestUnitChildEntity.bare in RelationRequestUnitChildCreateBodyDTO joins column "bareId", so its referenced column "id" must be a scalar described with @ApiPropertyDescribe on RelationRequestUnitBareParentEntity');
	});

	it.each([
		[EApiRouteType.CREATE, "RelationRequestUnitMemberCreateBodyParentDTO", ["id", "tenantId"]],
		[EApiRouteType.PARTIAL_UPDATE, "RelationRequestUnitMemberPartialUpdateBodyParentDTO", ["id"]],
		[EApiRouteType.UPDATE, "RelationRequestUnitMemberUpdateBodyParentDTO", ["id"]],
	])("a %s body with no path fields publishes the join columns a write may set", (method: EApiRouteType, name: string, keys: Array<string>) => {
		const dto: Type<unknown> = DtoGenerate(RelationRequestUnitMemberEntity, GenerateEntityInformation<RelationRequestUnitMemberEntity>(RelationRequestUnitMemberEntity), method, EApiDtoType.BODY, "RelationRequestUnitMember") as Type<unknown>;
		const parent: { type: Type<unknown> } = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto.prototype as object, "parent") as { type: Type<unknown> };

		expect(parent.type.name).toBe(name);
		expect(keys.map((key: string): unknown => (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, parent.type.prototype as object, key) as undefined | { required?: boolean })?.required)).toEqual(keys.map(() => true));
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, parent.type.prototype as object, method === EApiRouteType.CREATE ? "missing" : "tenantId")).toBeUndefined();
	});
});
