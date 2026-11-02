import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { Expose } from "class-transformer";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiPropertyBoolean, ApiPropertyObject, ApiPropertyString, EApiPropertyStringType } from "../../src/index";

class E2eRenamedKeyEntityReference {}

const STRING_OPTIONS = { entity: E2eRenamedKeyEntityReference, exampleValue: "a", format: EApiPropertyStringType.STRING, isRequired: false, maxLength: 20, minLength: 1, pattern: "/^.+$/" };

class E2eRenamedKeyNestedDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "n" })
	@Expose({ name: "n_wire" })
	public n?: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "plainN" })
	public plainN?: string;
}

class E2eRenamedKeyBodyDto {
	@ApiPropertyBoolean({ description: "flag", entity: E2eRenamedKeyEntityReference, isRequired: false })
	@Expose({ name: "flag_wire" })
	public flag?: boolean;

	@ApiPropertyObject({ description: "nested", entity: E2eRenamedKeyEntityReference, isRequired: false, shouldValidateNested: true, type: E2eRenamedKeyNestedDto })
	public nested?: E2eRenamedKeyNestedDto;

	@ApiPropertyObject({ description: "nestedList", entity: E2eRenamedKeyEntityReference, isArray: true, isRequired: false, isUniqueItems: false, maxItems: 5, minItems: 0, shouldValidateNested: true, type: E2eRenamedKeyNestedDto })
	public nestedList?: Array<E2eRenamedKeyNestedDto>;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "plain" })
	public plain?: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "q" })
	@Expose({ name: "q_wire" })
	public q?: string;
}

class E2eRenamedKeyQueryDto {
	@ApiPropertyString({ ...STRING_OPTIONS, description: "plain" })
	public plain?: string;

	@ApiPropertyString({ ...STRING_OPTIONS, description: "q" })
	@Expose({ name: "q_wire" })
	public q?: string;
}

/**
 * Lists the bound values by property key, so the test sees what the handler got rather than what a serializer sends.
 * @param {object} dto - Bound request DTO.
 * @returns {unknown} The own values of the DTO and of its nested objects.
 */
function describeBound(dto: object): unknown {
	return JSON.parse(JSON.stringify(dto, (_key: string, value: unknown): unknown => (typeof value === "object" && value !== null && !Array.isArray(value) ? { ...value } : value)));
}

@Controller("renamed-request-key")
class E2eRenamedKeyController {
	@HttpCode(HttpStatus.OK)
	@Post()
	public body(@Body() dto: E2eRenamedKeyBodyDto): unknown {
		return describeBound(dto);
	}

	@Get()
	public query(@Query() dto: E2eRenamedKeyQueryDto): unknown {
		return describeBound(dto);
	}
}

describe.each([
	["exposeUnsetFields on", { transform: true, whitelist: true }],
	["exposeUnsetFields off", { transform: true, transformOptions: { exposeUnsetFields: false }, whitelist: true }],
])("A renamed request property sent under its property key (E2E, %s)", (_label: string, pipeOptions: ConstructorParameters<typeof ValidationPipe>[0]) => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload?: unknown; url: string }) => Promise<{ json: () => { message?: unknown }; statusCode: number }> };

	beforeAll(async () => {
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eRenamedKeyController],
			imports: [ApiAuthorizationModule.forRoot()],
			providers: [{ provide: APP_PIPE, useValue: new ValidationPipe(pipeOptions) }],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
	});

	afterAll(async () => {
		await app?.close();
	});

	it("binds every renamed property from its exposed name in a body", async () => {
		const response = await fastify.inject({ method: "POST", payload: { flag_wire: false, nested: { n_wire: "x", plainN: "y" }, nestedList: [{ n_wire: "z" }], plain: "p", q_wire: "a" }, url: "/renamed-request-key" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ flag: false, nested: { n: "x", plainN: "y" }, nestedList: [{ n: "z" }], plain: "p", q: "a" });
	});

	it.each([
		["q", "q_wire", { q: "old" }],
		["q", "q_wire", { q: "old", q_wire: "a" }],
		["q", "q_wire", { q_wire: "a", q: "old" }],
		["flag", "flag_wire", { flag: true, flag_wire: false }],
		["flag", "flag_wire", { flag_wire: false, flag: true }],
		["n", "n_wire", { nested: { n: "oldN", n_wire: "x" } }],
		["n", "n_wire", { nested: { n_wire: "x", n: "oldN" } }],
		["n", "n_wire", { nestedList: [{ n_wire: "x" }, { n: "old", plainN: "y" }] }],
		["n", "n_wire", { nestedList: [{ n: "old", n_wire: "x" }] }],
	])("refuses the property key %s in a body, also next to %s: %j", async (propertyKey: string, exposedName: string, payload: Record<string, unknown>) => {
		const response = await fastify.inject({ method: "POST", payload, url: "/renamed-request-key" });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json().message).toEqual([`property ${propertyKey} should not exist, send it as ${exposedName}`]);
	});

	it("binds a renamed property from its exposed name in a query", async () => {
		const response = await fastify.inject({ method: "GET", url: "/renamed-request-key?q_wire=a&plain=p" });

		expect(response.statusCode).toBe(HttpStatus.OK);
		expect(response.json()).toEqual({ plain: "p", q: "a" });
	});

	it.each(["q=old", "q=old&q_wire=a", "q_wire=a&q=old"])("refuses the property key in a query: %s", async (search: string) => {
		const response = await fastify.inject({ method: "GET", url: `/renamed-request-key?${search}` });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json().message).toEqual(["property q should not exist, send it as q_wire"]);
	});
});
