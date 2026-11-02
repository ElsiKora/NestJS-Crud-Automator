import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2E_FREE_FORM_RESPONSE_VALUE, E2eFreeFormEchoController, E2eFreeFormRecordController, E2eFreeFormRecordEntity, E2eFreeFormRecordService, E2eFreeFormUndeclaredRecordController, E2eFreeFormUndeclaredRecordEntity, E2eFreeFormUndeclaredRecordService } from "./free-form-object";

interface IInjectResponse {
	json: () => unknown;
	statusCode: number;
}

interface IPipeCase {
	isForbidding: boolean;
	name: string;
	options: { forbidNonWhitelisted?: boolean; transform?: boolean; whitelist: boolean };
}

const PIPE_CASES: Array<IPipeCase> = [
	{ isForbidding: false, name: "whitelist", options: { whitelist: true } },
	{ isForbidding: false, name: "whitelist and transform", options: { transform: true, whitelist: true } },
	{ isForbidding: true, name: "whitelist and forbidNonWhitelisted", options: { forbidNonWhitelisted: true, whitelist: true } },
	{ isForbidding: true, name: "whitelist, forbidNonWhitelisted and transform", options: { forbidNonWhitelisted: true, transform: true, whitelist: true } },
];

const FREE_FORM_VALUE: Record<string, unknown> = { deep: { list: [{ junk: true, toString: "kept" }], other: null, valueOf: 1 }, hasOwnProperty: true, id: 1, junk: "kept", toString: "kept", valueOf: 2 };

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("free-form ApiPropertyObject request values on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each(PIPE_CASES)("under a host ValidationPipe with $name", ({ isForbidding, options }: IPipeCase) => {
		let app: INestApplication | undefined;
		let fastify: { inject: (options: { headers?: Record<string, string>; method: string; payload?: unknown; url: string }) => Promise<IInjectResponse> };

		const echo = async (payload: unknown, path: string = "echo"): Promise<IInjectResponse> => await fastify.inject({ method: "POST", payload, url: `/free-form-object/${path}` });

		const echoRaw = async (payload: string): Promise<IInjectResponse> => await fastify.inject({ headers: { "content-type": "application/json" }, method: "POST", payload, url: "/free-form-object/echo" });

		const createDocument = (): OpenAPIObject => SwaggerModule.createDocument(app as INestApplication, new DocumentBuilder().build());

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eFreeFormRecordEntity, E2eFreeFormUndeclaredRecordEntity];
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eFreeFormEchoController, E2eFreeFormRecordController, E2eFreeFormUndeclaredRecordController],
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logging: false, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eFreeFormRecordService, E2eFreeFormUndeclaredRecordService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());
			app.useGlobalPipes(new ValidationPipe(options));
			await app.init();
			await app.getHttpAdapter().getInstance().ready();
			fastify = app.getHttpAdapter().getInstance();
		});

		afterAll(async () => {
			await app?.close();
		});

		it("keeps a free-form array as sent", async () => {
			const response: IInjectResponse = await echo({ payloads: [{ id: 1 }, { id: 2 }, FREE_FORM_VALUE] });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ payloads: [{ id: 1 }, { id: 2 }, FREE_FORM_VALUE] });
		});

		it("keeps a single free-form object as sent", async () => {
			const response: IInjectResponse = await echo({ single: FREE_FORM_VALUE });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ single: FREE_FORM_VALUE });
		});

		it("keeps an object property that declares no class as sent", async () => {
			const response: IInjectResponse = await echo({ undeclared: FREE_FORM_VALUE });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ undeclared: FREE_FORM_VALUE });
		});

		it("compares prototype-named keys of items with no declared class as data, and does not call two different items equal", async () => {
			const distinct: IInjectResponse = await echo({ undeclaredList: [{ toString: "a" }, { toString: "b" }] });
			const repeated: IInjectResponse = await echo({ undeclaredList: [{ toString: "a" }, { toString: "a" }] });

			expect(distinct.statusCode, JSON.stringify(distinct.json())).toBe(HttpStatus.OK);
			expect(distinct.json()).toEqual({ undeclaredList: [{ toString: "a" }, { toString: "b" }] });
			expect(repeated.statusCode, JSON.stringify(repeated.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(repeated.json()).toEqual({ error: "Bad Request", message: ["undeclaredList must not contain duplicate items"], statusCode: HttpStatus.BAD_REQUEST });
		});

		it("loses the keys any Nest ValidationPipe removes, at any depth", async () => {
			const response: IInjectResponse = await echoRaw('{"single":{"id":1,"constructor":"x","prototype":"y","deep":{"kept":true,"prototype":1}}}');

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ single: { deep: { kept: true }, id: 1 } });
		});

		it("keeps a free-form property inside a declared item as sent", async () => {
			const response: IInjectResponse = await echo({ items: [{ meta: FREE_FORM_VALUE, name: "first" }] });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ items: [{ meta: FREE_FORM_VALUE, name: "first" }] });
		});

		it("still applies the pipe to a junk key beside the free-form property of a declared item", async () => {
			const response: IInjectResponse = await echo({ items: [{ junk: "x", meta: { junk: "kept" }, name: "first" }] });

			if (isForbidding) {
				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(response.json()).toEqual({ error: "Bad Request", message: ["items.0.property junk should not exist"], statusCode: HttpStatus.BAD_REQUEST });
			} else {
				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ items: [{ meta: { junk: "kept" }, name: "first" }] });
			}
		});

		it("still applies the pipe to a junk key beside a free-form property of the body", async () => {
			const response: IInjectResponse = await echo({ junk: "x", single: { junk: "kept" } });

			if (isForbidding) {
				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(response.json()).toEqual({ error: "Bad Request", message: ["property junk should not exist"], statusCode: HttpStatus.BAD_REQUEST });
			} else {
				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ single: { junk: "kept" } });
			}
		});

		it.each([{ value: 1 }, { value: "x" }, { value: null }, { value: [{ id: 1 }] }])("answers 400 for the free-form array item $value", async ({ value }: { value: unknown }) => {
			const response: IInjectResponse = await echo({ payloads: [{ id: 1 }, value] });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toEqual({ error: "Bad Request", message: ["each value in payloads must be an object"], statusCode: HttpStatus.BAD_REQUEST });
		});

		it.each([{ value: 1 }, { value: "x" }, { value: [{ id: 1 }] }])("answers 400 for the single free-form value $value", async ({ value }: { value: unknown }) => {
			const response: IInjectResponse = await echo({ single: value });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toEqual({ error: "Bad Request", message: ["single must be an object"], statusCode: HttpStatus.BAD_REQUEST });
		});

		it("answers 400 for equal free-form items on an array declared unique, because the unique check does not depend on nested validation", async () => {
			const response: IInjectResponse = await echo({ payloads: [{ a: 1 }, { a: 1 }] });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toEqual({ error: "Bad Request", message: ["payloads must not contain duplicate items"], statusCode: HttpStatus.BAD_REQUEST });
		});

		it("compares free-form items whatever their key order, at any depth", async () => {
			const flat: IInjectResponse = await echo({
				payloads: [
					{ a: 1, b: 2 },
					{ b: 2, a: 1 },
				],
			});
			const nested: IInjectResponse = await echo({ payloads: [{ deep: { a: 1, b: [{ c: 1, d: 2 }] } }, { deep: { b: [{ d: 2, c: 1 }], a: 1 } }] });

			expect(flat.statusCode, JSON.stringify(flat.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(flat.json()).toEqual({ error: "Bad Request", message: ["payloads must not contain duplicate items"], statusCode: HttpStatus.BAD_REQUEST });
			expect(nested.statusCode, JSON.stringify(nested.json())).toBe(HttpStatus.BAD_REQUEST);
		});

		it("compares every key of a free-form item, a nested junk key included", async () => {
			const response: IInjectResponse = await echo({
				payloads: [
					{ id: 1, junk: "a" },
					{ id: 1, junk: "b" },
				],
			});

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({
				payloads: [
					{ id: 1, junk: "a" },
					{ id: 1, junk: "b" },
				],
			});
		});

		it("lets equal free-form items through on an array not declared unique", async () => {
			const response: IInjectResponse = await echo({ repeats: [{ a: 1 }, { a: 1 }] });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ repeats: [{ a: 1 }, { a: 1 }] });
		});

		it("answers 400 for a free-form item nested too deeply to compare on an array declared unique", async () => {
			let deep: Record<string, unknown> = { leaf: true };

			for (let level: number = 0; level < 70; level += 1) {
				deep = { deep };
			}

			const response: IInjectResponse = await echo({ payloads: [deep] });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toEqual({ error: "Bad Request", message: ["payloads must not nest items more than 64 levels deep"], statusCode: HttpStatus.BAD_REQUEST });
		});

		it("holds a free-form array to its declared bounds", async () => {
			const tooMany: IInjectResponse = await echo({ payloads: [1, 2, 3, 4, 5, 6].map((id: number): Record<string, number> => ({ id })) });
			const tooFew: IInjectResponse = await echo({ repeats: [] });

			expect(tooMany.statusCode, JSON.stringify(tooMany.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(tooMany.json()).toEqual({ error: "Bad Request", message: ["payloads must contain no more than 5 elements"], statusCode: HttpStatus.BAD_REQUEST });
			expect(tooFew.statusCode, JSON.stringify(tooFew.json())).toBe(HttpStatus.BAD_REQUEST);
			expect((tooFew.json() as { message: Array<string> }).message).toContain("repeats must contain at least 1 elements");
		});

		it("publishes a free-form array and object as open objects", () => {
			const document: OpenAPIObject = createDocument();
			const schema: { properties: Record<string, unknown>; required?: Array<string> } = document.components?.schemas?.E2eFreeFormBodyDto as never;

			expect(schema.properties.payloads).toMatchObject({ items: { type: "object" }, maxItems: 5, minItems: 0, type: "array", uniqueItems: true });
			expect(schema.properties.single).toMatchObject({ type: "object" });
			expect(schema.properties.undeclared).toMatchObject({ type: "object" });
			expect(schema.properties.undeclaredList).toMatchObject({ items: { type: "object" }, type: "array", uniqueItems: true });
			expect(schema.properties.payloads).not.toHaveProperty("items.properties");
			expect(schema.properties.single).not.toHaveProperty("properties");
		});

		it("stores and returns free-form values through a generated CREATE route", async () => {
			const payloads: Array<Record<string, unknown>> = [{ id: 1 }, FREE_FORM_VALUE];
			const item: Record<string, unknown> = { meta: FREE_FORM_VALUE, name: "first" };
			const response: IInjectResponse = await fastify.inject({ method: "POST", payload: { item, payloads }, url: "/free-form-object/records" });
			const body: { id: string; item: unknown; payloads: unknown } = response.json() as never;

			expect(response.statusCode, JSON.stringify(body)).toBe(HttpStatus.CREATED);
			expect(body).toMatchObject({ item, payloads });

			const stored: E2eFreeFormRecordEntity | null = await app!.get(E2eFreeFormRecordService).repository.findOneBy({ id: body.id });

			expect(stored).toMatchObject({ item, payloads });
		});

		it("stores and returns a value with no declared class through generated CREATE, GET and GET_LIST routes", async () => {
			const value: { meta: Record<string, unknown>; metas: Array<Record<string, unknown>> } = { meta: FREE_FORM_VALUE, metas: [{ id: 1 }, FREE_FORM_VALUE] };
			const created: IInjectResponse = await fastify.inject({ method: "POST", payload: value, url: "/free-form-object/undeclared-records" });
			const body: { id: string } = created.json() as never;

			expect(created.statusCode, JSON.stringify(body)).toBe(HttpStatus.CREATED);
			expect(body).toMatchObject(value);
			await expect(app!.get(E2eFreeFormUndeclaredRecordService).repository.findOneBy({ id: body.id })).resolves.toMatchObject(value);

			const read: IInjectResponse = await fastify.inject({ method: "GET", url: `/free-form-object/undeclared-records/${body.id}` });

			expect(read.statusCode, JSON.stringify(read.json())).toBe(HttpStatus.OK);
			expect(read.json()).toMatchObject(value);

			const list: IInjectResponse = await fastify.inject({ method: "GET", url: `/free-form-object/undeclared-records?limit=100&page=1&orderBy=id&orderDirection=ASC` });
			const items: Array<{ id: string }> = (list.json() as { items: Array<{ id: string }> }).items;

			expect(list.statusCode, JSON.stringify(list.json())).toBe(HttpStatus.OK);
			expect(items.find((item: { id: string }) => item.id === body.id)).toMatchObject(value);
		});

		it("publishes the generated DTOs of a value with no declared class as open objects", () => {
			const schemas: Array<{ properties?: Record<string, unknown> }> = Object.values(createDocument().components?.schemas ?? {}) as never;
			const withMeta: Array<{ properties?: Record<string, unknown> }> = schemas.filter((schema: { properties?: Record<string, unknown> }) => schema.properties?.metas !== undefined);

			expect(withMeta.length).toBeGreaterThan(0);

			for (const schema of withMeta) {
				expect(schema.properties?.meta).toMatchObject({ type: "object" });
				expect(schema.properties?.metas).toMatchObject({ items: { type: "object" }, type: "array" });
			}
		});

		it("returns a response value as it stands, with or without a ClassSerializerInterceptor", async () => {
			for (const path of ["response", "response/serialized"]) {
				const response: IInjectResponse = await fastify.inject({ method: "GET", url: `/free-form-object/${path}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ single: E2E_FREE_FORM_RESPONSE_VALUE, undeclared: E2E_FREE_FORM_RESPONSE_VALUE });
			}
		});

		it("keeps the documented limit of a ClassSerializerInterceptor with the excludeAll strategy", async () => {
			const response: IInjectResponse = await fastify.inject({ method: "GET", url: "/free-form-object/response/exclude-all" });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(response.json()).toEqual({ single: {}, undeclared: {} });
		});

		it("keeps the documented limit of a raw @ValidateNested without @Type on a plain object", async () => {
			const response: IInjectResponse = await echo({ raw: { id: 1 } }, "raw");

			if (isForbidding) {
				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(response.json()).toEqual({ error: "Bad Request", message: ["raw.property id should not exist"], statusCode: HttpStatus.BAD_REQUEST });
			} else {
				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect(response.json()).toEqual({ raw: {} });
			}
		});
	});
});
