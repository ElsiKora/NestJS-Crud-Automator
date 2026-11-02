import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DataSourceOptions, Logger } from "typeorm";
import type { IApiAuthorizationPrincipal, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource, IApiPolicyStatement } from "../../src/index";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationSimulator, ApiSubscriberModule, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiRouteType } from "../../src/index";
import { E2eBooleanFilterItemEntity, E2eBooleanFilterItemService, E2eBooleanFilterLegacyItemController, E2eBooleanFilterTypedItemController } from "./boolean-filter";

class BooleanFilterQueryLogger implements Logger {
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

type TDatabase = "mysql" | "postgres" | "sqlite";

const DATABASES: Array<{ database: TDatabase; databaseName: string }> = [
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL" },
	{ database: "mysql", databaseName: "MySQL" },
];

/**
 * Starts the database a describe block runs on.
 * @param {TDatabase} database - Database kind.
 * @returns {Promise<{ options: (extra: Partial<TypeOrmModuleOptions>) => TypeOrmModuleOptions; stop: () => Promise<void> }>} Connection options and a stop function.
 */
async function startDatabase(database: TDatabase): Promise<{ options: (extra: Record<string, unknown>) => TypeOrmModuleOptions; stop: () => Promise<void> }> {
	if (database === "postgres") {
		const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:17-alpine").start();

		return { options: (extra: Record<string, unknown>) => ({ ...extra, dropSchema: true, synchronize: true, type: "postgres", url: container.getConnectionUri() }) as TypeOrmModuleOptions, stop: async () => void (await container.stop()) };
	}

	if (database === "mysql") {
		const container: StartedMySqlContainer = await new MySqlContainer("mysql:8.4").start();

		return {
			options: (extra: Record<string, unknown>) => ({ ...extra, database: container.getDatabase(), dropSchema: true, host: container.getHost(), password: container.getUserPassword(), port: container.getPort(), synchronize: true, type: "mysql", username: container.getUsername() }) as TypeOrmModuleOptions,
			stop: async () => void (await container.stop()),
		};
	}

	return { options: (extra: Record<string, unknown>) => ({ ...extra, database: ":memory:", dropSchema: true, synchronize: true, type: "better-sqlite3" }) as TypeOrmModuleOptions, stop: async () => {} };
}

interface IHostPipeCase {
	createPipe?: () => ValidationPipe;
	name: string;
}

const ROWS: Array<E2eBooleanFilterItemEntity> = [
	{ id: "11111111-1111-4111-8111-111111111111", isFeatured: true, label: "Alpha" },
	{ id: "22222222-2222-4222-8222-222222222222", isFeatured: false, label: "Beta" },
	{ id: "33333333-3333-4333-8333-333333333333", isFeatured: true, label: "Gamma" },
	{ id: "44444444-4444-4444-8444-444444444444", isFeatured: false, label: "Delta" },
];

const LEGACY_ITEMS: string = "/boolean-filter/legacy-items";
const TYPED_ITEMS: string = "/boolean-filter/typed-items";
const PAGE: string = "limit=10&page=1&orderBy=label&orderDirection=asc";
const FEATURED: Array<string> = ["Alpha", "Gamma"];
const NOT_FEATURED: Array<string> = ["Beta", "Delta"];
const ALL: Array<string> = ["Alpha", "Beta", "Delta", "Gamma"];

const ACCEPTED_CASES: Array<{ labels: Array<string>; query: string }> = [
	{ labels: FEATURED, query: "isFeatured[operator]=eq&isFeatured[value]=true" },
	{ labels: NOT_FEATURED, query: "isFeatured[operator]=eq&isFeatured[value]=false" },
	{ labels: NOT_FEATURED, query: "isFeatured[operator]=ne&isFeatured[value]=true" },
	{ labels: FEATURED, query: "isFeatured[operator]=ne&isFeatured[value]=false" },
	{ labels: FEATURED, query: "isFeatured[operator]=in&isFeatured[values]=true&isFeatured[values]=true" },
	{ labels: ALL, query: "isFeatured[operator]=in&isFeatured[values]=true&isFeatured[values]=false" },
	{ labels: FEATURED, query: "isFeatured[operator]=notin&isFeatured[values]=false&isFeatured[values]=false" },
	{ labels: [], query: "isFeatured[operator]=notin&isFeatured[values]=false&isFeatured[values]=true" },
];

// A single `[values]` member is a list of one on both routes.
const SINGLE_MEMBER_CASES: Array<{ labels: Array<string>; query: string }> = [
	{ labels: FEATURED, query: "isFeatured[operator]=in&isFeatured[values]=true" },
	{ labels: FEATURED, query: "isFeatured[operator]=notin&isFeatured[values]=false" },
];

const NON_CANONICAL_VALUES: Array<string> = ["1", "0", "yes", "no", "on", "TRUE", "False", "", "%20true", "banana"];

const REJECTED_CASES: Array<{ field: string; query: string }> = NON_CANONICAL_VALUES.flatMap((value: string): Array<{ field: string; query: string }> => [
	{ field: "isFeatured[value]", query: `isFeatured[operator]=eq&isFeatured[value]=${value}` },
	{ field: "isFeatured[value]", query: `isFeatured[operator]=ne&isFeatured[value]=${value}` },
	{ field: "each value in isFeatured[values]", query: `isFeatured[operator]=in&isFeatured[values]=true&isFeatured[values]=${value}` },
	{ field: "each value in isFeatured[values]", query: `isFeatured[operator]=notin&isFeatured[values]=false&isFeatured[values]=${value}` },
]);

describe.each(DATABASES)("boolean GET_LIST filters on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let started: Awaited<ReturnType<typeof startDatabase>>;

	beforeAll(async () => {
		started = await startDatabase(database);
	}, 300_000);

	afterAll(async () => {
		await started?.stop();
	});

	describe.each<IHostPipeCase>([{ name: "no host pipe" }, { createPipe: () => new ValidationPipe(), name: "a default host ValidationPipe" }, { createPipe: () => new ValidationPipe({ transform: true, whitelist: true }), name: "a transforming, whitelisting host ValidationPipe" }])("with $name", ({ createPipe }: IHostPipeCase) => {
		let app: INestApplication | undefined;
		let document: OpenAPIObject;
		let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		const queryLogger: BooleanFilterQueryLogger = new BooleanFilterQueryLogger();

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eBooleanFilterItemEntity];
			const moduleReference = await Test.createTestingModule({
				controllers: [E2eBooleanFilterLegacyItemController, E2eBooleanFilterTypedItemController],
				imports: [TypeOrmModule.forRoot(started.options({ entities, logger: queryLogger, logging: ["query", "error"] })), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eBooleanFilterItemService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
			fastify = app.getHttpAdapter().getInstance();

			await app.get(E2eBooleanFilterItemService).repository.save(ROWS);
		});

		beforeEach(() => {
			queryLogger.queries.length = 0;
		});

		afterAll(async () => {
			await app?.close();
		});

		const listLabels = async (url: string): Promise<Array<string>> => {
			const response = await fastify.inject({ method: "GET", url });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);

			return (response.json() as { items: Array<{ label: string }> }).items.map((item: { label: string }): string => item.label);
		};

		const expectRejected = async (url: string): Promise<unknown> => {
			const response = await fastify.inject({ method: "GET", url });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(queryLogger.queries).toEqual([]);

			return response.json();
		};

		it.each([...ACCEPTED_CASES, ...SINGLE_MEMBER_CASES])("serves $query on the legacy route", async ({ labels, query }: { labels: Array<string>; query: string }) => {
			expect(await listLabels(`${LEGACY_ITEMS}?${PAGE}&${query}`)).toEqual(labels);
		});

		it.each([...ACCEPTED_CASES, ...SINGLE_MEMBER_CASES])("serves $query on the typed route", async ({ labels, query }: { labels: Array<string>; query: string }) => {
			expect(await listLabels(`${TYPED_ITEMS}?${PAGE}&${query}`)).toEqual(labels);
		});

		it.each(REJECTED_CASES)("answers $query on the legacy route with the ValidationPipe body before any SQL", async ({ field, query }: { field: string; query: string }) => {
			expect(await expectRejected(`${LEGACY_ITEMS}?${PAGE}&${query}`)).toEqual({ error: "Bad Request", message: [`${field} must be a boolean value`], statusCode: HttpStatus.BAD_REQUEST });
		});

		it.each(REJECTED_CASES)("answers $query on the typed route with 400 before any SQL", async ({ query }: { query: string }) => {
			await expectRejected(`${TYPED_ITEMS}?${PAGE}&${query}`);
		});

		it.each(["isFeatured[operator]=excl&isFeatured[value]=true", "isFeatured[operator]=excl&isFeatured[values]=true&isFeatured[values]=false"])("answers %s with 400 before any SQL on both routes", async (query: string) => {
			await expectRejected(`${LEGACY_ITEMS}?${PAGE}&${query}`);
			await expectRejected(`${TYPED_ITEMS}?${PAGE}&${query}`);
		});

		it("publishes no excl operator for a legacy boolean filter", () => {
			const parameters = document.paths[LEGACY_ITEMS]?.get?.parameters ?? [];
			const operator = parameters.find((parameter) => "name" in parameter && parameter.name === "isFeatured[operator]") as undefined | { schema?: { enum?: Array<string> } };

			expect(operator?.schema?.enum).toEqual(["eq", "in", "isnull", "ne", "notin", "notnull"]);
		});

		it("publishes the legacy boolean filter values as booleans only", () => {
			const parameters = document.paths[LEGACY_ITEMS]?.get?.parameters ?? [];
			const schemaOf = (name: string): unknown => (parameters.find((parameter) => "name" in parameter && parameter.name === name) as undefined | { schema?: unknown })?.schema;

			expect(schemaOf("isFeatured[value]")).toEqual({ example: true, nullable: false, type: "boolean" });
			expect(schemaOf("isFeatured[values]")).toMatchObject({ items: { type: "boolean" }, type: "array" });
		});

		it("publishes the typed boolean filter values as booleans only", () => {
			const parameters = document.paths[TYPED_ITEMS]?.get?.parameters ?? [];
			const filter = parameters.find((parameter) => "name" in parameter && parameter.name === "isFeatured");
			const branches: Array<{ properties: Record<string, unknown> }> = (filter as undefined | { schema?: { oneOf?: Array<{ properties: Record<string, unknown> }> } })?.schema?.oneOf ?? [];
			const operands: Array<unknown> = branches.map((branch: { properties: Record<string, unknown> }): unknown => branch.properties.value ?? branch.properties.values);

			expect(operands).toEqual([{ type: "boolean" }, { items: { type: "boolean" }, maxItems: 100, minItems: 1, type: "array" }, { type: "boolean" }, { items: { type: "boolean" }, maxItems: 100, minItems: 1, type: "array" }]);
		});
	});
});

const IAM_PRINCIPAL: IApiAuthorizationPrincipal = {
	attributes: { featured: true, featuredText: "true", notFeatured: false, numericFeatured: 1 },
	id: "user-1",
	roles: [],
	type: EApiAuthorizationPrincipalType.USER,
};

const IAM_AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: "bool:item",
	resourceDefinition: {
		entity: E2eBooleanFilterItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.isFeatured", queryPath: "isFeatured" },
		],
		namespace: "bool:item",
		resourcePath: "bool:item/{id}",
		resourceType: "bool:item",
	},
};

const iamStatement = (effect: EApiPolicyEffect, condition?: Record<string, Record<string, unknown>>): IApiPolicyStatement => ({
	Action: ["bool:item:list"],
	...(condition ? { Condition: condition } : {}),
	Effect: effect,
	Resource: ["bool:item/*"],
});

const IAM_ALLOW_ALL: IApiPolicyStatement = iamStatement(EApiPolicyEffect.ALLOW);

const IAM_COMPILABLE_CASES: Array<[string, Array<IApiPolicyStatement>, Array<string>]> = [
	["an Allow StringEquals literal true", [iamStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.isFeatured": "true" } })], FEATURED],
	["an Allow StringEquals literal false", [iamStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.isFeatured": "false" } })], NOT_FEATURED],
	["an Allow StringEquals JSON boolean", [iamStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.isFeatured": true } })], FEATURED],
	["an Allow StringEquals variable resolving to true", [iamStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.isFeatured": "${principal.attributes.featured}" } })], FEATURED],
	["an Allow StringEquals variable resolving to false", [iamStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.isFeatured": "${principal.attributes.notFeatured}" } })], NOT_FEATURED],
	["an Allow StringEquals variable resolving to the text true", [iamStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.isFeatured": "${principal.attributes.featuredText}" } })], FEATURED],
	["a Deny StringEquals literal true", [IAM_ALLOW_ALL, iamStatement(EApiPolicyEffect.DENY, { StringEquals: { "resource.isFeatured": "true" } })], NOT_FEATURED],
	["a Deny StringEqualsIfExists literal false", [IAM_ALLOW_ALL, iamStatement(EApiPolicyEffect.DENY, { StringEqualsIfExists: { "resource.isFeatured": "false" } })], FEATURED],
	["a Deny StringNotEquals literal true", [IAM_ALLOW_ALL, iamStatement(EApiPolicyEffect.DENY, { StringNotEquals: { "resource.isFeatured": "true" } })], FEATURED],
	["a Deny StringNotEqualsIfExists variable resolving to false", [IAM_ALLOW_ALL, iamStatement(EApiPolicyEffect.DENY, { StringNotEqualsIfExists: { "resource.isFeatured": "${principal.attributes.notFeatured}" } })], NOT_FEATURED],
];

const IAM_FAIL_CLOSED_CASES: Array<[string, Array<IApiPolicyStatement>]> = [
	["an Allow StringEquals literal 1", [iamStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.isFeatured": "1" } })]],
	["an Allow StringEquals literal yes", [iamStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.isFeatured": "yes" } })]],
	["an Allow StringEquals variable resolving to the number 1", [iamStatement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.isFeatured": "${principal.attributes.numericFeatured}" } })]],
	["a Deny StringEquals literal 0", [IAM_ALLOW_ALL, iamStatement(EApiPolicyEffect.DENY, { StringEquals: { "resource.isFeatured": "0" } })]],
	["a Deny StringNotEquals literal TRUE", [IAM_ALLOW_ALL, iamStatement(EApiPolicyEffect.DENY, { StringNotEquals: { "resource.isFeatured": "TRUE" } })]],
];

describe.each(DATABASES)("IAM conditions on a boolean column on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let started: Awaited<ReturnType<typeof startDatabase>>;
	let dataSource: DataSource;
	let simulator: ApiAuthorizationSimulator;
	let statements: Array<IApiPolicyStatement> = [];

	const attachmentSource: IApiPolicyAttachmentSource = {
		async getAttachments() {
			return {
				attachments: [{ policyId: "bool-policy", principalId: IAM_PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }],
				boundaries: [],
			};
		},
	};

	const documentSource: IApiPolicyDocumentSource = {
		async getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
			return ids.includes("bool-policy") ? [{ document: { Statement: statements, Version: "2012-10-17" }, id: "bool-policy", namespace: "bool:item", sourceType: EApiPolicySourceType.MANAGED, version: "1" }] : [];
		},
	};

	const evaluateList = async (resource?: E2eBooleanFilterItemEntity) =>
		await simulator.evaluate({
			action: EApiRouteType.GET_LIST,
			authorization: IAM_AUTHORIZATION,
			entity: E2eBooleanFilterItemEntity,
			principal: IAM_PRINCIPAL,
			resource,
			routeType: EApiRouteType.GET_LIST,
		});

	const resolveKeptLabels = async (policyStatements: Array<IApiPolicyStatement>): Promise<{ inMemory: Array<string>; isAllowed: boolean; sql: Array<string> }> => {
		statements = policyStatements;

		const decision = await evaluateList();
		const sqlRows: Array<E2eBooleanFilterItemEntity> = decision.effect === EApiPolicyEffect.ALLOW ? await dataSource.getRepository(E2eBooleanFilterItemEntity).find({ where: decision.scope?.where }) : [];
		const inMemory: Array<string> = [];

		for (const row of await dataSource.getRepository(E2eBooleanFilterItemEntity).find()) {
			if ((await evaluateList(row)).effect === EApiPolicyEffect.ALLOW) {
				inMemory.push(row.label);
			}
		}

		return { inMemory: inMemory.sort(), isAllowed: decision.effect === EApiPolicyEffect.ALLOW, sql: sqlRows.map((row: E2eBooleanFilterItemEntity): string => row.label).sort() };
	};

	beforeAll(async () => {
		started = await startDatabase(database);
		dataSource = new DataSource(started.options({ entities: [E2eBooleanFilterItemEntity] }) as DataSourceOptions);
		await dataSource.initialize();
		await dataSource.getRepository(E2eBooleanFilterItemEntity).save(ROWS);

		const moduleReference = await Test.createTestingModule({
			imports: [ApiAuthorizationModule.forRoot({ iam: { attachmentSources: [attachmentSource], documentSources: [documentSource] } })],
		}).compile();

		simulator = moduleReference.get(ApiAuthorizationSimulator);
	}, 120_000);

	afterAll(async () => {
		await dataSource?.destroy();
		await started?.stop();
	});

	it.each(IAM_COMPILABLE_CASES)("keeps the same rows in SQL and in memory for %s", async (_name: string, policyStatements: Array<IApiPolicyStatement>, labels: Array<string>) => {
		const kept: { inMemory: Array<string>; isAllowed: boolean; sql: Array<string> } = await resolveKeptLabels(policyStatements);

		expect(kept.isAllowed).toBe(true);
		expect(kept.inMemory).toEqual(labels);
		expect(kept.sql).toEqual(labels);
	});

	it.each(IAM_FAIL_CLOSED_CASES)("denies the whole list instead of compiling %s", async (_name: string, policyStatements: Array<IApiPolicyStatement>) => {
		const kept: { inMemory: Array<string>; isAllowed: boolean; sql: Array<string> } = await resolveKeptLabels(policyStatements);

		expect(kept.isAllowed).toBe(false);
		expect(kept.sql).toEqual([]);
	});
});
