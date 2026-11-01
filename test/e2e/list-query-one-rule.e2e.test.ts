import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { TSwaggerSchemaObject } from "@type/swagger";
import type { Logger } from "typeorm";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eLegacyQueryItemController, E2eLegacyQueryItemEntity, E2eLegacyQueryItemService, E2eLegacyQueryTypedItemController, EE2eLegacyQueryStatus } from "./legacy-query";

class ListQueryLogger implements Logger {
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

interface IListPathCase {
	name: string;
	path: string;
}

const PAGE: string = "limit=10&page=1";
const LEGACY_PATH: string = "/legacy-query/items";
const TYPED_PATH: string = "/legacy-query/typed-items";

const REJECTED_QUERIES: Array<string> = [
	`${PAGE}&orderBy=label&orderDirection=ASC`,
	`${PAGE}&orderBy=label&orderDirection=Desc`,
	`${PAGE}&orderBy=label`,
	`${PAGE}&orderDirection=asc`,
	`${PAGE}&rank[operator]=eq&rank[value]=5000`,
	`${PAGE}&rank[operator]=eq&rank[value]=-1`,
	`${PAGE}&label[operator]=cont&label[value]=%25%25`,
	`${PAGE}&label[operator]=eq&label[value]=${"a".repeat(65)}`,
	`${PAGE}&rank[operator]=between&rank[values]=1`,
	`${PAGE}&rank[operator]=eq&rank[values]=1`,
	`${PAGE}&rank[operator]=eq&rank[value]=1&rank[values]=1`,
];

const ACCEPTED_CASES: Array<{ labels: Array<string>; query: string }> = [
	{ labels: ["Alpha", "Beta", "Gamma"], query: `${PAGE}&orderBy=label&orderDirection=asc` },
	{ labels: ["Gamma", "Beta", "Alpha"], query: `${PAGE}&orderBy=rank&orderDirection=desc` },
	{ labels: ["Alpha"], query: `${PAGE}&rank[operator]=in&rank[values]=1` },
	{ labels: ["Alpha", "Gamma"], query: `${PAGE}&status[operator]=in&status[values]=active&orderBy=label&orderDirection=asc` },
	{ labels: ["Alpha"], query: `${PAGE}&label[operator]=in&label[values]=Alpha` },
	{ labels: ["Alpha", "Beta"], query: `${PAGE}&rank[operator]=in&rank[values]=1&rank[values]=2&orderBy=label&orderDirection=asc` },
	{ labels: ["Beta", "Gamma"], query: `${PAGE}&rank[operator]=gt&rank[value]=1&orderBy=label&orderDirection=asc` },
];

const LIST_PATHS: Array<IListPathCase> = [
	{ name: "the legacy path", path: LEGACY_PATH },
	{ name: "the typed path", path: TYPED_PATH },
];

const getQueryParameterSchema = (document: OpenAPIObject, path: string, name: string): TSwaggerSchemaObject | undefined => {
	const parameter: unknown = document.paths[path]?.get?.parameters?.find((candidate: unknown): boolean => typeof candidate === "object" && candidate !== null && "name" in candidate && candidate.name === name);

	return (parameter as undefined | { schema?: TSwaggerSchemaObject })?.schema;
};

const getTypedValueSchema = (document: OpenAPIObject, name: string, operation: string): TSwaggerSchemaObject | undefined => {
	const branches: Array<TSwaggerSchemaObject> = (getQueryParameterSchema(document, TYPED_PATH, name)?.oneOf ?? []) as Array<TSwaggerSchemaObject>;
	const branch: TSwaggerSchemaObject | undefined = branches.find((candidate: TSwaggerSchemaObject): boolean => (candidate.properties?.operator as TSwaggerSchemaObject | undefined)?.enum?.[0] === operation);

	return branch?.properties?.value as TSwaggerSchemaObject | undefined;
};

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("GET_LIST query rules shared by the typed and legacy paths on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
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
		let document: OpenAPIObject;
		let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		const queryLogger: ListQueryLogger = new ListQueryLogger();

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eLegacyQueryItemEntity];
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eLegacyQueryItemController, E2eLegacyQueryTypedItemController],
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eLegacyQueryItemService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
			fastify = app.getHttpAdapter().getInstance();

			await app.get(E2eLegacyQueryItemService).repository.save([
				{ createdAt: new Date("2024-01-01T00:00:00.000Z"), isFeatured: true, label: "Alpha", note: "Noted", rank: 1, releasedOn: "2024-01-01", status: EE2eLegacyQueryStatus.ACTIVE, undescribed: "z", unsortable: "z" },
				{ createdAt: new Date("2024-02-02T00:00:00.000Z"), isFeatured: false, label: "Beta", rank: 2, releasedOn: "2024-02-02", status: EE2eLegacyQueryStatus.ARCHIVED, undescribed: "y", unsortable: "y" },
				{ createdAt: new Date("2024-03-03T00:00:00.000Z"), isFeatured: false, label: "Gamma", rank: 3, releasedOn: "2024-03-03", status: EE2eLegacyQueryStatus.ACTIVE, undescribed: "x", unsortable: "x" },
			] as Array<E2eLegacyQueryItemEntity>);
		});

		beforeEach(() => {
			queryLogger.queries.length = 0;
		});

		afterAll(async () => {
			await app?.close();
		});

		describe.each<IListPathCase>(LIST_PATHS)("on $name", ({ path }: IListPathCase) => {
			it.each(REJECTED_QUERIES)("answers %s with the 400 exception body before any SQL", async (query: string) => {
				const response = await fastify.inject({ method: "GET", url: `${path}?${query}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(response.json()).toEqual({ error: "Bad Request", message: expect.anything(), statusCode: HttpStatus.BAD_REQUEST });
				expect(queryLogger.queries).toEqual([]);
			});

			it.each(ACCEPTED_CASES)("serves $query", async ({ labels, query }: { labels: Array<string>; query: string }) => {
				const response = await fastify.inject({ method: "GET", url: `${path}?${query}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect((response.json() as { items: Array<{ label: string }> }).items.map((item: { label: string }): string => item.label)).toEqual(labels);
			});
		});

		it("names both order properties when only one is sent on the legacy path", async () => {
			for (const query of [`${PAGE}&orderBy=label`, `${PAGE}&orderDirection=asc`]) {
				const response = await fastify.inject({ method: "GET", url: `${LEGACY_PATH}?${query}` });

				expect(response.json()).toEqual({ error: "Bad Request", message: ["either all or none of the following properties must be provided: orderBy, orderDirection"], statusCode: HttpStatus.BAD_REQUEST });
			}
		});

		it("publishes one membership minimum and the same value constraints on both paths", () => {
			expect(getQueryParameterSchema(document, LEGACY_PATH, "rank[values]")).toMatchObject({ maxItems: 100, minItems: 1, type: "array" });
			expect(getQueryParameterSchema(document, LEGACY_PATH, "status[values]")).toMatchObject({ minItems: 1 });
			expect(getQueryParameterSchema(document, LEGACY_PATH, "rank[value]")).toMatchObject({ maximum: 1000, minimum: 0, multipleOf: 1, type: "integer" });
			expect(getQueryParameterSchema(document, LEGACY_PATH, "label[value]")).toMatchObject({ maxLength: 64, minLength: 1, pattern: "^[A-Za-z0-9 ]+$", type: "string" });

			expect(getTypedValueSchema(document, "rank", "eq")).toMatchObject({ maximum: 1000, minimum: 0, multipleOf: 1, type: "integer" });
			expect(getTypedValueSchema(document, "label", "eq")).toMatchObject({ maxLength: 64, minLength: 1, pattern: "^[A-Za-z0-9 ]+$", type: "string" });
		});
	});
});
