import "reflect-metadata";

import { BadRequestException } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { ApiControllerGetListQueryValidate } from "@utility/api/controller/get-list/query/validate.utility";
import { Expose, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";
import { describe, expect, it } from "vitest";

class ListQueryDto {
	@IsIn(["gt", "lt"])
	@IsOptional()
	public "createdAt[operator]"?: string;

	@IsOptional()
	@IsString()
	public "createdAt[value]"?: string;

	@IsInt()
	@Min(1)
	@Type(() => Number)
	public limit: number = 5;

	@IsIn(["label"])
	@IsOptional()
	public orderBy?: string;

	@IsInt()
	@Min(1)
	@Type(() => Number)
	public page!: number;
}

class UndecoratedQueryDto {}

class SwaggerOnlyQueryDto {
	@ApiProperty()
	public limit!: string;

	@ApiProperty()
	public page!: string;
}

class AnchoredQueryDto extends ListQueryDto {
	public object(): this {
		return this;
	}
}

class AliasedQueryDto {
	@Expose({ name: "sort" })
	@IsOptional()
	public orderBy?: string;

	@Expose({ name: "dir" })
	@IsOptional()
	public orderDirection?: string;
}

class UndecoratedFilterQueryDto {
	public "label[operator]": string | undefined = undefined;

	public "label[value]": string | undefined = undefined;
}

describe("ApiControllerGetListQueryValidate", () => {
	it("converts pagination, keeps class defaults and leaves filter values as sent", async () => {
		const query: Record<string, unknown> = { "createdAt[operator]": "gt", "createdAt[value]": "2024-01-01T00:00:00.000Z", page: "2" };

		await expect(ApiControllerGetListQueryValidate(ListQueryDto, query)).resolves.toEqual({ "createdAt[operator]": "gt", "createdAt[value]": "2024-01-01T00:00:00.000Z", limit: 5, page: 2 });
		expect(query.page).toBe("2");
	});

	it("throws the ValidationPipe message array", async () => {
		const error: unknown = await ApiControllerGetListQueryValidate(ListQueryDto, { orderBy: "hidden", page: "0" }).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(BadRequestException);
		expect((error as BadRequestException).getResponse()).toEqual({ error: "Bad Request", message: ["orderBy must be one of the following values: label", "page must not be less than 1"], statusCode: 400 });
	});

	it("rejects every filter group key the DTO does not publish, before the other messages", async () => {
		const error: unknown = await ApiControllerGetListQueryValidate(ListQueryDto, { "id[operator]": "eq", "id[value]": "1", "nmae[values]": ["a", "b"], orderBy: "hidden", page: "1" }).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(BadRequestException);
		expect((error as BadRequestException).getResponse()).toEqual({
			error: "Bad Request",
			message: ["property id[operator] should not exist", "property id[value] should not exist", "property nmae[values] should not exist", "orderBy must be one of the following values: label"],
			statusCode: 400,
		});
	});

	it("rejects every other key the DTO does not publish the same way, in query order", async () => {
		const error: unknown = await ApiControllerGetListQueryValidate(ListQueryDto, { _: "1730000000", "nmae[foo]": "x", "nmae[operator]": "isnull", nmae: "x", "nmae[operator]x": "x", page: "1", utm_source: "mail" }).catch((caught: unknown) => caught);

		expect(error).toBeInstanceOf(BadRequestException);
		expect((error as BadRequestException).getResponse()).toEqual({
			error: "Bad Request",
			message: ["property _ should not exist", "property nmae[foo] should not exist", "property nmae[operator] should not exist", "property nmae should not exist", "property nmae[operator]x should not exist", "property utm_source should not exist"],
			statusCode: 400,
		});
	});

	it("rejects a prototype member of the DTO, such as the generated filter-pairing anchor", async () => {
		const error: unknown = await ApiControllerGetListQueryValidate(AnchoredQueryDto, { object: "x", page: "1" }).catch((caught: unknown) => caught);

		expect((error as BadRequestException).getResponse()).toEqual({ error: "Bad Request", message: ["property object should not exist"], statusCode: 400 });
	});

	it("accepts filter groups a manual DTO publishes through validators or through its own properties", async () => {
		await expect(ApiControllerGetListQueryValidate(ListQueryDto, { "createdAt[operator]": "gt", "createdAt[value]": "x", page: "1" })).resolves.toEqual({ "createdAt[operator]": "gt", "createdAt[value]": "x", limit: 5, page: 1 });
		await expect(ApiControllerGetListQueryValidate(UndecoratedFilterQueryDto, { "label[operator]": "eq", "label[value]": "x" })).resolves.toEqual({ "label[operator]": "eq", "label[value]": "x" });
		await expect(ApiControllerGetListQueryValidate(UndecoratedFilterQueryDto, { "label[values]": ["a", "b"] })).rejects.toBeInstanceOf(BadRequestException);
	});

	it("accepts the keys a manual DTO publishes through Swagger alone, and nothing for a DTO that publishes none", async () => {
		await expect(ApiControllerGetListQueryValidate(SwaggerOnlyQueryDto, { limit: "1", page: "1" })).resolves.toEqual({ limit: "1", page: "1" });

		const error: unknown = await ApiControllerGetListQueryValidate(UndecoratedQueryDto, { limit: "1", page: "1" }).catch((caught: unknown) => caught);

		expect((error as BadRequestException).getResponse()).toEqual({ error: "Bad Request", message: ["property limit should not exist", "property page should not exist"], statusCode: 400 });
	});

	it("accepts the names a manual DTO exposes, and rejects any other key the same way", async () => {
		await expect(ApiControllerGetListQueryValidate(AliasedQueryDto, { dir: "asc", sort: "label" })).resolves.toMatchObject({ dir: "asc", orderBy: "label", orderDirection: "asc", sort: "label" });

		const error: unknown = await ApiControllerGetListQueryValidate(AliasedQueryDto, { constructor: "x", dir: "asc", sort: "label", sortBy: "label" }).catch((caught: unknown) => caught);

		expect((error as BadRequestException).getResponse()).toEqual({ error: "Bad Request", message: ["property constructor should not exist", "property sortBy should not exist"], statusCode: 400 });
	});

	it("rejects a raw __proto__ query key without polluting the prototype", async () => {
		const query: Record<string, unknown> = Object.assign(Object.create(null) as Record<string, unknown>, JSON.parse('{"__proto__":{"polluted":true},"page":"1"}') as Record<string, unknown>);
		const error: unknown = await ApiControllerGetListQueryValidate(ListQueryDto, query).catch((caught: unknown) => caught);

		expect((error as BadRequestException).getResponse()).toEqual({ error: "Bad Request", message: ["property __proto__ should not exist"], statusCode: 400 });
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
	});
});
