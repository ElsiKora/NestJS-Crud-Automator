import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";

import "reflect-metadata";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { ApiControllerParametersBuildCustomRule } from "@utility/api/controller/parameters/custom-rule.utility";
import { ApiControllerParametersValidate } from "@utility/api/controller/parameters/validate.utility";
import { Expose, Transform, Type } from "class-transformer";
import { IsDateString, IsDefined, IsInt, IsString, IsUUID } from "class-validator";
import { describe, expect, it, vi } from "vitest";

class RouteDtoController {}

class SwappedNamesDto {
	@Expose({ name: "second" })
	@IsString()
	public first!: string;

	@Expose({ name: "first" })
	@IsUUID()
	public second!: string;
}

class UnscopedTransformDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): unknown => (String(value).startsWith("p-") ? value : `p-${String(value)}`))
	public id!: string;
}

class GrowsOnSomeValuesDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): unknown => (String(value).startsWith("x") ? `x${String(value)}` : value), { toClassOnly: true })
	public id!: string;
}

class WiderThanPathDto {
	@IsInt()
	@Type(() => Number)
	public id!: number;

	@IsString()
	public required!: string;
}

class RenamedWithInitializerDto {
	@Expose({ name: "id" })
	@IsInt()
	@Type(() => Number)
	public internalId!: number;

	@IsString()
	public kind: string = "plain";
}

class ImplicitNumberDto {
	@IsDefined()
	public id!: number;
}

class DeclaredTextDto {
	@IsDateString()
	public id!: Date;
}

const INPUT_SHAPED_OBJECT: Record<string, unknown> = { nested: true };

class ObjectOnSomeInputsDto {
	@IsDefined()
	@Transform(({ value }: { value: unknown }): unknown => (value === "object" ? INPUT_SHAPED_OBJECT : value), { toClassOnly: true })
	public id!: string;
}

class UndefinedOnSomeInputsDto {
	@Transform(({ value }: { value: unknown }): unknown => (value === "drop" ? undefined : value), { toClassOnly: true })
	public id?: string;
}

const buildRule = (dto: new () => unknown, methodName: string, pathParameters: Array<string> = ["id"]): IApiControllerParametersRule => {
	const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: RouteDtoController, dto, methodName, pathParameters, resourcePath: "route-dto/item" });

	if (!rule) {
		throw new Error("The route has no rule");
	}

	return rule;
};

describe("the route PARAMETERS DTO rule", () => {
	it("reads each value through its exposed name, even when two names are swapped", async () => {
		const uuid: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
		const rule: IApiControllerParametersRule = buildRule(SwappedNamesDto, "swapped", ["first", "second"]);

		await expect(ApiControllerParametersValidate(rule, { first: uuid, second: "text" } as never)).resolves.toEqual({ first: uuid, second: "text" });
		await expect(ApiControllerParametersValidate(rule, { first: "text", second: "text" } as never)).rejects.toThrow();
	});

	it("accepts a Transform without a direction that keeps its own output", async () => {
		await expect(ApiControllerParametersValidate(buildRule(UnscopedTransformDto, "unscoped"), { id: "abc" } as never)).resolves.toEqual({ id: "p-abc" });
		await expect(ApiControllerParametersValidate(buildRule(UnscopedTransformDto, "unscoped"), { id: "p-abc" } as never)).resolves.toEqual({ id: "p-abc" });
	});

	it("refuses a value whose text changes when the DTO runs on it again, which the startup samples cannot see", async () => {
		const rule: IApiControllerParametersRule = buildRule(GrowsOnSomeValuesDto, "grows");

		await expect(ApiControllerParametersValidate(rule, { id: "abc" } as never)).resolves.toEqual({ id: "abc" });
		await expect(ApiControllerParametersValidate(rule, { id: "xyz" } as never)).rejects.toThrow(ApiRequestValidationException);
	});

	it("leaves a required property the path does not carry to the host pipe", async () => {
		const rule: IApiControllerParametersRule = buildRule(WiderThanPathDto, "wider");

		await expect(ApiControllerParametersValidate(rule, { id: "016" } as never)).resolves.toEqual({ id: 16 });
		await expect(ApiControllerParametersValidate(rule, { id: "abc" } as never)).rejects.toThrow();
	});

	it("reports only path values, not the property initializers of the DTO", async () => {
		await expect(ApiControllerParametersValidate(buildRule(RenamedWithInitializerDto, "initializer"), { id: "0x10" } as never)).resolves.toEqual({ id: 16 });
	});

	it("keeps a path parameter the DTO does not describe as sent", async () => {
		await expect(ApiControllerParametersValidate(buildRule(RenamedWithInitializerDto, "undescribed", ["id", "tenant"]), { id: "16", tenant: "016" } as never)).resolves.toEqual({ id: 16, tenant: "016" });
	});

	it("refuses a number property without a type when the two conversions give different text", async () => {
		const rule: IApiControllerParametersRule = buildRule(ImplicitNumberDto, "implicit");

		await expect(ApiControllerParametersValidate(rule, { id: "16" } as never)).resolves.toEqual({ id: 16 });

		for (const id of ["016", "0x10", "abc"]) {
			await expect(ApiControllerParametersValidate(rule, { id } as never)).rejects.toThrow();
		}
	});

	it("keeps the sent text when only the declared validators accept it", async () => {
		await expect(ApiControllerParametersValidate(buildRule(DeclaredTextDto, "declared"), { id: "2024-03-10" } as never)).resolves.toEqual({ id: "2024-03-10" });
		await expect(ApiControllerParametersValidate(buildRule(DeclaredTextDto, "declared"), { id: "garbage" } as never)).rejects.toThrow();
	});

	it("rejects a value that has no text form on this request, so IAM never sees it missing", async () => {
		await expect(ApiControllerParametersValidate(buildRule(ObjectOnSomeInputsDto, "object"), { id: "object" } as never)).rejects.toThrow();
		await expect(ApiControllerParametersValidate(buildRule(UndefinedOnSomeInputsDto, "dropped"), { id: "drop" } as never)).rejects.toThrow();
		await expect(ApiControllerParametersValidate(buildRule(UndefinedOnSomeInputsDto, "dropped"), { id: "kept" } as never)).resolves.toEqual({ id: "kept" });
	});

	it("runs a Transform once per conversion on a canonical value, and again on the text of any other value", async () => {
		const transform = vi.fn(({ value }: { value: unknown }): unknown => value);

		class CountedDto {
			@IsString()
			@Transform(transform, { toClassOnly: true })
			public id!: string;
		}

		const rule: IApiControllerParametersRule = buildRule(CountedDto, "counted");
		transform.mockClear();
		await ApiControllerParametersValidate(rule, { id: "abc" } as never);

		expect(transform).toHaveBeenCalledTimes(2);
	});
});
