import "reflect-metadata";

import { BadRequestException } from "@nestjs/common";
import { ApiControllerGetListQueryValidate } from "@utility/api/controller/get-list/query/validate.utility";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Min } from "class-validator";
import { describe, expect, it } from "vitest";

class ListQueryDto {
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
