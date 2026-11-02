import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSource } from "typeorm";

import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import type { TRowPathFixture } from "./row-path/fixture";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { createRowPathFixture } from "./row-path/fixture";

type TDriver = "postgres" | "sqlite";
type TResponse = { body: string; json: () => unknown; statusCode: number };

const FOREIGN_ITEM_ID: string = "22222222-2222-4222-8222-222222222222";
const MICROSECOND_TIMESTAMP: string = "2026-01-01 00:00:00.123456";
const OWN_ITEM_ID: string = "11111111-1111-4111-8111-111111111111";

describe.each<TDriver>(["postgres", "sqlite"])("generated row routes on %s (E2E)", (driver: TDriver) => {
	let app: INestApplication;
	let container: StartedPostgreSqlContainer | undefined;
	let dataSource: DataSource;
	let fastify: { inject: (options: object) => Promise<TResponse> };

	const send = async (method: string, url: string, payload?: object): Promise<TResponse> => await fastify.inject({ headers: payload ? { "content-type": "application/json" } : {}, method, payload, url });

	const rows = async (table: string, order: string): Promise<Array<Record<string, unknown>>> => (await dataSource.query(`SELECT * FROM ${table} ORDER BY ${order}`)) as Array<Record<string, unknown>>;

	beforeAll(async () => {
		const isPostgres: boolean = driver === "postgres";
		const fixture: TRowPathFixture = createRowPathFixture(isPostgres ? { type: "timestamptz", widePrecision: 6 } : { type: "datetime" });

		container = isPostgres ? await new PostgreSqlContainer("postgres:17-alpine").start() : undefined;

		const reference = await Test.createTestingModule({
			imports: [ApiAuthorizationModule.forRoot({}), ApiSubscriberModule, TypeOrmModule.forRoot(container ? { entities: [...fixture.entities], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", entities: [...fixture.entities], synchronize: true, type: "better-sqlite3" }), fixture.module],
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
});
