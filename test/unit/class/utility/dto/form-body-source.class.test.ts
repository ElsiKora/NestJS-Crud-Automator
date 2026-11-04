import "reflect-metadata";

import type { CallHandler, ExecutionContext } from "@nestjs/common";

import { DtoFormBodySource } from "@class/utility/dto/form-body-source.class";
import { ApiPropertyBoolean } from "@decorator/api/property/boolean.decorator";
import { ApiPropertyNumber } from "@decorator/api/property/number.decorator";
import { ApiPropertyObject } from "@decorator/api/property/object.decorator";
import { EApiPropertyNumberType } from "@enum/decorator/api";
import { FormBodyInterceptor } from "@interceptor/form-body.interceptor";
import { plainToInstance } from "class-transformer";
import { lastValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";

class FormBodyEntity {}

class FormBodyNestedDto {
	@ApiPropertyBoolean({ description: "flag", entity: FormBodyEntity, isRequired: false })
	public flag?: boolean;
}

class FormBodyDto {
	@ApiPropertyNumber({ description: "counts", entity: FormBodyEntity, exampleValue: [1], format: EApiPropertyNumberType.INTEGER, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, maximum: 100, minimum: 0, minItems: 1, multipleOf: 1 })
	public counts?: Array<number>;

	@ApiPropertyObject({ description: "nested", entity: FormBodyEntity, isRequired: false, shouldValidateNested: true, type: FormBodyNestedDto })
	public nested?: FormBodyNestedDto;
}

describe("DtoFormBodySource", () => {
	it.each(["application/x-www-form-urlencoded", "multipart/form-data; boundary=x", "Application/X-WWW-Form-Urlencoded;charset=utf-8", ["multipart/form-data"]])("remembers a %j body and every object inside it", (contentType: Array<string> | string) => {
		const nested: Record<string, unknown> = { flag: "true" };
		const body: Record<string, unknown> = { nested };

		DtoFormBodySource.mark(contentType, body);

		expect(DtoFormBodySource.has(body)).toBe(true);
		expect(DtoFormBodySource.has(nested)).toBe(true);
	});

	it.each(["application/json", "text/plain", undefined])("leaves a %j body alone", (contentType: string | undefined) => {
		const body: Record<string, unknown> = { count: "5" };

		DtoFormBodySource.mark(contentType, body);

		expect(DtoFormBodySource.has(body)).toBe(false);
	});

	it("walks a multipart body whose fields point back at it once", () => {
		const body: Record<string, unknown> = {};

		body.field = { fields: body, value: "5" };
		DtoFormBodySource.mark("multipart/form-data", body);

		expect(DtoFormBodySource.has(body.field)).toBe(true);
	});

	it("converts the canonical text of a form body, nested objects included, and keeps the text of a JSON body", () => {
		const form: Record<string, unknown> = { counts: ["1", "2"], nested: { flag: "false" } };
		const json: Record<string, unknown> = { counts: ["1", "2"], nested: { flag: "false" } };

		DtoFormBodySource.mark("application/x-www-form-urlencoded", form);

		expect(plainToInstance(FormBodyDto, form)).toEqual(expect.objectContaining({ counts: [1, 2], nested: expect.objectContaining({ flag: false }) as unknown }));
		expect(plainToInstance(FormBodyDto, json)).toEqual(expect.objectContaining({ counts: ["1", "2"], nested: expect.objectContaining({ flag: "false" }) as unknown }));
	});
});

describe("FormBodyInterceptor", () => {
	it("remembers the body of a form request and hands on to the next handler", async () => {
		const body: Record<string, unknown> = { counts: "1" };
		const context: ExecutionContext = { switchToHttp: () => ({ getRequest: () => ({ body, headers: { "content-type": "application/x-www-form-urlencoded" } }) }) } as unknown as ExecutionContext;
		const handle: CallHandler["handle"] = vi.fn(() => of("result"));

		await expect(lastValueFrom(new FormBodyInterceptor().intercept(context, { handle }))).resolves.toBe("result");
		expect(DtoFormBodySource.has(body)).toBe(true);
	});

	it("hands on to the next handler for a request without headers or body", async () => {
		const context: ExecutionContext = { switchToHttp: () => ({ getRequest: () => ({}) }) } as unknown as ExecutionContext;
		const handle: CallHandler["handle"] = vi.fn(() => of("result"));

		await expect(lastValueFrom(new FormBodyInterceptor().intercept(context, { handle }))).resolves.toBe("result");
	});
});
