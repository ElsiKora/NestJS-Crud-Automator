import "reflect-metadata";

import type { INestApplication, Provider } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";

import { ValidationPipe } from "@nestjs/common";
import { APP_PIPE } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { TRowPathDriver, TRowPathFixture } from "./row-path/fixture";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { ROW_PATH_KEY_FIXTURES, RowPathKeyItemRouteSubscriber } from "./row-path/keys.fixture";

type TPipe = "forbid" | "none" | "transform" | "whitelist";
type TResponse = { body: string; json: () => unknown; statusCode: number };

const PARENT_OWN: string = "aaaaaaaa-0000-4000-8000-000000000001";
const PARENT_OTHER: string = "aaaaaaaa-0000-4000-8000-000000000002";
const ITEM_OWN: string = "bbbbbbbb-0000-4000-8000-000000000001";
const ITEM_OTHER: string = "bbbbbbbb-0000-4000-8000-000000000002";

const PIPES: Record<TPipe, Array<Provider>> = {
	forbid: [{ provide: APP_PIPE, useValue: new ValidationPipe({ forbidNonWhitelisted: true, skipMissingProperties: true, transform: true, whitelist: true }) }],
	none: [],
	transform: [{ provide: APP_PIPE, useValue: new ValidationPipe({ skipMissingProperties: true, transform: true }) }],
	whitelist: [{ provide: APP_PIPE, useValue: new ValidationPipe({ skipMissingProperties: true, transform: true, whitelist: true }) }],
};

describe.each<TRowPathDriver>(["postgres", "sqlite"])("row keys in the body and the reload on %s (E2E)", (driver: TRowPathDriver) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		container = driver === "postgres" ? await new PostgreSqlContainer("postgres:17-alpine").start() : undefined;
	});

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<TPipe>(["none", "transform", "whitelist", "forbid"])("with the %s pipe", (pipe: TPipe) => {
		let app: INestApplication;
		let dataSource: DataSource;
		let fastify: { inject: (options: object) => Promise<TResponse> };

		const send = async (method: string, url: string, payload?: object): Promise<TResponse> => await fastify.inject({ headers: payload ? { "content-type": "application/json" } : {}, method, payload, url });

		const rows = async (table: string, order: string): Promise<Array<Record<string, unknown>>> => (await dataSource.query(`SELECT * FROM ${table} ORDER BY ${order}`)) as Array<Record<string, unknown>>;

		// A pipe that refuses unknown properties answers 400 for an equal key too, so only the other pipes reach the route with it.
		const equalKeyStatus: number = pipe === "forbid" ? 400 : 200;

		beforeAll(async () => {
			const fixture: TRowPathFixture = ROW_PATH_KEY_FIXTURES[driver];

			const reference = await Test.createTestingModule({
				imports: [ApiAuthorizationModule.forRoot({}), ApiSubscriberModule, TypeOrmModule.forRoot(container ? { dropSchema: true, entities: fixture.entities, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", entities: fixture.entities, synchronize: true, type: "better-sqlite3" }), fixture.module],
				providers: PIPES[pipe],
			}).compile();

			app = reference.createNestApplication(new FastifyAdapter());
			await app.init();
			fastify = app.getHttpAdapter().getInstance() as { inject: (options: object) => Promise<TResponse> };
			dataSource = app.get<DataSource>(getDataSourceToken());
		});

		afterAll(async () => {
			await app?.close();
		});

		describe("a row key or bound field in the body under a parent path parameter", () => {
			beforeEach(async () => {
				await dataSource.query("DELETE FROM row_path_key_items");
				await dataSource.query("DELETE FROM row_path_key_parents");
				await dataSource.query(`INSERT INTO row_path_key_parents ("id", "name") VALUES ('${PARENT_OWN}', 'own'), ('${PARENT_OTHER}', 'other')`);
				await dataSource.query(`INSERT INTO row_path_key_items ("id", "name", "parentId") VALUES ('${ITEM_OWN}', 'own', '${PARENT_OWN}'), ('${ITEM_OTHER}', 'other', '${PARENT_OTHER}')`);
			});

			const untouched = async (): Promise<void> => {
				expect(await rows("row_path_key_items", `"id"`)).toEqual([
					{ id: ITEM_OWN, name: "own", parentId: PARENT_OWN },
					{ id: ITEM_OTHER, name: "other", parentId: PARENT_OTHER },
				]);
			};

			it.each([
				["PATCH", { id: ITEM_OTHER }],
				["PUT", { id: ITEM_OTHER, name: "moved" }],
				["PATCH", { parentId: PARENT_OTHER }],
				["PUT", { name: "moved", parentId: PARENT_OTHER }],
				["PATCH", { parent: PARENT_OTHER }],
				["PATCH", { parent: { id: PARENT_OTHER } }],
				["PATCH", { parentId: [PARENT_OWN] }],
				["PATCH", { id: [ITEM_OWN] }],
				["PATCH", { parentId: null }],
			])("%s with %j answers 400 and changes no row", async (method: string, payload: object) => {
				const response: TResponse = await send(method, `/parent/${PARENT_OWN}/item/${ITEM_OWN}`, payload);

				expect(response.statusCode).toBe(400);
				expect(response.body).not.toContain(PARENT_OTHER);
				expect(response.body).not.toContain(ITEM_OTHER);
				await untouched();
			});

			it.each([[{ name: "new", parentId: PARENT_OTHER }], [{ name: "new", parent: PARENT_OTHER }], [{ name: "new", parent: { id: PARENT_OTHER } }]])("CREATE with %j answers 400 and adds no row", async (payload: object) => {
				const response: TResponse = await send("POST", `/parent/${PARENT_OWN}/item`, { ...payload, id: "bbbbbbbb-0000-4000-8000-000000000003" });

				expect(response.statusCode).toBe(400);
				expect(response.body).not.toContain(PARENT_OTHER);
				await untouched();
			});

			it.runIf(pipe === "none")("leaves the request body and the subscriber body as the client sent them", async () => {
				RowPathKeyItemRouteSubscriber.bodies.splice(0);
				const patchBody: object = { id: ITEM_OWN, name: "seen", parentId: PARENT_OWN };
				const createBody: object = { id: "bbbbbbbb-0000-4000-8000-000000000003", name: "made", parent: { id: PARENT_OWN }, parentId: PARENT_OWN };

				expect((await send("PATCH", `/parent/${PARENT_OWN}/item/${ITEM_OWN}`, patchBody)).statusCode).toBe(200);
				expect((await send("POST", `/parent/${PARENT_OWN}/item`, createBody)).statusCode).toBe(201);
				expect(RowPathKeyItemRouteSubscriber.bodies).toEqual([
					{ data: patchBody, request: patchBody },
					{ data: createBody, request: createBody },
				]);
			});

			it("PATCH with the key and bound field the path names changes only the addressed row", async () => {
				const response: TResponse = await send("PATCH", `/parent/${PARENT_OWN}/item/${ITEM_OWN}`, { id: ITEM_OWN, name: "same", parentId: PARENT_OWN });

				expect(response.statusCode).toBe(equalKeyStatus);
				expect((await rows("row_path_key_items", `"id"`))[1]).toEqual({ id: ITEM_OTHER, name: "other", parentId: PARENT_OTHER });
			});
		});

		describe("a key column in the body on a composite key", () => {
			beforeEach(async () => {
				await dataSource.query("DELETE FROM row_path_key_pairs");
				await dataSource.query(`INSERT INTO row_path_key_pairs ("a", "b", "name") VALUES ('x', '1', 'one'), ('x', '2', 'two'), ('y', '1', 'only')`);
			});

			const pairs = async (): Promise<Array<Record<string, unknown>>> => await rows("row_path_key_pairs", `"a", "b"`);

			it.each([
				["PATCH", "/pair/x/1", { b: "2", name: "clobber" }],
				["PUT", "/pair/x/1", { b: "9", name: "duplicate" }],
				["PATCH", "/pair/x/1", { a: "y" }],
				["PUT", "/pair/x/1", { a: "z", b: "1", name: "duplicate" }],
				["PATCH", "/pair-by-a/y", { b: "1", name: "unaddressed" }],
				["PUT", "/pair-by-a/y", { b: "7", name: "unaddressed" }],
			])("%s %s with %j answers 400 and neither changes nor adds a row", async (method: string, url: string, payload: object) => {
				const before: Array<Record<string, unknown>> = await pairs();

				expect((await send(method, url, payload)).statusCode).toBe(400);
				expect(await pairs()).toEqual(before);
			});

			it("PATCH with the key columns the path names changes only the addressed row", async () => {
				expect((await send("PATCH", "/pair/x/1", { a: "x", b: "1", name: "renamed" })).statusCode).toBe(equalKeyStatus);
				expect((await pairs()).filter((row: Record<string, unknown>) => row.name === "two" || row.name === "only")).toHaveLength(2);
				expect(await pairs()).toHaveLength(3);
			});
		});

		describe("a relation over the bound column and its own column", () => {
			beforeEach(async () => {
				await dataSource.query("DELETE FROM row_path_key_tenant_children");
				await dataSource.query("DELETE FROM row_path_key_tenant_parents");
				await dataSource.query(`INSERT INTO row_path_key_tenant_parents ("tenantId", "id", "name") VALUES ('T1', 'P1', 'one'), ('T1', 'P2', 'two'), ('T2', 'P2', 'other')`);
				await dataSource.query(`INSERT INTO row_path_key_tenant_children ("tenantId", "id", "name", "parentId") VALUES ('T1', 'C1', 'child', 'P1')`);
			});

			const children = async (): Promise<Array<Record<string, unknown>>> => await rows("row_path_key_tenant_children", `"id"`);

			const unchanged: Array<Record<string, unknown>> = [{ id: "C1", name: "child", parentId: "P1", tenantId: "T1" }];

			// The generated create body leaves the key columns out, so a whitelisting pipe drops or refuses the row key before the route.
			it.runIf(pipe === "none" || pipe === "transform").each([[{ id: "P2", tenantId: "T1" }], [{ id: "P2" }]])("CREATE with the relation %j keeps its own column", async (parent: object) => {
				const response: TResponse = await send("POST", "/tenant/T1/child", { id: "C2", name: "made", parent });

				expect(response.statusCode).toBe(201);
				expect(await children()).toEqual([...unchanged, { id: "C2", name: "made", parentId: "P2", tenantId: "T1" }]);
			});

			it.each([["PATCH"], ["PUT"]])('%s with the relation {"id":"P2"} keeps its own column and moves it', async (method: string) => {
				const response: TResponse = await send(method, "/tenant/T1/child/C1", { name: "moved", parent: { id: "P2" } });

				expect(response.statusCode).toBe(200);
				expect(await children()).toEqual([{ id: "C1", name: "moved", parentId: "P2", tenantId: "T1" }]);
			});

			// The published relation leaves the bound column out, so a pipe that refuses unknown properties refuses it even when it is equal.
			it.each([["PATCH"], ["PUT"]])("%s with the relation that also names the bound column the path names moves it", async (method: string) => {
				const response: TResponse = await send(method, "/tenant/T1/child/C1", { name: "moved", parent: { id: "P2", tenantId: "T1" } });

				expect(response.statusCode).toBe(equalKeyStatus);
				expect(await children()).toEqual(pipe === "forbid" ? unchanged : [{ id: "C1", name: "moved", parentId: "P2", tenantId: "T1" }]);
			});

			it("PATCH with the own column set to null clears the relation and keeps the bound column", async () => {
				const response: TResponse = await send("PATCH", "/tenant/T1/child/C1", { parentId: null });

				expect(response.statusCode).toBe(200);
				expect(await children()).toEqual([{ id: "C1", name: "child", parentId: null, tenantId: "T1" }]);
			});

			it.runIf(pipe === "none")("CREATE with a relation that names another own column than the body answers 400 and adds no row", async () => {
				expect((await send("POST", "/tenant/T1/child", { id: "C2", name: "made", parent: { id: "P2" }, parentId: "P1" })).statusCode).toBe(400);
				expect(await children()).toEqual(unchanged);
			});

			it.each([
				["POST", "/tenant/T1/child", { id: "C2", name: "made", parent: { id: "P2", tenantId: "T2" } }],
				["PATCH", "/tenant/T1/child/C1", { parent: { id: "P2", tenantId: "T2" } }],
			])("%s %s with %j answers 400 and changes no row", async (method: string, url: string, payload: object) => {
				const response: TResponse = await send(method, url, payload);

				expect(response.statusCode).toBe(400);
				expect(response.body).not.toContain("T2");
				expect(await children()).toEqual(unchanged);
			});

			it.each([
				["POST", "/tenant/T1/child", { id: "C2", name: "made", parent: "P2" }],
				["POST", "/tenant/T1/child", { id: "C2", name: "made", parent: null }],
				["PATCH", "/tenant/T1/child/C1", { parent: null }],
				["PATCH", "/tenant/T1/child/C1", { parent: ["P2", "T1"] }],
				["PUT", "/tenant/T1/child/C1", { name: "moved", parent: "P2" }],
			])("%s %s with %j answers 400, says how to clear the relation and changes no row", async (method: string, url: string, payload: object) => {
				const response: TResponse = await send(method, url, payload);

				expect(response.statusCode).toBe(400);

				if (pipe === "none") {
					expect(response.json()).toEqual({ details: { propertyName: "parent", reason: "a relation bound by the path must be sent as an object naming its join columns; clear it with parentId: null" }, error: "Bad Request", message: "PARAMETERS_NOT_VALID", statusCode: 400 });
				}

				expect(await children()).toEqual(unchanged);
			});
		});

		describe("a relation over the bound column and a date and time key column", () => {
			const SLOT: string = "2026-01-01T00:00:00.002Z";
			const literal = (instant: string): string => (driver === "postgres" ? instant : instant.replace("T", " ").replace("Z", ""));

			beforeEach(async () => {
				await dataSource.query("DELETE FROM row_path_key_bookings");
				await dataSource.query("DELETE FROM row_path_key_slots");
				await dataSource.query(`INSERT INTO row_path_key_slots ("tenantId", "at", "name") VALUES ('T1', '${literal(SLOT)}', 'slot')`);
			});

			const bookings = async (): Promise<Array<unknown>> => (await rows("row_path_key_bookings", `"id"`)).map((row: Record<string, unknown>) => row.id);

			it.each([[Date.parse(SLOT)], ["2026-01-01T03:00:00.002+03:00"], ["2026-01-01T00:00:00Z"], ["2026-01-01 00:00:00.002"], ["2026-01-01T00:00:00.0020Z"], [[SLOT]]])("CREATE with the relation instant %j answers 400 and adds no row", async (at: unknown) => {
				const response: TResponse = await send("POST", "/tenant/T1/booking", { id: "B1", slot: { at } });

				expect(response.statusCode).toBe(400);

				if (pipe === "none") {
					expect(response.json()).toEqual({ details: { propertyName: "slot", reason: "date and time key must be a UTC instant YYYY-MM-DDTHH:mm:ss.sssZ" }, error: "Bad Request", message: "PARAMETERS_NOT_VALID", statusCode: 400 });
				}

				expect(await bookings()).toEqual([]);
			});

			it.runIf(pipe === "none")("CREATE with the relation instant and the bound column answers 400 for a non-canonical instant and adds no row", async () => {
				const response: TResponse = await send("POST", "/tenant/T1/booking", { id: "B1", slot: { at: Date.parse(SLOT), tenantId: "T1" } });

				expect(response.statusCode).toBe(400);
				expect(await bookings()).toEqual([]);
			});

			// The generated create body leaves the key columns out, so a whitelisting pipe drops or refuses the row key before the route.
			it.runIf(pipe === "none" || pipe === "transform").each([[{ id: "B1", slot: { at: SLOT } }], [{ at: SLOT, id: "B1", slot: { at: SLOT } }]])("CREATE with %j writes the slot instant as the key", async (payload: object) => {
				const response: TResponse = await send("POST", "/tenant/T1/booking", payload);

				expect(response.statusCode).toBe(201);
				expect(response.json()).toMatchObject({ at: SLOT, id: "B1", tenantId: "T1" });
				expect(await bookings()).toEqual(["B1"]);
			});

			it.runIf(pipe === "none")("CREATE with a relation instant other than the key the body names answers 400 and adds no row", async () => {
				expect((await send("POST", "/tenant/T1/booking", { at: "2026-01-01T00:00:00.003Z", id: "B1", slot: { at: SLOT } })).statusCode).toBe(400);
				expect(await bookings()).toEqual([]);
			});
		});

		describe.runIf(pipe === "none")("the published body of a relation over several columns", () => {
			let schemas: Record<string, { properties?: Record<string, Record<string, unknown>>; required?: Array<string> }>;

			beforeAll(() => {
				schemas = SwaggerModule.createDocument(app, new DocumentBuilder().build()).components?.schemas as typeof schemas;
			});

			const relationSchema = (dto: string, property: string): { properties?: Record<string, Record<string, unknown>>; required?: Array<string> } => {
				const reference: string = String(schemas[dto]?.properties?.[property]?.$ref ?? (schemas[dto]?.properties?.[property]?.allOf as Array<Record<string, unknown>> | undefined)?.[0]?.$ref);

				return schemas[reference.replace("#/components/schemas/", "")] ?? {};
			};

			it.each([["RowPathKeyTenantChildCreateBodyDTO"], ["RowPathKeyTenantChildPartialUpdateBodyDTO"], ["RowPathKeyTenantChildUpdateBodyDTO"]])("%s publishes the relation as an object with its own join column only", (dto: string) => {
				const parent = relationSchema(dto, "parent");

				expect(Object.keys(parent.properties ?? {})).toEqual(["id"]);
				expect(parent.properties?.id).toMatchObject({ type: "string" });
				expect(parent.required).toEqual(["id"]);
			});

			it("the create body publishes the relation instant as a date and time", () => {
				const slot = relationSchema(driver === "postgres" ? "RowPathPostgresKeyBookingCreateBodyDTO" : "RowPathSqliteKeyBookingCreateBodyDTO", "slot");

				expect(Object.keys(slot.properties ?? {})).toEqual(["at"]);
				expect(slot.properties?.at).toMatchObject({ format: "date-time", type: "string" });
			});

			it("an update body leaves out a relation whose every join column the path or the key fixes", () => {
				const prefix: string = driver === "postgres" ? "RowPathPostgresKeyBooking" : "RowPathSqliteKeyBooking";

				expect(schemas[`${prefix}PartialUpdateBodyDTO`]?.properties?.slot).toBeUndefined();
				expect(schemas[`${prefix}UpdateBodyDTO`]?.properties?.slot).toBeUndefined();
			});
		});

		describe("a date and time key column in the body on a full composite path", () => {
			const STORED: string = "2026-01-01T00:00:00.002Z";
			const PATH: string = `/reading/s1/${STORED}`;
			const literal = (instant: string): string => (driver === "postgres" ? instant : instant.replace("T", " ").replace("Z", ""));

			beforeEach(async () => {
				await dataSource.query("DELETE FROM row_path_key_readings");
				await dataSource.query(`INSERT INTO row_path_key_readings ("sensorId", "recordedAt", "name", "siteId") VALUES ('s1', '${literal(STORED)}', 'own', NULL), ('s1', '${literal("2026-01-01T00:00:00.003Z")}', 'next', NULL)`);
			});

			const names = async (): Promise<Array<unknown>> => (await rows("row_path_key_readings", `"recordedAt"`)).map((row: Record<string, unknown>) => row.name);

			it.each([
				["PATCH", { name: "epoch", recordedAt: Date.parse(STORED) }],
				["PUT", { name: "epoch", recordedAt: Date.parse(STORED) }],
				["PATCH", { name: "offset", recordedAt: "2026-01-01T03:00:00.002+03:00" }],
				["PUT", { name: "offset", recordedAt: "2026-01-01T03:00:00.002+03:00" }],
				["PATCH", { name: "finer", recordedAt: "2026-01-01T00:00:00.0026Z" }],
				["PUT", { name: "finer", recordedAt: "2026-01-01T00:00:00.002999Z" }],
				["PATCH", { name: "padded", recordedAt: "2026-01-01T00:00:00.0020Z" }],
				["PATCH", { name: "number", sensorId: 1 }],
			])("%s with %j answers 400 and neither changes nor adds a row", async (method: string, payload: object) => {
				expect((await send(method, PATH, payload)).statusCode).toBe(400);
				expect(await names()).toEqual(["own", "next"]);
			});

			it.each([["PATCH"], ["PUT"]])("%s with the key the path names writes the addressed row and adds none", async (method: string) => {
				const response: TResponse = await send(method, PATH, { name: "same", recordedAt: STORED, sensorId: "s1" });

				expect(response.statusCode).toBe(equalKeyStatus);
				expect(await names()).toEqual(pipe === "forbid" ? ["own", "next"] : ["same", "next"]);
			});

			it.each([[Date.parse("2026-03-01T00:00:00.123Z")], ["2026-03-01T00:00:00Z"], ["2026-03-01T03:00:00.123+03:00"], [["2026-03-01T00:00:00.123Z"]]])("CREATE with the key instant %j answers 400 and adds no row", async (recordedAt: unknown) => {
				const response: TResponse = await send("POST", "/reading", { name: "created", recordedAt, sensorId: "s2" });

				expect(response.statusCode).toBe(400);
				expect(await names()).toEqual(["own", "next"]);
			});

			// The generated create body leaves the key columns out, so a whitelisting pipe drops or refuses them before the route.
			it.runIf(pipe === "none" || pipe === "transform")("CREATE with a key instant the body spells answers the created row", async () => {
				const response: TResponse = await send("POST", "/reading", { name: "created", recordedAt: "2026-03-01T00:00:00.123Z", sensorId: "s2" });

				expect(response.statusCode).toBe(201);
				expect(response.json()).toMatchObject({ name: "created", recordedAt: "2026-03-01T00:00:00.123Z", sensorId: "s2" });
				expect(await names()).toEqual(["own", "next", "created"]);
			});
		});

		describe.runIf(pipe === "none")("the reload of a written row by its full key", () => {
			const EARLIER: string = "2026-01-01T00:00:00.001Z";
			const LATER: string = "2026-01-01T00:00:00.002Z";
			const literal = (instant: string): string => (driver === "postgres" ? instant : instant.replace("T", " ").replace("Z", ""));

			beforeEach(async () => {
				await dataSource.query("DELETE FROM row_path_key_readings");
				await dataSource.query("DELETE FROM row_path_key_items");
				await dataSource.query("DELETE FROM row_path_key_parents");
				await dataSource.query(`INSERT INTO row_path_key_parents ("id", "name") VALUES ('${PARENT_OWN}', 'site')`);
				await dataSource.query(`INSERT INTO row_path_key_readings ("sensorId", "recordedAt", "name", "siteId") VALUES ('s1', '${literal(EARLIER)}', 'first', NULL), ('s1', '${literal(LATER)}', 'second', '${PARENT_OWN}')`);
			});

			// Postgres sets the instant itself, so only the inserted row knows it.
			it.runIf(driver === "postgres")("CREATE answers the created row beside a row that shares the other key columns", async () => {
				const response: TResponse = await send("POST", "/reading", { name: "third", sensorId: "s1" });

				expect(response.statusCode).toBe(201);
				expect((response.json() as { name: string }).name).toBe("third");
				expect(await rows("row_path_key_readings", `"recordedAt"`)).toHaveLength(3);
			});

			it.each([["PATCH"], ["PUT"]])("%s with a response relation load answers the addressed row", async (method: string) => {
				const response: TResponse = await send(method, `/reading/s1/${LATER}`, { name: "changed" });

				expect(response.statusCode).toBe(200);
				expect(response.json()).toMatchObject({ name: "changed", recordedAt: LATER, site: { id: PARENT_OWN } });
				expect((await rows("row_path_key_readings", `"recordedAt"`)).map((row: Record<string, unknown>) => row.name)).toEqual(["first", "changed"]);
			});

			it("a custom route with a response relation load answers the row it returned", async () => {
				const response: TResponse = await send("GET", "/reading/by-name/s1/second");

				expect(response.statusCode).toBe(200);
				expect(response.json()).toMatchObject({ name: "second", recordedAt: LATER, site: { id: PARENT_OWN } });
			});
		});
	});
});
