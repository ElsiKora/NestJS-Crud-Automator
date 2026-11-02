import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";

import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { TRowPathDriver, TRowPathFixture } from "./row-path/fixture";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { ROW_PATH_FIXTURES } from "./row-path/fixture";

type TResponse = { body: string; json: () => unknown; statusCode: number };

const FOREIGN_ITEM_ID: string = "22222222-2222-4222-8222-222222222222";
const MICROSECOND_TIMESTAMP: string = "2026-01-01 00:00:00.123456";
const OWN_ITEM_ID: string = "11111111-1111-4111-8111-111111111111";

describe.each<TRowPathDriver>(["postgres", "sqlite"])("generated row routes on %s (E2E)", (driver: TRowPathDriver) => {
	let app: INestApplication;
	let container: StartedPostgreSqlContainer | undefined;
	let dataSource: DataSource;
	let fastify: { inject: (options: object) => Promise<TResponse> };

	const send = async (method: string, url: string, payload?: object): Promise<TResponse> => await fastify.inject({ headers: payload ? { "content-type": "application/json" } : {}, method, payload, url });

	const rows = async (table: string, order: string): Promise<Array<Record<string, unknown>>> => (await dataSource.query(`SELECT * FROM ${table} ORDER BY ${order}`)) as Array<Record<string, unknown>>;

	beforeAll(async () => {
		const fixture: TRowPathFixture = ROW_PATH_FIXTURES[driver];

		container = driver === "postgres" ? await new PostgreSqlContainer("postgres:17-alpine").start() : undefined;

		const reference = await Test.createTestingModule({
			imports: [ApiAuthorizationModule.forRoot({}), ApiSubscriberModule, TypeOrmModule.forRoot(container ? { entities: fixture.entities, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", entities: fixture.entities, synchronize: true, type: "better-sqlite3" }), fixture.module],
		}).compile();

		app = reference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance() as { inject: (options: object) => Promise<TResponse> };
		dataSource = app.get<DataSource>(getDataSourceToken());
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	describe("composite key", () => {
		beforeEach(async () => {
			await dataSource.query("DELETE FROM row_path_probes");
			await dataSource.query(`INSERT INTO row_path_probes ("tenantId", "id", "name") VALUES ('shared', 'row-1', 'one'), ('shared', 'row-2', 'two'), ('other', 'row-3', 'three')`);
		});

		it("reaches every row by all key columns", async () => {
			const first: TResponse = await send("GET", "/probe/row-1/shared");
			const second: TResponse = await send("GET", "/probe/row-2/shared");

			expect(first.statusCode).toBe(200);
			expect((first.json() as { name: string }).name).toBe("one");
			expect(second.statusCode).toBe(200);
			expect((second.json() as { name: string }).name).toBe("two");
		});

		it("does not route a partial key", async () => {
			for (const method of ["GET", "PATCH", "PUT", "DELETE"]) {
				expect((await send(method, "/probe/row-1", method === "PATCH" || method === "PUT" ? { name: "changed" } : undefined)).statusCode).toBe(404);
			}
		});

		it("changes and deletes only the addressed row", async () => {
			expect((await send("PATCH", "/probe/row-2/shared", { name: "changed" })).statusCode).toBe(200);
			expect(await rows("row_path_probes", `"id"`)).toEqual([
				{ id: "row-1", name: "one", tenantId: "shared" },
				{ id: "row-2", name: "changed", tenantId: "shared" },
				{ id: "row-3", name: "three", tenantId: "other" },
			]);
			expect((await send("DELETE", "/probe/row-2/shared")).statusCode).toBe(204);
			expect((await rows("row_path_probes", `"id"`)).map((row: Record<string, unknown>): unknown => row.id)).toEqual(["row-1", "row-3"]);
		});
	});

	describe("writes under a parent path parameter", () => {
		beforeEach(async () => {
			await dataSource.query("DELETE FROM row_path_items");
			await dataSource.query(`INSERT INTO row_path_items ("id", "name", "parentId") VALUES ('${OWN_ITEM_ID}', 'orig', 'p1'), ('${FOREIGN_ITEM_ID}', 'orig', 'p2')`);
		});

		it.each([
			["PATCH", { name: "changed" }],
			["PUT", { name: "changed" }],
			["DELETE", undefined],
		])("%s answers 404 for a row of another parent and leaves it untouched", async (method: string, payload: object | undefined) => {
			expect((await send(method, `/parent/p1/item/${FOREIGN_ITEM_ID}`, payload)).statusCode).toBe(404);
			expect(await rows("row_path_items", `"id"`)).toEqual([
				{ id: OWN_ITEM_ID, name: "orig", parentId: "p1" },
				{ id: FOREIGN_ITEM_ID, name: "orig", parentId: "p2" },
			]);
		});

		it("GET answers 404 for a row of another parent", async () => {
			expect((await send("GET", `/parent/p1/item/${FOREIGN_ITEM_ID}`)).statusCode).toBe(404);
		});

		it("CREATE refuses a body naming another parent", async () => {
			expect((await send("POST", "/parent/p1/item", { name: "new", parentId: "p2" })).statusCode).toBe(400);
			expect(await rows("row_path_items", `"id"`)).toHaveLength(2);
		});
	});

	describe("a key column left out of the path holding a finer value than a millisecond", () => {
		beforeEach(async () => {
			await dataSource.query("DELETE FROM row_path_transactions");
			await dataSource.query(`INSERT INTO row_path_transactions ("id", "createdAt", "name") VALUES ('a', '${MICROSECOND_TIMESTAMP}', 'orig')`);
		});

		it.each([
			["PATCH", { name: "changed" }],
			["PUT", { name: "changed" }],
			["DELETE", undefined],
		])("%s answers 500 before any change", async (method: string, payload: object | undefined) => {
			const before: Array<Record<string, unknown>> = await rows("row_path_transactions", `"createdAt"`);

			expect((await send(method, "/transaction/a", payload)).statusCode).toBe(500);
			expect(await rows("row_path_transactions", `"createdAt"`)).toEqual(before);
		});

		it("GET still reads the row", async () => {
			const response: TResponse = await send("GET", "/transaction/a");

			expect(response.statusCode).toBe(200);
			expect((response.json() as { name: string }).name).toBe("orig");
		});
	});

	describe("a reduced key naming more than one row", () => {
		beforeEach(async () => {
			await dataSource.query("DELETE FROM row_path_transactions");
			await dataSource.query(`INSERT INTO row_path_transactions ("id", "createdAt", "name") VALUES ('a', '2026-01-01 00:00:00.000', 'first'), ('a', '2026-01-02 00:00:00.000', 'second')`);
		});

		it.each([
			["GET", undefined],
			["PATCH", { name: "changed" }],
			["PUT", { name: "changed" }],
			["DELETE", undefined],
		])("%s answers 500 before any change", async (method: string, payload: object | undefined) => {
			const before: Array<Record<string, unknown>> = await rows("row_path_transactions", `"createdAt"`);
			const response: TResponse = await send(method, "/transaction/a", payload);

			expect(response.statusCode).toBe(500);
			expect(response.body).not.toContain("first");
			expect(await rows("row_path_transactions", `"createdAt"`)).toEqual(before);
		});
	});

	describe.each(
		driver === "postgres"
			? [
					["transaction", "row_path_transactions"],
					["local-transaction", "row_path_local_transactions"],
				]
			: [["transaction", "row_path_transactions"]],
	)("rows of /%s whose key instants differ only below a millisecond", (path: string, table: string) => {
		const literal = (fraction: string): string => `2026-01-01 00:00:00.${fraction}`;

		it.each([
			["123", "123456", "GET", undefined],
			["123", "123456", "PATCH", { name: "changed" }],
			["123", "123456", "PUT", { name: "changed" }],
			["123", "123456", "DELETE", undefined],
			["123456", "123789", "GET", undefined],
			["123456", "123789", "PATCH", { name: "changed" }],
			["123456", "123789", "PUT", { name: "changed" }],
			["123456", "123789", "DELETE", undefined],
		])("count as two rows: .%s and .%s, %s answers 500 before any change", async (first: string, second: string, method: string, payload: object | undefined) => {
			await dataSource.query(`DELETE FROM ${table}`);
			await dataSource.query(`INSERT INTO ${table} ("id", "createdAt", "name") VALUES ('d', '${literal(first)}', 'first'), ('d', '${literal(second)}', 'second')`);
			const before: Array<Record<string, unknown>> = await rows(table, `"createdAt"`);
			const response: TResponse = await send(method, `/${path}/d`, payload);

			expect(response.statusCode).toBe(500);
			expect(response.body).not.toContain("first");
			expect(await rows(table, `"createdAt"`)).toEqual(before);
		});
	});

	describe("the reload after CREATE on a key column left out of the path", () => {
		beforeEach(async () => {
			await dataSource.query("DELETE FROM row_path_transactions");
			await dataSource.query(`INSERT INTO row_path_transactions ("id", "createdAt", "name") VALUES ('a', '2026-01-01 00:00:00.000', 'old')`);
		});

		// Postgres sets a microsecond instant the inserted row returns only to the millisecond, so the reload matches that whole millisecond with the other key columns and never reads the sibling.
		it.runIf(driver === "postgres")("answers the created row when the other key columns also name a sibling row", async () => {
			const response: TResponse = await send("POST", "/transaction", { id: "a", name: "new" });

			expect(response.statusCode).toBe(201);
			expect((response.json() as { name: string }).name).toBe("new");
			expect(response.body).not.toContain("old");
			expect(await rows("row_path_transactions", `"createdAt"`)).toHaveLength(2);
		});

		it.runIf(driver === "postgres")("answers the created row when no sibling shares the other key columns", async () => {
			const response: TResponse = await send("POST", "/transaction", { id: "b", name: "new" });

			expect(response.statusCode).toBe(201);
			expect((response.json() as { name: string }).name).toBe("new");
		});
	});

	describe.each([
		["UTC", 0],
		["Asia/Tokyo", -540],
		["America/New_York", 300],
	])("a date and time key column in the path, in a %s process", (timeZone: string, offset: number) => {
		const INSTANT: string = "2026-01-15T05:06:07.123Z";
		const LITERAL: string = driver === "postgres" ? INSTANT : "2026-01-15 05:06:07.123";
		const previousTimeZone: string | undefined = process.env.TZ;

		beforeAll(() => {
			process.env.TZ = timeZone;
		});

		afterAll(() => {
			if (previousTimeZone === undefined) {
				delete process.env.TZ;
			} else {
				process.env.TZ = previousTimeZone;
			}
		});

		beforeEach(async () => {
			await dataSource.query("DELETE FROM row_path_ledgers");
			await dataSource.query(`INSERT INTO row_path_ledgers ("id", "createdAt", "name") VALUES ('a', '${LITERAL}', 'orig')`);
		});

		it("runs in that time zone", () => {
			expect(new Date(INSTANT).getTimezoneOffset()).toBe(offset);
		});

		it("reads the row by its exact instant and no other", async () => {
			const response: TResponse = await send("GET", `/ledger/a/${INSTANT}`);

			expect(response.statusCode).toBe(200);
			expect(response.json()).toMatchObject({ createdAt: INSTANT, id: "a", name: "orig" });
			expect((await send("GET", "/ledger/a/2026-01-15T05:06:07.124Z")).statusCode).toBe(404);
		});

		it("writes the row in place", async () => {
			expect((await send("PATCH", `/ledger/a/${INSTANT}`, { name: "patched" })).statusCode).toBe(200);
			expect((await send("PUT", `/ledger/a/${INSTANT}`, { name: "put" })).statusCode).toBe(200);
			expect(await rows("row_path_ledgers", `"id"`)).toEqual([expect.objectContaining({ id: "a", name: "put" })]);
			expect((await send("DELETE", `/ledger/a/${INSTANT}`)).statusCode).toBe(204);
			expect(await rows("row_path_ledgers", `"id"`)).toEqual([]);
		});

		it.each([["2026-01-15T05:06:07Z"], ["2026-01-15"], ["2026-01-15T14:06:07.123%2B09:00"], ["2026-01-15T05:06:07.123"], ["garbage"], ["2026-13-45T05:06:07.123Z"]])("refuses the form %s", async (form: string) => {
			expect((await send("GET", `/ledger/a/${form}`)).statusCode).toBe(400);
			expect((await send("PATCH", `/ledger/a/${form}`, { name: "x" })).statusCode).toBe(400);
			expect((await send("DELETE", `/ledger/a/${form}`)).statusCode).toBe(400);
			expect(await rows("row_path_ledgers", `"id"`)).toEqual([expect.objectContaining({ id: "a", name: "orig" })]);
		});
	});
});
