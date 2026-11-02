import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSource, Repository } from "typeorm";

import { randomUUID } from "node:crypto";

import { Body, ClassSerializerInterceptor, Controller, HttpStatus, Inject, Injectable, RequestMethod } from "@nestjs/common";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { IsObject, IsOptional } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType, EFilterOrderDirection } from "../../src/index";

const NUL_MESSAGE: string = "request body must not hold a NUL character";
const FASTIFY_PROTO_MESSAGE: string = "Body is not valid JSON but content-type is set to 'application/json'";
const RESERVED_KEYS: Array<string> = ["__proto__", "constructor", "hasOwnProperty", "prototype"];
const ROW_URL: string = "/reserved-value-rows";
const CURSOR_ROW_URL: string = "/reserved-value-cursor-rows";
const ADAPTERS: Array<{ adapterName: string }> = [{ adapterName: "Fastify" }, { adapterName: "Express" }];

// What a row stored before the rule, or by another writer, may hold: every reserved key, at the top and nested, in objects and in arrays.
const STORED_PAYLOAD: string = '{"__proto__":{"polluted":1},"constructor":"c","hasOwnProperty":"y","prototype":"p","keep":1,"inner":{"constructor":{"prototype":{"p":1}},"hasOwnProperty":{"x":1},"keep":2},"list":[{"constructor":"c","__proto__":[]}]}';

const STORED_SHAPES: Array<{ name: string; payload: string }> = [
	{ name: "every reserved key", payload: STORED_PAYLOAD },
	{ name: "a nested constructor", payload: '{"inner":{"constructor":"c"},"keep":1}' },
	{ name: "a constructor and __proto__ in an array item", payload: '{"list":[{"constructor":"c","__proto__":[]}]}' },
	{ name: "a top-level constructor", payload: '{"constructor":"c","keep":1}' },
	{ name: "a nested __proto__", payload: '{"inner":{"__proto__":{"polluted":1}}}' },
	{ name: "a nested constructor that holds a prototype", payload: '{"inner":{"constructor":{"prototype":{"p":1}}}}' },
	{ name: "an array of an object with a constructor", payload: '[{"constructor":"c"}]' },
];

interface IE2eReservedApplication {
	app: INestApplication;
	base: string;
	dataSource: DataSource;
}

interface IE2eReservedResponse {
	body: Record<string, unknown>;
	status: number;
}

class E2eReservedResponseDto {}

class E2eReservedCustomDto {
	@IsObject()
	@IsOptional()
	public meta?: Record<string, unknown>;
}

@Entity("e2e_reserved_value_rows")
class E2eReservedEntity {
	@ApiPropertyDescribe({ description: "reservedValueRowId", type: EApiPropertyDescribeType.UUID })
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@ApiPropertyDescribe({ description: "reservedValueRowName", exampleValue: "row", format: EApiPropertyStringType.STRING, maxLength: 20, minLength: 1, pattern: "/^[\\s\\S]+$/", type: EApiPropertyDescribeType.STRING })
	@Column({ type: "varchar" })
	public name!: string;

	@ApiPropertyDescribe({ dataType: Object, description: "reservedValueRowPayload", isNullable: true, type: EApiPropertyDescribeType.OBJECT })
	@Column({ nullable: true, type: "jsonb" })
	public payload?: null | Record<string, unknown>;

	@ApiPropertyDescribe({ description: "reservedValueRowRank", exampleValue: 0, format: EApiPropertyNumberType.INTEGER, maximum: 1000, minimum: 0, multipleOf: 1, type: EApiPropertyDescribeType.NUMBER })
	@Column({ default: 0, type: "int" })
	public rank!: number;
}

@Injectable()
@ApiService({ entity: E2eReservedEntity })
class E2eReservedService extends ApiServiceBase<E2eReservedEntity> {
	@InjectRepository(E2eReservedEntity)
	public readonly repository!: Repository<E2eReservedEntity>;
}

@ApiController<E2eReservedEntity>({
	entity: E2eReservedEntity,
	name: "E2eReservedValueRows",
	path: "reserved-value-rows",
	routes: {},
})
class E2eReservedRowController {
	public constructor(@Inject(E2eReservedService) public readonly service: E2eReservedService) {}
}

// A cursor list needs PostgreSQL, so only the PostgreSQL applications mount it.
@ApiController<E2eReservedEntity>({
	entity: E2eReservedEntity,
	name: "E2eReservedValueCursorRows",
	path: "reserved-value-cursor-rows",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
						fields: { rank: { isEnabled: true } },
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
class E2eReservedCursorRowController {
	public constructor(@Inject(E2eReservedService) public readonly service: E2eReservedService) {}
}

@Controller("reserved-value-custom")
class E2eReservedCustomController {
	@ApiRouteCustom<E2eReservedEntity>({
		resource: { action: "reservedValue.custom", entity: E2eReservedEntity },
		response: { serialization: { isEnabled: false }, status: HttpStatus.OK, type: E2eReservedResponseDto },
		route: { method: RequestMethod.POST, path: "custom" },
	})
	public custom(@Body() body: E2eReservedCustomDto): { keys: Array<string> } {
		return { keys: Object.keys(body.meta ?? {}) };
	}
}

/**
 * Writes a value as JSON with its keys sorted at every depth, so two values compare whatever order a driver stored the keys in.
 * Reads own keys only, so an own `__proto__` key is data like any other.
 * @param {unknown} value - Parsed JSON value.
 * @returns {string} Canonical JSON text.
 */
function canonical(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((item: unknown): string => canonical(item)).join(",")}]`;
	}

	if (typeof value === "object" && value !== null) {
		return `{${Object.keys(value)
			.toSorted()
			.map((key: string): string => `${JSON.stringify(key)}:${canonical(Reflect.getOwnPropertyDescriptor(value, key)?.value)}`)
			.join(",")}}`;
	}

	return JSON.stringify(value);
}

/**
 * Writes a value as canonical JSON without the keys class-transformer always drops, which is what a host `ClassSerializerInterceptor` can answer.
 * @param {unknown} value - Parsed JSON value.
 * @returns {string} Canonical JSON text.
 */
function canonicalWithoutDroppedKeys(value: unknown): string {
	if (Array.isArray(value)) {
		return `[${value.map((item: unknown): string => canonicalWithoutDroppedKeys(item)).join(",")}]`;
	}

	if (typeof value === "object" && value !== null) {
		return `{${Object.keys(value)
			.filter((key: string): boolean => key !== "constructor" && key !== "__proto__")
			.toSorted()
			.map((key: string): string => `${JSON.stringify(key)}:${canonicalWithoutDroppedKeys(Reflect.getOwnPropertyDescriptor(value, key)?.value)}`)
			.join(",")}}`;
	}

	return JSON.stringify(value);
}

/**
 * Finds a row in a list answer.
 * @param {IE2eReservedResponse} response - List answer.
 * @param {string} rowId - Row ID.
 * @returns {Record<string, unknown> | undefined} The row.
 */
function findItem(response: IE2eReservedResponse, rowId: string): Record<string, unknown> | undefined {
	return (response.body.items as Array<Record<string, unknown>> | undefined)?.find((row: Record<string, unknown>): boolean => row.id === rowId);
}

/**
 * Builds the message for a reserved key.
 * @param {string} key - Reserved key.
 * @returns {string} The message.
 */
function reservedKeyMessage(key: string): string {
	return `request body must not use the reserved key ${key}`;
}

/**
 * Stores a row with plain SQL, past the routes, as a row written before the rule or by another writer is stored.
 * @param {DataSource} dataSource - Data source of the application.
 * @param {string} name - Row name.
 * @param {string} payload - Payload as JSON text.
 * @returns {Promise<string>} The row ID.
 */
async function seed(dataSource: DataSource, name: string, payload: string): Promise<string> {
	const id: string = randomUUID();
	const isPostgres: boolean = dataSource.options.type === "postgres";

	await dataSource.query(isPostgres ? 'INSERT INTO "e2e_reserved_value_rows" ("id", "name", "payload") VALUES ($1, $2, $3::jsonb)' : 'INSERT INTO "e2e_reserved_value_rows" ("id", "name", "payload") VALUES (?, ?, ?)', [id, name, payload]);

	return id;
}

/**
 * Sends a request over a real socket and reads the JSON answer.
 * @param {string} base - Base URL of the application.
 * @param {string} method - HTTP method.
 * @param {string} path - Path and query.
 * @param {string} [body] - JSON text.
 * @returns {Promise<IE2eReservedResponse>} Status and body.
 */
async function send(base: string, method: string, path: string, body?: string): Promise<IE2eReservedResponse> {
	const response: Response = await fetch(`${base}${path}`, { body, headers: body === undefined ? {} : { "content-type": "application/json" }, method });

	return { body: (await response.json()) as Record<string, unknown>, status: response.status };
}

/**
 * Starts a listening application on a fresh schema.
 * @param {string} adapterName - Fastify or Express.
 * @param {StartedPostgreSqlContainer | undefined} container - PostgreSQL container, or undefined for SQLite.
 * @param {boolean} [hasHostSerializer] - Whether a global `ClassSerializerInterceptor` is registered.
 * @returns {Promise<IE2eReservedApplication>} The application, its URL and its data source.
 */
async function startApplication(adapterName: string, container: StartedPostgreSqlContainer | undefined, hasHostSerializer: boolean = false): Promise<IE2eReservedApplication> {
	const entities: Array<new () => unknown> = [E2eReservedEntity];
	const moduleReference = await Test.createTestingModule({
		controllers: container ? [E2eReservedRowController, E2eReservedCursorRowController, E2eReservedCustomController] : [E2eReservedRowController, E2eReservedCustomController],
		imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logging: false, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot()],
		providers: hasHostSerializer ? [E2eReservedService, { provide: APP_INTERCEPTOR, useClass: ClassSerializerInterceptor }] : [E2eReservedService],
	}).compile();
	const app: INestApplication = moduleReference.createNestApplication(adapterName === "Express" ? new ExpressAdapter() : new FastifyAdapter(), { logger: false });

	await app.listen(0, "127.0.0.1");

	return { app, base: (await app.getUrl()).replace("[::1]", "127.0.0.1"), dataSource: app.get<DataSource>(getDataSourceToken()) };
}

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("reserved keys and NUL in request bodies and stored rows on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each(ADAPTERS)("through $adapterName", ({ adapterName }: { adapterName: string }) => {
		let application: IE2eReservedApplication;
		let repository: Repository<E2eReservedEntity>;

		beforeAll(async () => {
			application = await startApplication(adapterName, container);
			repository = application.dataSource.getRepository(E2eReservedEntity);
		});

		afterAll(async () => {
			await application.app.close();
		});

		describe("a request body", () => {
			it.each(RESERVED_KEYS)("answers 400 for the key %s on CREATE, PATCH and PUT and writes nothing", async (key: string) => {
				const rowId: string = await seed(application.dataSource, "kept", '{"keep":1}');
				const before: number = await repository.count();
				const isFastifyProto: boolean = adapterName === "Fastify" && key === "__proto__";
				const expected: Record<string, unknown> = isFastifyProto ? { message: FASTIFY_PROTO_MESSAGE, statusCode: HttpStatus.BAD_REQUEST } : { error: "Bad Request", message: [reservedKeyMessage(key)], statusCode: HttpStatus.BAD_REQUEST };

				const responses: Array<IE2eReservedResponse> = [await send(application.base, "POST", ROW_URL, `{"name":"row","payload":{"inner":[{"${key}":"value"}]}}`), await send(application.base, "POST", ROW_URL, `{"name":"row","${key}":"value"}`), await send(application.base, "PATCH", `${ROW_URL}/${rowId}`, `{"payload":{"${key}":"value"}}`), await send(application.base, "PUT", `${ROW_URL}/${rowId}`, `{"name":"row","payload":{"${key}":{"nested":1}}}`)];

				for (const response of responses) {
					expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.BAD_REQUEST);
					expect(response.body).toEqual(expected);
				}

				expect(await repository.count()).toBe(before);
				expect((await repository.findOneByOrFail({ id: rowId })).payload).toEqual({ keep: 1 });
			});

			it.each([
				{ body: '{"name":"a\\u0000b"}', name: "a string column" },
				{ body: '{"name":"row","payload":{"text":"a\\u0000b"}}', name: "a JSON string" },
				{ body: '{"name":"row","payload":{"key\\u0000":1}}', name: "a JSON key" },
			])("answers 400 for a NUL in $name on CREATE and writes nothing", async ({ body }: { body: string }) => {
				const before: number = await repository.count();
				const response: IE2eReservedResponse = await send(application.base, "POST", ROW_URL, body);

				expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.BAD_REQUEST);
				expect(response.body).toEqual({ error: "Bad Request", message: [NUL_MESSAGE], statusCode: HttpStatus.BAD_REQUEST });
				expect(await repository.count()).toBe(before);
			});

			it("answers 400 for a reserved key on an ApiRouteCustom body", async () => {
				const response: IE2eReservedResponse = await send(application.base, "POST", "/reserved-value-custom/custom", '{"meta":{"constructor":"c"}}');

				expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.BAD_REQUEST);
				expect(response.body).toEqual({ error: "Bad Request", message: [reservedKeyMessage("constructor")], statusCode: HttpStatus.BAD_REQUEST });
			});

			it("keeps reserved names as values and keys that only look like them", async () => {
				const payload: string = '{"name":"constructor","list":["__proto__","prototype"],"toString":"x","valueOf":1,"isPrototypeOf":2}';
				const response: IE2eReservedResponse = await send(application.base, "POST", ROW_URL, `{"name":"hasOwnProperty","payload":${payload},"rank":1}`);

				expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.CREATED);
				expect(canonical(response.body.payload)).toBe(canonical(JSON.parse(payload)));
			});
		});

		describe("a row already stored with reserved keys", () => {
			it.each(STORED_SHAPES)("answers GET and a PAGE GET_LIST with $name as stored", async ({ payload }: { payload: string }) => {
				const rowId: string = await seed(application.dataSource, "stored", payload);
				const read: IE2eReservedResponse = await send(application.base, "GET", `${ROW_URL}/${rowId}`);
				const list: IE2eReservedResponse = await send(application.base, "GET", `${ROW_URL}?limit=100&page=1`);

				expect(read.status, JSON.stringify(read.body)).toBe(HttpStatus.OK);
				expect(canonical(read.body.payload)).toBe(canonical(JSON.parse(payload)));
				expect(list.status, JSON.stringify(list.body)).toBe(HttpStatus.OK);
				expect(canonical(findItem(list, rowId)?.payload)).toBe(canonical(JSON.parse(payload)));
			});

			it("does not change Object.prototype while it reads the row", async () => {
				const rowId: string = await seed(application.dataSource, "polluting", STORED_PAYLOAD);

				await send(application.base, "GET", `${ROW_URL}/${rowId}`);
				await send(application.base, "GET", `${ROW_URL}?limit=100&page=1`);

				expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
				expect(({} as { p?: unknown }).p).toBeUndefined();
			});

			it("answers GET with a NUL a driver stored, where the driver stores one", async () => {
				// PostgreSQL refuses a NUL in text and jsonb, so no row of it can hold one.
				const payload: string = isPostgres ? '{"text":"plain"}' : '{"text":"a\\u0000b"}';
				const rowId: string = await seed(application.dataSource, "nul", payload);
				const response: IE2eReservedResponse = await send(application.base, "GET", `${ROW_URL}/${rowId}`);

				expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.OK);
				expect(response.body.payload).toEqual(JSON.parse(payload));
			});
		});
	});
});

describe("stored reserved keys through a CURSOR GET_LIST on PostgreSQL (E2E)", () => {
	let container: StartedPostgreSqlContainer;

	beforeAll(async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
	}, 120_000);

	afterAll(async () => {
		await container.stop();
	});

	describe.each(ADAPTERS)("through $adapterName", ({ adapterName }: { adapterName: string }) => {
		let application: IE2eReservedApplication;

		beforeAll(async () => {
			application = await startApplication(adapterName, container);
		});

		afterAll(async () => {
			await application.app.close();
		});

		it.each(STORED_SHAPES)("answers with $name as stored", async ({ payload }: { payload: string }) => {
			const rowId: string = await seed(application.dataSource, "cursor", payload);
			const response: IE2eReservedResponse = await send(application.base, "GET", `${CURSOR_ROW_URL}?limit=100`);

			expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.OK);
			expect(canonical(findItem(response, rowId)?.payload)).toBe(canonical(JSON.parse(payload)));
			expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
		});
	});

	describe.each(ADAPTERS)("under a host ClassSerializerInterceptor through $adapterName", ({ adapterName }: { adapterName: string }) => {
		let application: IE2eReservedApplication;

		beforeAll(async () => {
			application = await startApplication(adapterName, container, true);
		});

		afterAll(async () => {
			await application.app.close();
		});

		it.each(STORED_SHAPES)("answers with $name as a PAGE GET_LIST answers it", async ({ payload }: { payload: string }) => {
			const rowId: string = await seed(application.dataSource, "cursor-serialized", payload);
			const cursorList: IE2eReservedResponse = await send(application.base, "GET", `${CURSOR_ROW_URL}?limit=100`);
			const pageList: IE2eReservedResponse = await send(application.base, "GET", `${ROW_URL}?limit=100&page=1`);

			expect(cursorList.status, JSON.stringify(cursorList.body)).toBe(HttpStatus.OK);
			expect(pageList.status, JSON.stringify(pageList.body)).toBe(HttpStatus.OK);
			expect(canonical(findItem(cursorList, rowId))).toBe(canonical(findItem(pageList, rowId)));
			expect(canonical(findItem(cursorList, rowId)?.payload)).toBe(canonicalWithoutDroppedKeys(JSON.parse(payload)));
		});
	});
});

describe.each(ADAPTERS)("stored reserved keys under a host ClassSerializerInterceptor through $adapterName on SQLite (E2E)", ({ adapterName }: { adapterName: string }) => {
	let application: IE2eReservedApplication;

	beforeAll(async () => {
		application = await startApplication(adapterName, undefined, true);
	});

	afterAll(async () => {
		await application.app.close();
	});

	// class-transformer drops the keys constructor and __proto__ from whatever instanceToPlain walks, so the host serializer can answer every other key, and must not fail.
	it.each(STORED_SHAPES)("answers GET and a PAGE GET_LIST with $name less the keys class-transformer drops", async ({ payload }: { payload: string }) => {
		const rowId: string = await seed(application.dataSource, "serialized", payload);
		const read: IE2eReservedResponse = await send(application.base, "GET", `${ROW_URL}/${rowId}`);
		const list: IE2eReservedResponse = await send(application.base, "GET", `${ROW_URL}?limit=100&page=1`);

		expect(read.status, JSON.stringify(read.body)).toBe(HttpStatus.OK);
		expect(canonical(read.body.payload)).toBe(canonicalWithoutDroppedKeys(JSON.parse(payload)));
		expect(list.status, JSON.stringify(list.body)).toBe(HttpStatus.OK);
		expect(canonical(findItem(list, rowId)?.payload)).toBe(canonicalWithoutDroppedKeys(JSON.parse(payload)));
	});
});
