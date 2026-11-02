import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiEntityColumn } from "@interface/entity";

import "reflect-metadata";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { ApiControllerParametersBuildCustomRule } from "@utility/api/controller/parameters/custom-rule.utility";
import { ApiControllerParametersValidate } from "@utility/api/controller/parameters/validate.utility";
import { ApiControllerPathWhere } from "@utility/api/controller/path/where.utility";
import { ApiRequestValidationGetErrors } from "@utility/api/request-validation-get-errors.utility";
import { Transform } from "class-transformer";
import { IsDefined, IsInt, IsString, IsUUID, Max, ValidationError } from "class-validator";
import { describe, expect, it } from "vitest";

class ValidationExceptionController {}

class UuidDto {
	@IsUUID()
	public id!: string;
}

class TextDto {
	@IsString()
	public id!: string;
}

class NarrowDto {
	@IsInt()
	@Max(10)
	public id!: number;
}

class IntegerDto {
	@IsInt()
	public id!: number;
}

class ImplicitNumberDto {
	@IsDefined()
	public id!: number;
}

class GrowsOnSomeValuesDto {
	@IsString()
	@Transform(({ value }: { value: unknown }): unknown => (String(value).startsWith("x") ? `x${String(value)}` : value), { toClassOnly: true })
	public id!: string;
}

class UndefinedOnSomeInputsDto {
	@Transform(({ value }: { value: unknown }): unknown => (value === "drop" ? undefined : value), { toClassOnly: true })
	public id?: string;
}

const buildRule = (dto: new () => unknown, methodName: string): IApiControllerParametersRule => {
	const rule: IApiControllerParametersRule | undefined = ApiControllerParametersBuildCustomRule({ controller: ValidationExceptionController, dto, methodName, pathParameters: ["id"], resourcePath: "validation-exception/item" });

	if (!rule) {
		throw new Error("The route has no rule");
	}

	return rule;
};

/**
 * Runs a refusal and returns the exception it throws.
 * @param {() => unknown} refuse - Code that throws or rejects.
 * @returns {Promise<ApiRequestValidationException>} The thrown exception.
 */
async function catchRefusal(refuse: () => unknown): Promise<ApiRequestValidationException> {
	try {
		await refuse();
	} catch (error) {
		expect(error).toBeInstanceOf(ApiRequestValidationException);

		return error as ApiRequestValidationException;
	}

	throw new Error("Nothing was refused");
}

describe("the 400 of a path value", () => {
	it("hands a host filter the class-validator failures of the column rule untouched", async () => {
		const exception: ApiRequestValidationException = await catchRefusal(() => ApiControllerParametersValidate(UuidDto, { id: "not-a-uuid" } as never));
		const [failure]: Array<ValidationError> = ApiRequestValidationGetErrors(exception) ?? [];

		expect(failure).toBeInstanceOf(ValidationError);
		expect(failure).toMatchObject({ constraints: { isUuid: "id must be a UUID" }, property: "id", value: "not-a-uuid" });
		expect(failure?.target).toBeInstanceOf(UuidDto);
		expect(exception.getResponse()).toEqual({ error: "Bad Request", message: ["id must be a UUID"], statusCode: 400 });
	});

	it("hands over the failures of a configured PARAMETERS DTO untouched", async () => {
		const exception: ApiRequestValidationException = await catchRefusal(() => ApiControllerParametersValidate({ configuredDto: NarrowDto, dto: IntegerDto }, { id: 16 } as never));

		expect(exception.validationErrors).toMatchObject([{ constraints: { max: "id must not be greater than 10" }, property: "id", value: 16 }]);
		expect(exception.validationErrors[0]?.target).toBeInstanceOf(NarrowDto);
		expect(exception.getResponse()).toEqual({ error: "Bad Request", message: ["id must not be greater than 10"], statusCode: 400 });
	});

	it("hands over the failures of a custom route's own DTO untouched", async () => {
		const exception: ApiRequestValidationException = await catchRefusal(() => ApiControllerParametersValidate(buildRule(UuidDto, "uuid"), { id: "not-a-uuid" } as never));

		expect(exception.validationErrors).toMatchObject([{ constraints: { isUuid: "id must be a UUID" }, property: "id", value: "not-a-uuid" }]);
		expect(exception.validationErrors[0]).toBeInstanceOf(ValidationError);
	});

	it.each([
		{ constraint: "pathParameterNoText", message: "id has no text form", name: "a value without a text form", parameters: { id: "drop" }, rule: (): IApiControllerParametersRule => buildRule(UndefinedOnSomeInputsDto, "dropped") },
		{ constraint: "pathParameterConversionMismatch", message: "id converts differently with and without implicit conversion", name: "a value the two conversions give different text", parameters: { id: "016" }, rule: (): IApiControllerParametersRule => buildRule(ImplicitNumberDto, "implicit") },
		{ constraint: "pathParameterUnstable", message: "id does not keep its value when its DTO runs on it again", name: "a value the DTO changes on its own output", parameters: { id: "xyz" }, rule: (): IApiControllerParametersRule => buildRule(GrowsOnSomeValuesDto, "grows") },
		{ constraint: "pathParameterNotCanonical", message: "id must be a lower-case UUID", name: "an upper-case UUID a database reads as the lower-case key", parameters: { id: "AAAAAAAA-AAAA-4AAA-8AAA-AAAAAAAAAAAA" }, rule: (): IApiControllerParametersRule => ({ columns: new Map<string, IApiEntityColumn<unknown>>([["id", { name: "id", type: "uuid" } as IApiEntityColumn<unknown>]]), dto: UuidDto }) },
		{ constraint: "pathParameterNotCanonical", message: "id must be a decimal integer without leading zeros", name: "integer text a database reads as another key", parameters: { id: "016" }, rule: (): IApiControllerParametersRule => ({ columns: new Map<string, IApiEntityColumn<unknown>>([["id", { name: "id", type: "int" } as IApiEntityColumn<unknown>]]), dto: TextDto }) },
	])("names $name with a stable constraint and the parameter as property", async ({ constraint, message, parameters, rule }: { constraint: string; message: string; parameters: Record<string, string>; rule: () => IApiControllerParametersRule }) => {
		const exception: ApiRequestValidationException = await catchRefusal(() => ApiControllerParametersValidate(rule(), parameters as never));

		expect(exception.validationErrors).toEqual([Object.assign(new ValidationError(), { children: [], constraints: { [constraint]: message }, property: "id" })]);
		expect(exception.getResponse()).toEqual({ error: "Bad Request", message: [message], statusCode: 400 });
	});

	it("names a missing controller path parameter as class-validator's isDefined does", async () => {
		const exception: ApiRequestValidationException = await catchRefusal(() => ApiControllerPathWhere({}, [{ field: "tenantId", parameter: "tenant" }]));

		expect(exception.validationErrors).toEqual([Object.assign(new ValidationError(), { children: [], constraints: { isDefined: "tenant should not be null or undefined" }, property: "tenant" })]);
		expect(exception.getResponse()).toEqual({ error: "Bad Request", message: ["tenant should not be null or undefined"], statusCode: 400 });
	});
});
