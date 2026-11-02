import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger } from "typeorm";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eListOrderRuleDefaultDirectionItemController, E2eListOrderRuleItemController, E2eListOrderRuleItemEntity, E2eListOrderRuleItemService, E2eListOrderRuleManualItemController, E2eListOrderRuleOwnerEntity, E2eListOrderRuleTypedItemController } from "./list-order-rule";

class ListOrderRuleLogger implements Logger {
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

const PAGE: string = "limit=10&page=1";
const ITEMS: string = "/list-order-rule/items";
const TYPED_ITEMS: string = "/list-order-rule/typed-items";
const MANUAL_ITEMS: string = "/list-order-rule/manual-items";
const DEFAULT_DIRECTION_ITEMS: string = "/list-order-rule/default-direction-items";

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("GET_LIST order and filter rules on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<IHostPipeCase>([{ name: "no host pipe" }, { createPipe: () => new ValidationPipe(), name: "a default host ValidationPipe" }])("with $name", ({ createPipe }: IHostPipeCase) => {
		let app: INestApplication | undefined;
		let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		const queryLogger: ListOrderRuleLogger = new ListOrderRuleLogger();

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eListOrderRuleItemEntity, E2eListOrderRuleOwnerEntity];
			const connection = { dropSchema: true, entities, logger: queryLogger, logging: true, synchronize: true } as const;
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eListOrderRuleDefaultDirectionItemController, E2eListOrderRuleItemController, E2eListOrderRuleManualItemController, E2eListOrderRuleTypedItemController],
				imports: [TypeOrmModule.forRoot(container ? { ...connection, type: "postgres", url: container.getConnectionUri() } : { ...connection, database: ":memory:", type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eListOrderRuleItemService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();

			const owner: E2eListOrderRuleOwnerEntity = await app.get(DataSource).getRepository(E2eListOrderRuleOwnerEntity).save({ level: 1 });

			await app.get(E2eListOrderRuleItemService).repository.save([
				{ label: "Alpha", rank: 2, secret: 30 },
				{ label: "Beta", owner, rank: 1, secret: 10 },
				{ label: "Gamma", rank: 3, secret: 20 },
				{ label: "Delta", rank: 100, secret: 40 },
			] as Array<E2eListOrderRuleItemEntity>);
		}, 120_000);

		afterAll(async () => {
			await app?.close();
		});

		const listLabels = async (url: string): Promise<Array<string>> => {
			const response = await fastify.inject({ method: "GET", url });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);

			return (response.json() as { items: Array<{ label: string }> }).items.map(({ label }: { label: string }): string => label);
		};

		const expectRejected = async (url: string): Promise<string> => {
			queryLogger.queries.length = 0;
			const response = await fastify.inject({ method: "GET", url });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(queryLogger.queries).toEqual([]);

			return JSON.stringify((response.json() as { message: unknown }).message);
		};

		it.each([ITEMS, TYPED_ITEMS])("takes only a lowercase order direction on %s", async (path: string) => {
			expect(await listLabels(`${path}?${PAGE}&orderBy=rank&orderDirection=asc`)).toEqual(["Beta", "Alpha", "Gamma", "Delta"]);
			await expectRejected(`${path}?${PAGE}&orderBy=rank&orderDirection=ASC`);
			await expectRejected(`${path}?${PAGE}&orderBy=rank&orderDirection=Desc`);
		});

		it.each([ITEMS, TYPED_ITEMS, MANUAL_ITEMS])("rejects a one-sided order on %s", async (path: string) => {
			expect(await expectRejected(`${path}?${PAGE}&orderBy=rank`)).toContain("INVALID_ORDER");
			expect(await expectRejected(`${path}?${PAGE}&orderDirection=asc`)).toContain("INVALID_ORDER");
		});

		it.each(["", "%20"])("rejects the blank numeric filter value '%s' before any query", async (value: string) => {
			await expectRejected(`${ITEMS}?${PAGE}&rank[operator]=eq&rank[value]=${value}`);
			await expectRejected(`${ITEMS}?${PAGE}&rank[operator]=in&rank[values]=${value}&rank[values]=1`);
			await expectRejected(`${ITEMS}?${PAGE}&rank[operator]=between&rank[values]=${value}&rank[values]=2`);
			await expectRejected(`${ITEMS}?${PAGE}&owner.level[operator]=eq&owner.level[value]=${value}`);
		});

		it("binds the parsed number of a numeric filter value on a route without a typed filter", async () => {
			const ordered: string = `${ITEMS}?${PAGE}&orderBy=rank&orderDirection=asc`;

			expect(await listLabels(`${ordered}&rank[operator]=eq&rank[value]=1e2`)).toEqual(["Delta"]);
			expect(await listLabels(`${ordered}&rank[operator]=eq&rank[value]=1.0`)).toEqual(["Beta"]);
			expect(await listLabels(`${ordered}&rank[operator]=gt&rank[value]=2.0`)).toEqual(["Gamma", "Delta"]);
			expect(await listLabels(`${ordered}&rank[operator]=in&rank[values]=1.0&rank[values]=1e2`)).toEqual(["Beta", "Delta"]);
			expect(await listLabels(`${ordered}&rank[operator]=in&rank[values]=2.0`)).toEqual(["Alpha"]);
			expect(await listLabels(`${ordered}&rank[operator]=between&rank[values]=1.0&rank[values]=2e0`)).toEqual(["Beta", "Alpha"]);
			expect(await listLabels(`${ordered}&owner.level[operator]=eq&owner.level[value]=1.0`)).toEqual(["Beta"]);
		});

		it("gives the same answer to a numeric filter value as a typed filter", async () => {
			const ordered: string = `${TYPED_ITEMS}?${PAGE}&orderBy=rank&orderDirection=asc`;

			expect(await listLabels(`${ordered}&rank[operator]=eq&rank[value]=1e2`)).toEqual(["Delta"]);
			expect(await listLabels(`${ordered}&rank[operator]=eq&rank[value]=1.0`)).toEqual(["Beta"]);
			await expectRejected(`${TYPED_ITEMS}?${PAGE}&rank[operator]=eq&rank[value]=`);
			await expectRejected(`${TYPED_ITEMS}?${PAGE}&rank[operator]=eq&rank[value]=%20`);
		});

		it("completes a one-sided order from a manual QUERY DTO class default", async () => {
			expect(await listLabels(`${DEFAULT_DIRECTION_ITEMS}?${PAGE}&orderBy=rank`)).toEqual(["Delta", "Gamma", "Alpha", "Beta"]);
		});
	});
});
