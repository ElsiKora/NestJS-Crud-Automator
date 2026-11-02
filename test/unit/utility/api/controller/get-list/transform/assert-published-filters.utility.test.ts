import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { Relation } from "typeorm";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetListTransformAssertPublishedFilters } from "@utility/api/controller/get-list/transform/assert-published-filters.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { IsOptional } from "class-validator";
import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

const STRING_DESCRIBE = { description: "text", exampleValue: "text", format: EApiPropertyStringType.STRING, maxLength: 64, minLength: 1, pattern: "/^[a-z]+$/", type: EApiPropertyDescribeType.STRING } as TApiPropertyDescribeProperties;

@Entity("assert_published_owners")
class AssertPublishedOwnerEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe(STRING_DESCRIBE)
	@Column({ type: "varchar" })
	public name!: string;
}

@Entity("assert_published_items")
class AssertPublishedItemEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID } as TApiPropertyDescribeProperties)
	public id!: string;

	@ApiPropertyDescribe(STRING_DESCRIBE)
	@Column({ type: "varchar" })
	public label!: string;

	@ManyToOne(() => AssertPublishedOwnerEntity)
	@ApiPropertyDescribe({ description: "owner", type: EApiPropertyDescribeType.RELATION } as TApiPropertyDescribeProperties)
	public owner!: AssertPublishedOwnerEntity;

	@OneToOne(() => AssertPublishedOwnerEntity)
	@JoinColumn()
	@ApiPropertyDescribe({ description: "profile", type: EApiPropertyDescribeType.RELATION } as TApiPropertyDescribeProperties)
	public profile!: AssertPublishedOwnerEntity;

	@ApiPropertyDescribe({ ...STRING_DESCRIBE, properties: { [EApiRouteType.GET_LIST]: { [EApiDtoType.QUERY]: { isEnabled: false } } } } as TApiPropertyDescribeProperties)
	@Column({ type: "varchar" })
	public secret!: string;

	@OneToMany(() => AssertPublishedNoteEntity, ({ item }: AssertPublishedNoteEntity) => item)
	@ApiPropertyDescribe({ description: "notes", type: EApiPropertyDescribeType.RELATION } as TApiPropertyDescribeProperties)
	public notes!: Array<Relation<AssertPublishedNoteEntity>>;
}

@Entity("assert_published_notes")
class AssertPublishedNoteEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ManyToOne(() => AssertPublishedItemEntity, ({ notes }: AssertPublishedItemEntity) => notes)
	public item!: Relation<AssertPublishedItemEntity>;

	@ApiPropertyDescribe(STRING_DESCRIBE)
	@Column({ type: "varchar" })
	public text!: string;
}

class AppliedQueryDto {
	@IsOptional()
	public "label[operator]"?: string;

	@IsOptional()
	public "label[value]"?: string;

	@IsOptional()
	public "owner.name[operator]"?: string;

	@IsOptional()
	public "owner.name[value]"?: string;

	@IsOptional()
	public "profile.name[operator]"?: string;

	@IsOptional()
	public "profile.name[values]"?: Array<string>;

	@IsOptional()
	public campaign?: string;

	@IsOptional()
	public "label[foo]"?: string;
}

function createDto(key: string): new () => unknown {
	class UnappliableQueryDto {}

	IsOptional()(UnappliableQueryDto.prototype, key);

	return UnappliableQueryDto;
}

describe("ApiControllerGetListTransformAssertPublishedFilters", () => {
	const metadata = GenerateEntityInformation<AssertPublishedItemEntity>(AssertPublishedItemEntity as unknown as IApiBaseEntity);

	it("accepts columns, one-hop to-one paths, and keys that are not filter groups", () => {
		expect(() => ApiControllerGetListTransformAssertPublishedFilters("ItemController", AppliedQueryDto, metadata)).not.toThrow();
	});

	it.each(["foo", "id", "secret", "owner", "owner.missing", "owner.name.deep", "notes.text", "notes.id"])("fails for a published filter on %s, which the route cannot apply", (field: string) => {
		for (const suffix of ["operator", "value", "values"]) {
			expect(() => ApiControllerGetListTransformAssertPublishedFilters("ItemController", createDto(`${field}[${suffix}]`), metadata)).toThrowError(`ItemController: GET_LIST QUERY DTO UnappliableQueryDto publishes "${field}[${suffix}]", a filter the route cannot apply`);
		}
	});
});
