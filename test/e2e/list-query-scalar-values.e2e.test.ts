import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger } from "typeorm";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { EE2eListScalarLevel, E2eListScalarAccountEntity, E2eListScalarCreateKeyController, E2eListScalarCursorKeyController, E2eListScalarDefaultKeyController, E2eListScalarKeyEntity, E2eListScalarKeyService, E2eListScalarManualKeyController, E2eListScalarPageKeyController } from "./list-query-scalar";

class ScalarQueryLogger implements Logger {
	public readonly queries: Array<string> = [];

	public log(): void {}

	public logMigration(): void {}

	public logQuery(query: string): void {
		this.queries.push(query);
	}

	public logQueryError(_error: Error | string, query: string): void {
		this.queries.push(query);
	}

	public logQuerySlow(): void {}

	public logSchemaBuild(): void {}
}

interface IHostPipeCase {
	createPipe?: () => ValidationPipe;
	name: string;
}

interface IScalarRoute {
	columns: ReadonlyArray<string>;
	isPostgresOnly: boolean;
	url: string;
}

const ACCOUNT_ID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const KEY_IDS: ReadonlyArray<string> = ["00000000-0000-4000-8000-000000000001", "00000000-0000-4000-8000-000000000002", "00000000-0000-4000-8000-000000000003"];
// A route without a typed filter publishes no filter on the primary key, and CURSOR v1 runs on PostgreSQL only.
const ROUTES: ReadonlyArray<IScalarRoute> = [
	{ columns: ["amount", "accountId", "account.id", "level", "price"], isPostgresOnly: false, url: "/list-scalar/default-keys?limit=10&page=1" },
	{ columns: ["amount", "accountId", "account.id"], isPostgresOnly: false, url: "/list-scalar/manual-keys?limit=10&page=1" },
	{ columns: ["amount", "id", "accountId", "account.id", "level", "price"], isPostgresOnly: false, url: "/list-scalar/page-keys?limit=10&page=1" },
	{ columns: ["amount", "id", "accountId", "account.id", "level", "price"], isPostgresOnly: true, url: "/list-scalar/cursor-keys?limit=10" },
];

const getRejectedQueries = (columns: ReadonlyArray<string>): Array<string> =>
	columns.flatMap((column: string): Array<string> => [
		`${column}[operator]=eq&${column}[value]=`,
		`${column}[operator]=in&${column}[values]=`,
		`${column}[operator]=ne&${column}[value]=`,
		`${column}[operator]=cont&${column}[value]=`,
		`${column}[operator]=gte&${column}[value]=null`,
		`${column}[operator]=eq&${column}[value]=null`,
		`${column}[operator]=eq&${column}[value]=undefined`,
		`${column}[operator]=eq&${column}[value]=a&${column}[value]=b`,
		`${column}[operator]=eq&${column}[value]=not-a-number-or-uuid`,
		`${column}[operator]=in&${column}[values]=${KEY_IDS[0] ?? ""}&${column}[values]=`,
	]);

// A numeric enum publishes its members as numbers, and a query string carries them as text; nothing but that text stands for a member.
const LEVEL_REJECTED_QUERIES: ReadonlyArray<string> = ["level[operator]=eq&level[value]=3", "level[operator]=eq&level[value]=1.0", "level[operator]=eq&level[value]=01", "level[operator]=eq&level[value]=%201", "level[operator]=eq&level[value]=1e0", "level[operator]=eq&level[value]=LOW", "level[operator]=ne&level[value]=3", "level[operator]=in&level[values]=1&level[values]=3", "level[operator]=gt&level[value]=1"];
const PRICE_REJECTED_QUERIES: ReadonlyArray<string> = ["price[operator]=eq&price[value]=1.005", "price[operator]=eq&price[value]=0.015", "price[operator]=gte&price[value]=1.005", "price[operator]=in&price[values]=1.5&price[values]=1.005"];

const ACCEPTED_CASES: ReadonlyArray<{ column: string; count: number; query: string }> = [
	{ column: "amount", count: 1, query: "amount[operator]=eq&amount[value]=2" },
	{ column: "level", count: 2, query: "level[operator]=eq&level[value]=1" },
	{ column: "level", count: 1, query: "level[operator]=ne&level[value]=1" },
	{ column: "level", count: 3, query: "level[operator]=in&level[values]=1&level[values]=2" },
	{ column: "level", count: 1, query: "level[operator]=in&level[values]=2" },
	{ column: "price", count: 1, query: "price[operator]=eq&price[value]=1.5" },
	{ column: "price", count: 1, query: "price[operator]=eq&price[value]=0.1" },
	{ column: "price", count: 2, query: "price[operator]=gte&price[value]=1.5" },
	{ column: "price", count: 2, query: "price[operator]=in&price[values]=0.1&price[values]=1.5" },
	{ column: "amount", count: 2, query: "amount[operator]=in&amount[values]=1&amount[values]=3" },
	{ column: "id", count: 1, query: `id[operator]=eq&id[value]=${KEY_IDS[1] ?? ""}` },
	{ column: "accountId", count: 2, query: `accountId[operator]=eq&accountId[value]=${ACCOUNT_ID}` },
	{ column: "account.id", count: 2, query: `account.id[operator]=eq&account.id[value]=${ACCOUNT_ID}` },
];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("GET_LIST number and uuid filter values on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<IHostPipeCase>([{ name: "no host pipe" }, { createPipe: () => new ValidationPipe(), name: "a default host ValidationPipe" }, { createPipe: () => new ValidationPipe({ transform: true, whitelist: true }), name: "a transforming, whitelisting host ValidationPipe" }])("with $name", ({ createPipe }: IHostPipeCase) => {
		let app: INestApplication | undefined;
		let fastify: { inject: (options: { headers?: Record<string, string>; method: string; payload?: object; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		const queryLogger: ScalarQueryLogger = new ScalarQueryLogger();

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eListScalarAccountEntity, E2eListScalarKeyEntity];
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eListScalarCreateKeyController, E2eListScalarDefaultKeyController, E2eListScalarManualKeyController, E2eListScalarPageKeyController, E2eListScalarCursorKeyController],
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eListScalarKeyService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();

			const dataSource = app.get(E2eListScalarKeyService).repository.manager;

			await dataSource.save(E2eListScalarAccountEntity, { id: ACCOUNT_ID, name: "Main" });
			await dataSource.save(E2eListScalarKeyEntity, [
				{ accountId: ACCOUNT_ID, amount: 1, id: KEY_IDS[0], label: "Alpha", level: EE2eListScalarLevel.LOW, price: 0.1 },
				{ accountId: null, amount: 2, id: KEY_IDS[1], label: "Beta", level: EE2eListScalarLevel.HIGH, price: 1.5 },
				{ accountId: ACCOUNT_ID, amount: 3, id: KEY_IDS[2], label: "Gamma", level: EE2eListScalarLevel.LOW, price: 2.25 },
			]);
		});

		beforeEach(() => {
			queryLogger.queries.length = 0;
		});

		afterAll(async () => {
			await app?.close();
		});

		// Without a host pipe a generated route does not validate its body.
		it.runIf(createPipe !== undefined)("holds a request body to the same decimal multipleOf", async () => {
			const payload = { amount: 1, label: "Delta", level: EE2eListScalarLevel.HIGH };
			const rejected = await fastify.inject({ headers: { "content-type": "application/json" }, method: "POST", payload: { ...payload, price: 1.005 }, url: "/list-scalar/create-keys" });

			expect(rejected.statusCode, JSON.stringify(rejected.json())).toBe(HttpStatus.BAD_REQUEST);
			expect((rejected.json() as { message: Array<string> }).message).toEqual(["price must be divisible by 0.01"]);

			const accepted = await fastify.inject({ headers: { "content-type": "application/json" }, method: "POST", payload: { ...payload, price: 0.1 }, url: "/list-scalar/create-keys" });

			expect((accepted.json() as { message?: unknown }).message ?? [], JSON.stringify(accepted.json())).not.toContain("price must be divisible by 0.01");
		});

		describe.each(ROUTES.filter((route: IScalarRoute): boolean => isPostgres || !route.isPostgresOnly))("on $url", ({ columns, url }: IScalarRoute) => {
			it.each(ACCEPTED_CASES.filter(({ column }: { column: string }): boolean => columns.includes(column)))("filters by $query", async ({ count, query }: { count: number; query: string }) => {
				const response = await fastify.inject({ method: "GET", url: `${url}&${query}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect((response.json() as { items: Array<unknown> }).items).toHaveLength(count);
			});

			it.each([...getRejectedQueries(columns), ...(columns.includes("level") ? LEVEL_REJECTED_QUERIES : []), ...(columns.includes("price") ? PRICE_REJECTED_QUERIES : [])])("answers %s with 400 before any SQL", async (query: string) => {
				const response = await fastify.inject({ method: "GET", url: `${url}&${query}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(response.json()).toEqual({ error: "Bad Request", message: expect.anything(), statusCode: HttpStatus.BAD_REQUEST });
				expect(queryLogger.queries).toEqual([]);
			});
		});
	});
});
