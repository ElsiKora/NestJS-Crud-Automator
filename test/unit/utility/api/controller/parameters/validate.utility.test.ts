import "reflect-metadata";

import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyUUID } from "@decorator/api/property/uuid.decorator";
import { EApiPropertyNumberType } from "@enum/decorator/api";
import { BadRequestException } from "@nestjs/common";
import { ApiControllerParametersValidate } from "@utility/api/controller/parameters";
import { describe, expect, it } from "vitest";

const ROW_ID: string = "11111111-1111-4111-8111-111111111111";

class ParametersValidateEntity {
	public id?: string;

	public sequence?: number;
}

class ParametersValidateDto {
	@ApiPropertyUUID({ description: "id", entity: ParametersValidateEntity, isRequired: true })
	public id!: string;

	@ApiPropertyNumber({ description: "sequence", entity: ParametersValidateEntity, exampleValue: 1, format: EApiPropertyNumberType.INTEGER, isRequired: true, maximum: 2_147_483_647, minimum: 1, multipleOf: 1 })
	public sequence!: number;
}

describe("ApiControllerParametersValidate", () => {
	it("returns path values converted to their described types", async () => {
		await expect(ApiControllerParametersValidate<ParametersValidateEntity>(ParametersValidateDto, { id: ROW_ID, sequence: "42" as unknown as number })).resolves.toEqual({ id: ROW_ID, sequence: 42 });
	});

	it("returns already typed values unchanged, so a second check is idempotent", async () => {
		const typed: Partial<ParametersValidateEntity> = await ApiControllerParametersValidate<ParametersValidateEntity>(ParametersValidateDto, { id: ROW_ID, sequence: "16" as unknown as number });

		await expect(ApiControllerParametersValidate<ParametersValidateEntity>(ParametersValidateDto, typed)).resolves.toEqual({ id: ROW_ID, sequence: 16 });
	});

	it.each(["016", " 16", "0x10", "16.0", "1.6e1", "1e3", "007", "+16", "16 ", ""])("rejects the non-canonical integer %j", async (sequence: string) => {
		const error: unknown = await ApiControllerParametersValidate(ParametersValidateDto, { id: ROW_ID, sequence } as never).catch((caught: unknown): unknown => caught);

		expect(error).toBeInstanceOf(BadRequestException);
		expect((error as BadRequestException).getResponse()).toEqual({ error: "Bad Request", message: expect.arrayContaining(["sequence must be an integer number"]), statusCode: 400 });
	});

	it("keeps path values the DTO does not describe", async () => {
		const result: Record<string, unknown> = (await ApiControllerParametersValidate(ParametersValidateDto, { id: ROW_ID, sequence: 1, tenant: "t-1" } as never)) as Record<string, unknown>;

		expect(result).toEqual({ id: ROW_ID, sequence: 1, tenant: "t-1" });
	});

	it.each([
		["a non-uuid value", { id: "not-a-uuid", sequence: "1" }],
		["a non-integer value", { id: ROW_ID, sequence: "abc" }],
		["an integer in exponent notation outside the range", { id: ROW_ID, sequence: "1e10" }],
		["an integer above the described maximum", { id: ROW_ID, sequence: "2147483648" }],
		["an integer below the described minimum", { id: ROW_ID, sequence: "0" }],
		["a missing value", { sequence: "1" }],
	])("rejects %s with a ValidationPipe message array", async (_label: string, parameters: Record<string, string>) => {
		const error: unknown = await ApiControllerParametersValidate(ParametersValidateDto, parameters as never).catch((caught: unknown): unknown => caught);

		expect(error).toBeInstanceOf(BadRequestException);
		expect((error as BadRequestException).getResponse()).toEqual({ error: "Bad Request", message: expect.arrayContaining([expect.any(String)]), statusCode: 400 });
	});

	it("names the failing path parameter without echoing its value", async () => {
		const error: unknown = await ApiControllerParametersValidate(ParametersValidateDto, { id: "secret-value", sequence: "1" } as never).catch((caught: unknown): unknown => caught);

		expect((error as BadRequestException).getResponse()).toEqual({ error: "Bad Request", message: ["id must be a UUID"], statusCode: 400 });
	});
});
