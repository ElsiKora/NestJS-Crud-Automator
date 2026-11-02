import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger } from "typeorm";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eListOrderRuleAllowHiddenItemController, E2eListOrderRuleDefaultDirectionItemController, E2eListOrderRuleDefaultOrderItemController, E2eListOrderRuleItemController, E2eListOrderRuleItemEntity, E2eListOrderRuleItemService, E2eListOrderRuleManualItemController, E2eListOrderRuleOwnerEntity, E2eListOrderRulePlainCustomController, E2eListOrderRuleTypedItemController, E2eListOrderRuleVariantController } from "./list-order-rule";

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

const getOrderByEnum = (document: OpenAPIObject, path: string): Array<unknown> | undefined => (document.paths[path]?.get?.parameters as Array<{ name: string; schema?: { enum?: Array<unknown> } }> | undefined)?.find((candidate: { name: string }): boolean => candidate.name === "orderBy")?.schema?.enum;

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
		let document: OpenAPIObject;
		let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		const queryLogger: ListOrderRuleLogger = new ListOrderRuleLogger();

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eListOrderRuleItemEntity, E2eListOrderRuleOwnerEntity];
			const connection = { dropSchema: true, entities, logger: queryLogger, logging: true, synchronize: true } as const;
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eListOrderRuleAllowHiddenItemController, E2eListOrderRuleDefaultDirectionItemController, E2eListOrderRuleDefaultOrderItemController, E2eListOrderRuleItemController, E2eListOrderRuleManualItemController, E2eListOrderRulePlainCustomController, E2eListOrderRuleTypedItemController, E2eListOrderRuleVariantController],
				imports: [TypeOrmModule.forRoot(container ? { ...connection, type: "postgres", url: container.getConnectionUri() } : { ...connection, database: ":memory:", type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eListOrderRuleItemService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();
			document = SwaggerModule.createDocument(app, new DocumentBuilder().build());

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

		it.each(["secret", "missing", "owner", "owner.level"])("rejects orderBy=%s on a manual QUERY DTO without any query", async (field: string) => {
			expect(await expectRejected(`${MANUAL_ITEMS}?${PAGE}&orderBy=${field}&orderDirection=asc`)).toContain("INVALID_ORDER");
		});

		it("rejects a repeated orderBy on a manual QUERY DTO without any query", async () => {
			await expectRejected(`${MANUAL_ITEMS}?${PAGE}&orderBy=rank&orderBy=label&orderDirection=asc`);
		});

		it("applies the orderable rule to a field a manual QUERY DTO allows", async () => {
			expect(await expectRejected(`/list-order-rule/allow-hidden-items?${PAGE}&orderBy=secret&orderDirection=asc`)).toContain("INVALID_ORDER");
			expect(await expectRejected(`/list-order-rule/allow-hidden-items?${PAGE}&orderBy=rank&orderDirection=asc`)).toContain("orderBy must be one of the following values: secret");
		});

		it("orders a manual QUERY DTO by an orderable field", async () => {
			expect(await listLabels(`${MANUAL_ITEMS}?${PAGE}&orderBy=rank&orderDirection=asc`)).toEqual(["Beta", "Alpha", "Gamma", "Delta"]);
		});

		it("keeps a manual QUERY DTO class default as the route's own order, which a client cannot name", async () => {
			expect(await listLabels(`/list-order-rule/default-order-items?${PAGE}`)).toEqual(["Beta", "Gamma", "Alpha", "Delta"]);
			expect(await expectRejected(`/list-order-rule/default-order-items?${PAGE}&orderBy=secret&orderDirection=desc`)).toContain("INVALID_ORDER");
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

		if (createPipe) {
			it.each(["orderBy=label", "orderDirection=asc"])("rejects %s alone through the DTO of a custom route under a host pipe", async (order: string) => {
				const response = await fastify.inject({ method: "GET", url: `/list-order-rule/plain-custom?${PAGE}&${order}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(JSON.stringify(response.json())).toContain("INVALID_ORDER");
			});
		}

		it("limits a custom route with response variants to the fields every variant publishes", () => {
			expect(getOrderByEnum(document, "/list-order-rule/variants")).toEqual(["label"]);
		});

		it.runIf(createPipe !== undefined)("validates the order of a custom route with response variants", async () => {
			expect(await expectRejected(`/list-order-rule/variants?${PAGE}&orderBy=rank&orderDirection=asc`)).toContain("orderBy must be one of the following values: label");
			expect((await fastify.inject({ method: "GET", url: `/list-order-rule/variants?${PAGE}&orderBy=label&orderDirection=asc` })).statusCode).toBe(HttpStatus.OK);
		});

		it("completes a one-sided order from a manual QUERY DTO class default", async () => {
			expect(await listLabels(`${DEFAULT_DIRECTION_ITEMS}?${PAGE}&orderBy=rank`)).toEqual(["Delta", "Gamma", "Alpha", "Beta"]);
		});
	});
});
