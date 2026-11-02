import "reflect-metadata";

import type { IApiControllerPropertiesRouteBaseRelationsResponse } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { Type } from "@nestjs/common";

import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiControllerRelationReferenceShape, EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { DtoGenerate } from "@utility/dto/generate/core.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { plainToInstance } from "class-transformer";
import { Column, Entity, JoinColumn, JoinTable, ManyToMany, ManyToOne, OneToOne, PrimaryColumn, PrimaryGeneratedColumn, type Relation } from "typeorm";
import { describe, expect, it } from "vitest";

const CODE_DESCRIBE = {
	description: "code",
	exampleValue: "code",
	format: EApiPropertyStringType.STRING,
	maxLength: 32,
	minLength: 1,
	pattern: "/^[a-z-]+$/",
	type: EApiPropertyDescribeType.STRING,
} as const;

@Entity("relation_reference_unit_authors")
class RelationReferenceUnitAuthorEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(CODE_DESCRIBE)
	public code!: string;

	@Column({ nullable: true, type: "varchar" })
	@ApiPropertyDescribe({ ...CODE_DESCRIBE, description: "nickname", isNullable: true })
	public nickname?: null | string;

	@Column({ nullable: true, type: "varchar" })
	public secret?: null | string;

	@ManyToOne(() => RelationReferenceUnitAuthorEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "mentor", type: EApiPropertyDescribeType.RELATION })
	public mentor?: null | Relation<RelationReferenceUnitAuthorEntity>;
}

@Entity("relation_reference_unit_tags")
class RelationReferenceUnitTagEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(CODE_DESCRIBE)
	public code!: string;
}

class RelationReferenceUnitReviewDto {
	public id!: string;

	public text!: string;
}

@Entity("relation_reference_unit_profiles")
class RelationReferenceUnitProfileEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@OneToOne(() => RelationReferenceUnitPostEntity, (post: RelationReferenceUnitPostEntity): RelationReferenceUnitProfileEntity | undefined => post.profile)
	@ApiPropertyDescribe({ description: "post", type: EApiPropertyDescribeType.RELATION })
	public post?: Relation<RelationReferenceUnitPostEntity>;
}

@Entity("relation_reference_unit_posts")
class RelationReferenceUnitPostEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne(() => RelationReferenceUnitAuthorEntity, { nullable: true })
	@ApiPropertyDescribe({ description: "author", type: EApiPropertyDescribeType.RELATION })
	public author?: null | RelationReferenceUnitAuthorEntity;

	@ManyToOne(() => RelationReferenceUnitAuthorEntity, { nullable: false })
	@ApiPropertyDescribe({ description: "editor", type: EApiPropertyDescribeType.RELATION })
	public editor!: RelationReferenceUnitAuthorEntity;

	@ManyToOne(() => RelationReferenceUnitAuthorEntity, { eager: true })
	@ApiPropertyDescribe({ description: "reviewer", type: EApiPropertyDescribeType.RELATION })
	public reviewer?: null | RelationReferenceUnitAuthorEntity;

	@ManyToOne(() => RelationReferenceUnitAuthorEntity)
	@ApiPropertyDescribe({ description: "reader", type: EApiPropertyDescribeType.RELATION })
	public reader?: null | RelationReferenceUnitAuthorEntity;

	@Column({ type: "varchar" })
	public ownerId!: string;

	@ManyToOne(() => RelationReferenceUnitAuthorEntity)
	@JoinColumn({ name: "ownerId" })
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION })
	public owner!: RelationReferenceUnitAuthorEntity;

	@Column({ nullable: true, type: "varchar" })
	public sponsorId?: null | string;

	@ManyToOne(() => RelationReferenceUnitAuthorEntity)
	@JoinColumn({ name: "sponsorId" })
	@ApiPropertyDescribe({ description: "sponsor", type: EApiPropertyDescribeType.RELATION })
	public sponsor?: null | RelationReferenceUnitAuthorEntity;

	@OneToOne(() => RelationReferenceUnitProfileEntity, (profile: RelationReferenceUnitProfileEntity): RelationReferenceUnitPostEntity | undefined => profile.post, { nullable: false })
	@JoinColumn()
	@ApiPropertyDescribe({ description: "profile", type: EApiPropertyDescribeType.RELATION })
	public profile!: Relation<RelationReferenceUnitProfileEntity>;

	@JoinTable({ name: "relation_reference_unit_post_tags" })
	@ManyToMany(() => RelationReferenceUnitTagEntity)
	@ApiPropertyDescribe({ description: "tags", type: EApiPropertyDescribeType.RELATION })
	public tags?: Array<RelationReferenceUnitTagEntity>;

	@JoinTable({ name: "relation_reference_unit_post_reviews" })
	@ManyToMany(() => RelationReferenceUnitTagEntity)
	@ApiPropertyDescribe({ dataType: RelationReferenceUnitReviewDto, description: "reviews", isArray: true, isUniqueItems: false, maxItems: 10, minItems: 0, shouldValidateNested: true, type: EApiPropertyDescribeType.OBJECT })
	public reviews?: Array<RelationReferenceUnitTagEntity>;
}

@Entity("relation_reference_unit_bad_keys")
class RelationReferenceUnitBadKeyEntity {
	@PrimaryColumn({ type: "varchar" })
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@ManyToOne(() => RelationReferenceUnitAuthorEntity)
	@ApiPropertyDescribe({ description: "author", type: EApiPropertyDescribeType.RELATION })
	public author?: null | RelationReferenceUnitAuthorEntity;
}

interface ISwaggerProperty {
	format?: string;
	isArray?: boolean;
	items?: Record<string, unknown>;
	maxItems?: number;
	minItems?: number;
	nullable?: boolean;
	pattern?: string;
	required?: boolean;
	type?: unknown;
}

const INCLUDE = { author: true, editor: true, reviews: true, tags: true } as const;

/**
 * Builds a response relation config over the shared include.
 * @param {EApiControllerRelationReferenceShape} shape - Reference shape.
 * @param {string} [key] - Reference key.
 * @param {Record<string, unknown>} [include] - Include map.
 * @returns {IApiControllerPropertiesRouteBaseRelationsResponse<RelationReferenceUnitPostEntity>} Response relation config.
 */
const relations = (shape: EApiControllerRelationReferenceShape, key?: string, include: Record<string, unknown> = INCLUDE): IApiControllerPropertiesRouteBaseRelationsResponse<RelationReferenceUnitPostEntity> => ({ load: { include: include as never }, reference: { key, shape } });

const postMetadata: IApiEntity<RelationReferenceUnitPostEntity> = GenerateEntityInformation<RelationReferenceUnitPostEntity>(RelationReferenceUnitPostEntity);

const generate = (method: EApiRouteType, dtoType: EApiDtoType, responseRelations?: IApiControllerPropertiesRouteBaseRelationsResponse<RelationReferenceUnitPostEntity>): Type<unknown> => DtoGenerate(RelationReferenceUnitPostEntity, postMetadata, method, dtoType, "RelationReferenceUnitPost", undefined, undefined, undefined, undefined, undefined, undefined, responseRelations) as Type<unknown>;

const property = (dto: Type<unknown>, name: string): ISwaggerProperty => Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, dto.prototype as object, name) as ISwaggerProperty;

describe("DtoGetRelationResponseMetadata through DtoGenerate", () => {
	describe("projected relations", () => {
		it("describes SCALAR references on id as uuid values and arrays of them", () => {
			const dto: Type<unknown> = generate(EApiRouteType.GET, EApiDtoType.RESPONSE, relations(EApiControllerRelationReferenceShape.SCALAR));

			expect(property(dto, "author")).toMatchObject({ format: "uuid", nullable: true, required: true, type: "string" });
			expect(property(dto, "author").isArray).not.toBe(true);
			expect(property(dto, "tags")).toMatchObject({ format: "uuid", isArray: true, minItems: 0, nullable: false, required: true, type: "string" });
			expect(property(dto, "tags").maxItems).toBeUndefined();
			expect(property(dto, "reviews")).toMatchObject({ format: "uuid", isArray: true, type: "string" });
		});

		it("describes SCALAR references on another key by that key's describe metadata", () => {
			const dto: Type<unknown> = generate(EApiRouteType.GET_LIST, EApiDtoType.RESPONSE, relations(EApiControllerRelationReferenceShape.SCALAR, "code"));
			const item: Type<unknown> = property(dto, "items").type as Type<unknown>;

			expect(property(item, "author")).toMatchObject({ format: "string", nullable: true, pattern: "^[a-z-]+$", required: true, type: "string" });
			expect(property(item, "editor")).toMatchObject({ nullable: false, type: "string" });
			expect(property(item, "tags")).toMatchObject({ isArray: true, minItems: 0, pattern: "^[a-z-]+$", type: "string" });
		});

		it("describes OBJECT references on another key as an object with only that key", () => {
			const dto: Type<unknown> = generate(EApiRouteType.GET, EApiDtoType.RESPONSE, relations(EApiControllerRelationReferenceShape.OBJECT, "code"));
			const author: Type<unknown> = property(dto, "author").type as Type<unknown>;
			const tags: ISwaggerProperty = property(dto, "tags");

			expect(property(dto, "author")).toMatchObject({ nullable: true, required: true });
			expect(property(author, "code")).toMatchObject({ pattern: "^[a-z-]+$", required: true, type: "string" });
			expect(property(author, "id")).toBeUndefined();
			expect(tags).toMatchObject({ isArray: true, minItems: 0 });
			expect(property(tags.type as Type<unknown>, "code")).toBeDefined();
			expect(plainToInstance(dto, { author: { code: "first" }, editor: { code: "second" }, id: "post", tags: [{ code: "tag" }] }, { excludeExtraneousValues: true })).toMatchObject({ author: { code: "first" }, tags: [{ code: "tag" }] });
		});

		it("keeps the id object of OBJECT references on id", () => {
			const dto: Type<unknown> = generate(EApiRouteType.GET, EApiDtoType.RESPONSE, relations(EApiControllerRelationReferenceShape.OBJECT, "id"));

			expect(property(property(dto, "author").type as Type<unknown>, "id")).toMatchObject({ format: "uuid" });
			expect(property(dto, "author")).toMatchObject({ nullable: true, required: true });
			expect(property(dto, "reviews")).toMatchObject({ isArray: true, minItems: 0 });
			expect(property(property(dto, "reviews").type as Type<unknown>, "id")).toBeDefined();
			expect(property(property(dto, "reviews").type as Type<unknown>, "text")).toBeUndefined();
		});
	});

	describe("relations outside the include", () => {
		it("requires eager relations and leaves lazy ones optional", () => {
			const dto: Type<unknown> = generate(EApiRouteType.GET, EApiDtoType.RESPONSE, relations(EApiControllerRelationReferenceShape.SCALAR));

			expect(property(dto, "reviewer")).toMatchObject({ nullable: true, required: true });
			expect(property(property(dto, "reviewer").type as Type<unknown>, "id")).toBeDefined();
			expect(property(dto, "reader")).toMatchObject({ nullable: true, required: false });
		});

		it("does not require a relation whose include value is false unless it is eager", () => {
			const dto: Type<unknown> = generate(EApiRouteType.GET, EApiDtoType.RESPONSE, relations(EApiControllerRelationReferenceShape.SCALAR, "id", { author: false, reviewer: false }));

			expect(property(dto, "author")).toMatchObject({ required: false, type: "string" });
			expect(property(dto, "reviewer")).toMatchObject({ required: true, type: "string" });
		});

		it("describes relations of a route without response relations as optional id objects", () => {
			const dto: Type<unknown> = generate(EApiRouteType.PARTIAL_UPDATE, EApiDtoType.RESPONSE);

			expect(property(dto, "author")).toMatchObject({ nullable: true, required: false });
			expect(property(dto, "tags")).toMatchObject({ isArray: true, nullable: false, required: false });
			expect(property(dto, "reviewer")).toMatchObject({ required: true });
		});
	});

	describe("to-one nullability", () => {
		it("follows the TypeORM column of the relation", () => {
			const dto: Type<unknown> = generate(EApiRouteType.UPDATE, EApiDtoType.RESPONSE);

			expect(property(dto, "author").nullable).toBe(true);
			expect(property(dto, "editor").nullable).toBe(false);
			expect(property(dto, "owner").nullable).toBe(false);
			expect(property(dto, "sponsor").nullable).toBe(true);
			expect(property(dto, "profile").nullable).toBe(false);
		});

		it("makes the inverse side of a one-to-one relation nullable", () => {
			const profileMetadata: IApiEntity<RelationReferenceUnitProfileEntity> = GenerateEntityInformation<RelationReferenceUnitProfileEntity>(RelationReferenceUnitProfileEntity);
			const dto: Type<unknown> = DtoGenerate(RelationReferenceUnitProfileEntity, profileMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE, "RelationReferenceUnitProfile") as Type<unknown>;

			expect(property(dto, "post").nullable).toBe(true);
		});
	});

	describe("caching", () => {
		it("gives two reference shapes on one entity two DTO classes and reuses each", () => {
			const scalar: Type<unknown> = generate(EApiRouteType.CREATE, EApiDtoType.RESPONSE, relations(EApiControllerRelationReferenceShape.SCALAR));
			const object: Type<unknown> = generate(EApiRouteType.CREATE, EApiDtoType.RESPONSE, relations(EApiControllerRelationReferenceShape.OBJECT, "code"));

			expect(scalar).not.toBe(object);
			expect(property(scalar, "author").type).toBe("string");
			expect(property(property(object, "author").type as Type<unknown>, "code")).toBeDefined();
			expect(generate(EApiRouteType.CREATE, EApiDtoType.RESPONSE, relations(EApiControllerRelationReferenceShape.SCALAR))).toBe(scalar);
			expect(generate(EApiRouteType.CREATE, EApiDtoType.RESPONSE, relations(EApiControllerRelationReferenceShape.OBJECT, "code"))).toBe(object);
		});

		it("keeps request DTOs independent of the response relations", () => {
			const body: Type<unknown> = generate(EApiRouteType.CREATE, EApiDtoType.BODY);

			expect(generate(EApiRouteType.CREATE, EApiDtoType.BODY, relations(EApiControllerRelationReferenceShape.SCALAR, "code"))).toBe(body);
			expect(property(body, "author")).toMatchObject({ format: "uuid", type: "string" });
		});
	});

	describe("reference key validation", () => {
		const badKeyMetadata: IApiEntity<RelationReferenceUnitBadKeyEntity> = GenerateEntityInformation<RelationReferenceUnitBadKeyEntity>(RelationReferenceUnitBadKeyEntity);

		it.each([
			["secret", "must be described with @ApiPropertyDescribe on RelationReferenceUnitAuthorEntity"],
			["missing", "must be described with @ApiPropertyDescribe on RelationReferenceUnitAuthorEntity"],
			["mentor", "must be a scalar property of RelationReferenceUnitAuthorEntity"],
			["nickname", "must not be nullable on RelationReferenceUnitAuthorEntity"],
		])("rejects the key %s", (key: string, message: string) => {
			expect(() => DtoGenerate(RelationReferenceUnitBadKeyEntity, badKeyMetadata, EApiRouteType.GET, EApiDtoType.RESPONSE, "RelationReferenceUnitBadKey", undefined, undefined, undefined, undefined, undefined, undefined, { load: { include: { author: true } }, reference: { key, shape: EApiControllerRelationReferenceShape.SCALAR } })).toThrow(`Response relation reference key "${key}" of RelationReferenceUnitBadKeyEntity.author ${message}`);
		});
	});
});
