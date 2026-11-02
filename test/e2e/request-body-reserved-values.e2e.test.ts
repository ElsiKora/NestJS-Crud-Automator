import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSource, Repository } from "typeorm";

import { randomUUID } from "node:crypto";

import { Body, Controller, HttpStatus, Inject, Injectable, RequestMethod } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { IsObject, IsOptional } from "class-validator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, EApiPropertyDescribeType, EApiPropertyStringType } from "../../src/index";

const NUL_MESSAGE: string = "request body must not hold a NUL character";
const FASTIFY_PROTO_MESSAGE: string = "Body is not valid JSON but content-type is set to 'application/json'";
const RESERVED_KEYS: Array<string> = ["__proto__", "constructor", "hasOwnProperty", "prototype"];
const ROW_URL: string = "/reserved-value-rows";

// What a row stored before the rule, or by another writer, may hold: every reserved key, at the top and nested, in objects and in arrays.
const STORED_PAYLOAD: string = '{"__proto__":{"polluted":1},"constructor":"c","hasOwnProperty":"y","prototype":"p","keep":1,"inner":{"constructor":{"prototype":{"p":1}},"hasOwnProperty":{"x":1},"keep":2},"list":[{"constructor":"c","__proto__":[]}]}';

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
 * Builds the message for a reserved key.
 * @param {string} key - Reserved key.
 * @returns {string} The message.
 */
function reservedKeyMessage(key: string): string {
	return `request body must not use the reserved key ${key}`;
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

	describe.each([{ adapterName: "Fastify" }, { adapterName: "Express" }])("through $adapterName", ({ adapterName }: { adapterName: string }) => {
		let app: INestApplication;
		let base: string;
		let dataSource: DataSource;
		let repository: Repository<E2eReservedEntity>;

		const send = async (method: string, path: string, body?: string): Promise<IE2eReservedResponse> => {
			const response: Response = await fetch(`${base}${path}`, { body, headers: body === undefined ? {} : { "content-type": "application/json" }, method });

			return { body: (await response.json()) as Record<string, unknown>, status: response.status };
		};

		/**
		 * Stores a row with plain SQL, past the routes, as a row written before the rule or by another writer is stored.
		 * @param {string} name - Row name.
		 * @param {string} payload - Payload as JSON text.
		 * @returns {Promise<string>} The row ID.
		 */
		const seed = async (name: string, payload: string): Promise<string> => {
			const id: string = randomUUID();

			await dataSource.query(isPostgres ? 'INSERT INTO "e2e_reserved_value_rows" ("id", "name", "payload") VALUES ($1, $2, $3::jsonb)' : 'INSERT INTO "e2e_reserved_value_rows" ("id", "name", "payload") VALUES (?, ?, ?)', [id, name, payload]);

			return id;
		};

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eReservedEntity];
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eReservedRowController, E2eReservedCustomController],
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logging: false, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logging: false, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot()],
				providers: [E2eReservedService],
			}).compile();

			app = moduleReference.createNestApplication(adapterName === "Express" ? new ExpressAdapter() : new FastifyAdapter(), { logger: false });
			await app.listen(0, "127.0.0.1");
			base = (await app.getUrl()).replace("[::1]", "127.0.0.1");
			dataSource = app.get<DataSource>(getDataSourceToken());
			repository = dataSource.getRepository(E2eReservedEntity);
		});

		afterAll(async () => {
			await app.close();
		});

		describe("a request body", () => {
			it.each(RESERVED_KEYS)("answers 400 for the key %s on CREATE, PATCH and PUT and writes nothing", async (key: string) => {
				const rowId: string = await seed("kept", '{"keep":1}');
				const before: number = await repository.count();
				const isFastifyProto: boolean = adapterName === "Fastify" && key === "__proto__";
				const expected: Record<string, unknown> = isFastifyProto ? { message: FASTIFY_PROTO_MESSAGE, statusCode: HttpStatus.BAD_REQUEST } : { error: "Bad Request", message: [reservedKeyMessage(key)], statusCode: HttpStatus.BAD_REQUEST };

				const responses: Array<IE2eReservedResponse> = [await send("POST", ROW_URL, `{"name":"row","payload":{"inner":[{"${key}":"value"}]}}`), await send("POST", ROW_URL, `{"name":"row","${key}":"value"}`), await send("PATCH", `${ROW_URL}/${rowId}`, `{"payload":{"${key}":"value"}}`), await send("PUT", `${ROW_URL}/${rowId}`, `{"name":"row","payload":{"${key}":{"nested":1}}}`)];

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
				const response: IE2eReservedResponse = await send("POST", ROW_URL, body);

				expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.BAD_REQUEST);
				expect(response.body).toEqual({ error: "Bad Request", message: [NUL_MESSAGE], statusCode: HttpStatus.BAD_REQUEST });
				expect(await repository.count()).toBe(before);
			});

			it("answers 400 for a reserved key on an ApiRouteCustom body", async () => {
				const response: IE2eReservedResponse = await send("POST", "/reserved-value-custom/custom", '{"meta":{"constructor":"c"}}');

				expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.BAD_REQUEST);
				expect(response.body).toEqual({ error: "Bad Request", message: [reservedKeyMessage("constructor")], statusCode: HttpStatus.BAD_REQUEST });
			});

			it("keeps reserved names as values and keys that only look like them", async () => {
				const payload: string = '{"name":"constructor","list":["__proto__","prototype"],"toString":"x","valueOf":1,"isPrototypeOf":2}';
				const response: IE2eReservedResponse = await send("POST", ROW_URL, `{"name":"hasOwnProperty","payload":${payload}}`);

				expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.CREATED);
				expect(canonical(response.body.payload)).toBe(canonical(JSON.parse(payload)));
			});
		});

		describe("a row already stored with reserved keys", () => {
			it("answers GET with the stored payload", async () => {
				const rowId: string = await seed("stored", STORED_PAYLOAD);
				const response: IE2eReservedResponse = await send("GET", `${ROW_URL}/${rowId}`);

				expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.OK);
				expect(canonical(response.body.payload)).toBe(canonical(JSON.parse(STORED_PAYLOAD)));
			});

			it("answers GET_LIST with the stored payload", async () => {
				const rowId: string = await seed("listed", STORED_PAYLOAD);
				const response: IE2eReservedResponse = await send("GET", `${ROW_URL}?limit=100&page=1`);
				const item: Record<string, unknown> | undefined = (response.body.items as Array<Record<string, unknown>> | undefined)?.find((row: Record<string, unknown>): boolean => row.id === rowId);

				expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.OK);
				expect(canonical(item?.payload)).toBe(canonical(JSON.parse(STORED_PAYLOAD)));
			});

			it("does not change Object.prototype while it reads the row", async () => {
				const rowId: string = await seed("polluting", STORED_PAYLOAD);

				await send("GET", `${ROW_URL}/${rowId}`);
				await send("GET", `${ROW_URL}?limit=100&page=1`);

				expect(({} as { polluted?: unknown }).polluted).toBeUndefined();
				expect(({} as { p?: unknown }).p).toBeUndefined();
			});

			it("answers GET with a NUL a driver stored, where the driver stores one", async () => {
				// PostgreSQL refuses a NUL in text and jsonb, so no row of it can hold one.
				const payload: string = isPostgres ? '{"text":"plain"}' : '{"text":"a\\u0000b"}';
				const rowId: string = await seed("nul", payload);
				const response: IE2eReservedResponse = await send("GET", `${ROW_URL}/${rowId}`);

				expect(response.status, JSON.stringify(response.body)).toBe(HttpStatus.OK);
				expect(response.body.payload).toEqual(JSON.parse(payload));
			});
		});
	});
});
