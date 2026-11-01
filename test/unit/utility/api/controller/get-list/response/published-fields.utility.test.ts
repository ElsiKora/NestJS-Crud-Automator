import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";

import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiDtoType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "@enum/decorator/api";
import { ApiExtraModels, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { ApiControllerGetListResponsePublishedFields } from "@utility/api/controller/get-list/response/published-fields.utility";
import { FilterOrderByFromEntity } from "@utility/api/filter-order-by-from-entity.utility";
import { DtoGenerate } from "@utility/dto/generate/core.utility";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

const stringMetadata = (description: string): TApiPropertyDescribeProperties => ({ description, exampleValue: "Name", format: EApiPropertyStringType.STRING, maxLength: 10, minLength: 1, pattern: "/^[A-Za-z]+$/", type: EApiPropertyDescribeType.STRING }) as TApiPropertyDescribeProperties;

@Entity("published_field_entities")
class PublishedFieldEntity {
	@PrimaryGeneratedColumn("uuid")
	@ApiPropertyDescribe({ description: "id", type: EApiPropertyDescribeType.UUID })
	public id!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(stringMetadata("label"))
	public label!: string;

	@Column({ type: "varchar" })
	@ApiPropertyDescribe(stringMetadata("secret"))
	public secret!: string;
}

class LabelItemDto {
	@ApiProperty()
	public id!: string;

	@ApiProperty()
	public label!: string;
}

class SecretItemDto {
	@ApiProperty()
	public label!: string;

	@ApiProperty()
	public secret!: string;
}

class LabelListDto {
	@ApiProperty({ type: [LabelItemDto] })
	public items!: Array<LabelItemDto>;

	@ApiProperty()
	public totalCount!: number;
}

class UndocumentedListDto {
	public items!: Array<LabelItemDto>;
}

@ApiExtraModels(LabelItemDto, SecretItemDto)
class VariantListDto {
	@ApiProperty({ items: { oneOf: [{ $ref: getSchemaPath(LabelItemDto) }, { $ref: getSchemaPath(SecretItemDto) }] }, type: "array" })
	public items!: Array<LabelItemDto | SecretItemDto>;
}

describe("ApiControllerGetListResponsePublishedFields", () => {
	it("lists the item properties of a list wrapper", () => {
		expect([...ApiControllerGetListResponsePublishedFields(LabelListDto)]).toEqual(["id", "label"]);
	});

	it("lists the properties of an item config", () => {
		expect([...ApiControllerGetListResponsePublishedFields({ itemType: SecretItemDto })]).toEqual(["label", "secret"]);
	});

	it("publishes only the properties every item variant shares", () => {
		expect([...ApiControllerGetListResponsePublishedFields(VariantListDto)]).toEqual(["label"]);
	});

	it("publishes nothing for a wrapper without a documented items element", () => {
		expect([...ApiControllerGetListResponsePublishedFields(UndocumentedListDto)]).toEqual([]);
	});

	it("limits the orderBy enum and its validation to published item properties", async () => {
		const metadata = GenerateEntityInformation<PublishedFieldEntity>(PublishedFieldEntity as unknown as IApiBaseEntity);

		expect(FilterOrderByFromEntity(PublishedFieldEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY)).toEqual({ ID: "id", LABEL: "label", SECRET: "secret" });
		expect(FilterOrderByFromEntity(PublishedFieldEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, undefined, undefined, ApiControllerGetListResponsePublishedFields(LabelListDto))).toEqual({ ID: "id", LABEL: "label" });

		const dto = DtoGenerate(PublishedFieldEntity, metadata, EApiRouteType.GET_LIST, EApiDtoType.QUERY, "PublishedFieldDto", undefined, undefined, undefined, undefined, undefined, UndocumentedListDto) as new () => object;
		const errors = await validate(plainToInstance(dto, { limit: 1, orderBy: "label", orderDirection: "asc", page: 1 }), { forbidUnknownValues: false });

		expect(errors.map((error) => error.property)).toEqual(["orderBy"]);
	});
});
