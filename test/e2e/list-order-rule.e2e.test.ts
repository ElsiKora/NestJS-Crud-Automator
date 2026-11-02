import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger } from "typeorm";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eListOrderRuleItemController, E2eListOrderRuleItemEntity, E2eListOrderRuleItemService, E2eListOrderRuleTypedItemController } from "./list-order-rule";

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
			const entities: Array<new () => unknown> = [E2eListOrderRuleItemEntity];
			const connection = { dropSchema: true, entities, logger: queryLogger, logging: true, synchronize: true } as const;
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eListOrderRuleItemController, E2eListOrderRuleTypedItemController],
				imports: [TypeOrmModule.forRoot(container ? { ...connection, type: "postgres", url: container.getConnectionUri() } : { ...connection, database: ":memory:", type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eListOrderRuleItemService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();

			await app.get(E2eListOrderRuleItemService).repository.save([
				{ label: "Alpha", rank: 2, secret: 30 },
				{ label: "Beta", rank: 1, secret: 10 },
				{ label: "Gamma", rank: 3, secret: 20 },
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
			expect(await listLabels(`${path}?${PAGE}&orderBy=rank&orderDirection=asc`)).toEqual(["Beta", "Alpha", "Gamma"]);
			await expectRejected(`${path}?${PAGE}&orderBy=rank&orderDirection=ASC`);
			await expectRejected(`${path}?${PAGE}&orderBy=rank&orderDirection=Desc`);
		});
	});
});
