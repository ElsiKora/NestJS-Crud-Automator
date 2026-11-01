import "reflect-metadata";

import { BadRequestException } from "@nestjs/common";
import { ApiControllerGetListQueryValidate } from "@utility/api/controller/get-list/query/validate.utility";
import { Type } from "class-transformer";
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

class UndecoratedFilterQueryDto {
	public "label[operator]": string | undefined = undefined;

	public "label[value]": string | undefined = undefined;
}

describe("ApiControllerGetListQueryValidate", () => {
	it("converts pagination, keeps class defaults and leaves filter values as sent", async () => {
		const query: Record<string, unknown> = { "createdAt[operator]": "gt", "createdAt[value]": "2024-01-01T00:00:00.000Z", page: "2", utm: "1" };

		await expect(ApiControllerGetListQueryValidate(ListQueryDto, query)).resolves.toEqual({ "createdAt[operator]": "gt", "createdAt[value]": "2024-01-01T00:00:00.000Z", limit: 5, page: 2, utm: "1" });
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

	it("rejects a lone unknown operator, and keeps keys that only resemble a filter group", async () => {
		await expect(ApiControllerGetListQueryValidate(ListQueryDto, { "nmae[operator]": "isnull", page: "1" })).rejects.toBeInstanceOf(BadRequestException);
		await expect(ApiControllerGetListQueryValidate(ListQueryDto, { "nmae[foo]": "x", nmae: "x", "nmae[operator]x": "x", page: "1" })).resolves.toEqual({ "nmae[foo]": "x", limit: 5, nmae: "x", "nmae[operator]x": "x", page: 1 });
	});

	it("accepts filter groups a manual DTO publishes through validators or through its own properties", async () => {
		await expect(ApiControllerGetListQueryValidate(ListQueryDto, { "createdAt[operator]": "gt", "createdAt[value]": "x", page: "1" })).resolves.toEqual({ "createdAt[operator]": "gt", "createdAt[value]": "x", limit: 5, page: 1 });
		await expect(ApiControllerGetListQueryValidate(UndecoratedFilterQueryDto, { "label[operator]": "eq", "label[value]": "x" })).resolves.toEqual({ "label[operator]": "eq", "label[value]": "x" });
		await expect(ApiControllerGetListQueryValidate(UndecoratedFilterQueryDto, { "label[values]": ["a", "b"] })).rejects.toBeInstanceOf(BadRequestException);
	});

	it("accepts a manual DTO without validators like a default ValidationPipe", async () => {
		await expect(ApiControllerGetListQueryValidate(UndecoratedQueryDto, { limit: "1", page: "1" })).resolves.toEqual({ limit: "1", page: "1" });
	});

	it("does not pollute the prototype from a raw query key", async () => {
		const query: Record<string, unknown> = Object.assign(Object.create(null) as Record<string, unknown>, JSON.parse('{"__proto__":{"polluted":true},"page":"1"}') as Record<string, unknown>);
		const result: Record<string, unknown> = await ApiControllerGetListQueryValidate(ListQueryDto, query);

		expect(result.page).toBe(1);
		expect(({} as Record<string, unknown>).polluted).toBeUndefined();
		expect(result.polluted).toBeUndefined();
	});
});
