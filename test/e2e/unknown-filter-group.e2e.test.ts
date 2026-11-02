import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger } from "typeorm";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import { E2eUnknownFilterCursorItemController, E2eUnknownFilterItemController, E2eUnknownFilterItemEntity, E2eUnknownFilterItemService, E2eUnknownFilterManualItemController, E2eUnknownFilterOwnerEntity, E2eUnknownFilterOwnerService, E2eUnknownFilterTagEntity, E2eUnknownFilterTagService, E2eUnknownFilterToManyItemController, E2eUnknownFilterTypedItemController } from "./unknown-filter-group";

class UnknownFilterQueryLogger implements Logger {
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
	isValidatingUnknownKeys?: boolean;
	name: string;
}

const OWNER_ANN: string = "11111111-1111-4111-8111-111111111111";
const OWNER_BOB: string = "22222222-2222-4222-8222-222222222222";
const ITEM_ALPHA: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ITEM_BETA: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ITEM_GAMMA: string = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

const filterGroupKeys = (field: string): Array<string> => [`${field}[operator]`, `${field}[value]`, `${field}[values]`];

// Only to-one relation fields are filters: the route applies nothing it does not publish, so a to-many path such as tags.name is not published.
const LEGACY_QUERY_PARAMETERS: Array<string> = ["limit", "orderBy", "orderDirection", "page", ...["code", "label", "owner.id", "owner.name", "rank", "sponsor.id", "sponsor.name"].flatMap(filterGroupKeys)].toSorted();

const PAGE: string = "limit=10&page=1";
const BY_LABEL: string = "orderBy=label&orderDirection=asc";
const ALL_LABELS: Array<string> = ["Alpha", "Beta", "Gamma"];
const FILTER_NOT_VALID_BODY: Record<string, unknown> = { error: "Bad Request", message: "FILTER_NOT_VALID", statusCode: HttpStatus.BAD_REQUEST };

const VALUE_WITHOUT_OPERATOR_MESSAGE: string = 'group "nmae" with value suffix must have an operator suffix [operator]';

const unknown = (key: string): string => `property ${key} should not exist`;

const UNKNOWN_GROUPS = {
	descendantOfRelation: "owner.nope[operator]=eq&owner.nope[value]=Ann",
	disabledColumn: "secret[operator]=eq&secret[value]=Secret",
	relationItself: `owner[operator]=eq&owner[value]=${OWNER_ANN}`,
	toManyRelationField: "tags.name[operator]=eq&tags.name[value]=red",
	toManyRelationKey: `tags.id[operator]=in&tags.id[values]=${ITEM_ALPHA}&tags.id[values]=${ITEM_BETA}`,
	typo: "nmae[operator]=eq&nmae[value]=Alpha",
	typoNextToInheritedFilter: "code[operator]=eq&code[value]=A1&lable[operator]=cont&lable[value]=lph",
	typoNextToValidFilter: "rank[operator]=eq&rank[value]=1&nmae[operator]=eq&nmae[value]=Alpha",
	typoValuelessOperator: "nmae[operator]=isnull",
	typoValueOnly: "nmae[value]=Alpha",
	typoValues: "nmae[operator]=in&nmae[values]=Alpha&nmae[values]=Beta",
	undescribedColumn: "undescribed[operator]=eq&undescribed[value]=x",
} as const;

// A key the QUERY DTO does not publish is rejected whatever its shape, including a cache-buster and the DTO's internal filter-pairing anchor.
const UNKNOWN_PLAIN_KEYS: Array<{ key: string; query: string }> = [
	{ key: "_", query: "_=1730000000" },
	{ key: "campaign", query: "campaign=spring" },
	{ key: "nmae", query: "nmae=Alpha" },
	{ key: "nmae[foo]", query: "nmae[foo]=Alpha" },
	{ key: "object", query: "object=x" },
	{ key: "after", query: "after=abc" },
];

const LEGACY_REJECTED_CASES: Array<{ messages: Array<string>; query: string }> = [
	{ messages: [unknown("id[operator]"), unknown("id[value]")], query: `id[operator]=eq&id[value]=${ITEM_ALPHA}` },
	{ messages: [unknown("id[operator]"), unknown("id[values]")], query: `id[operator]=in&id[values]=${ITEM_ALPHA}&id[values]=${ITEM_BETA}` },
	{ messages: [unknown("owner.nope[operator]"), unknown("owner.nope[value]")], query: UNKNOWN_GROUPS.descendantOfRelation },
	{ messages: [unknown("secret[operator]"), unknown("secret[value]")], query: UNKNOWN_GROUPS.disabledColumn },
	{ messages: [unknown("owner[operator]"), unknown("owner[value]")], query: UNKNOWN_GROUPS.relationItself },
	{ messages: [unknown("tags.name[operator]"), unknown("tags.name[value]")], query: UNKNOWN_GROUPS.toManyRelationField },
	{ messages: [unknown("tags.id[operator]"), unknown("tags.id[values]")], query: UNKNOWN_GROUPS.toManyRelationKey },
	{ messages: [unknown("nmae[operator]"), unknown("nmae[value]")], query: UNKNOWN_GROUPS.typo },
	{ messages: [unknown("lable[operator]"), unknown("lable[value]")], query: UNKNOWN_GROUPS.typoNextToInheritedFilter },
	{ messages: [unknown("nmae[operator]"), unknown("nmae[value]")], query: UNKNOWN_GROUPS.typoNextToValidFilter },
	{ messages: [unknown("nmae[operator]")], query: UNKNOWN_GROUPS.typoValuelessOperator },
	{ messages: [unknown("nmae[value]"), VALUE_WITHOUT_OPERATOR_MESSAGE], query: UNKNOWN_GROUPS.typoValueOnly },
	{ messages: [unknown("nmae[operator]"), unknown("nmae[values]")], query: UNKNOWN_GROUPS.typoValues },
	{ messages: [unknown("undescribed[operator]"), unknown("undescribed[value]")], query: UNKNOWN_GROUPS.undescribedColumn },
	...UNKNOWN_PLAIN_KEYS.map(({ key, query }: { key: string; query: string }): { messages: Array<string>; query: string } => ({ messages: [unknown(key)], query })),
	{ messages: [unknown("campaign"), unknown("nmae[operator]"), unknown("nmae[value]")], query: `campaign=spring&${UNKNOWN_GROUPS.typo}` },
];

const LEGACY_ACCEPTED_CASES: Array<{ labels: Array<string>; query: string }> = [
	{ labels: ["Beta"], query: "code[operator]=eq&code[value]=B2" },
	{ labels: ["Alpha", "Gamma"], query: `owner.id[operator]=eq&owner.id[value]=${OWNER_ANN}` },
	{ labels: ["Beta"], query: "owner.name[operator]=eq&owner.name[value]=Bob" },
	{ labels: ["Beta", "Gamma"], query: "rank[operator]=gt&rank[value]=1" },
	{ labels: ["Beta"], query: "sponsor.name[operator]=eq&sponsor.name[value]=Ann" },
	{ labels: ["Alpha"], query: `sponsor.id[operator]=eq&sponsor.id[value]=${OWNER_BOB}` },
];

const TYPED_REJECTED_QUERIES: Array<string> = [...Object.values(UNKNOWN_GROUPS), ...UNKNOWN_PLAIN_KEYS.map(({ query }: { query: string }): string => query)];

const TYPED_ACCEPTED_CASES: Array<{ labels: Array<string>; query: string }> = [
	{ labels: ["Alpha"], query: `id[operator]=eq&id[value]=${ITEM_ALPHA}` },
	{ labels: ["Alpha", "Gamma"], query: `id[operator]=in&id[values]=${ITEM_ALPHA}&id[values]=${ITEM_GAMMA}` },
	{ labels: ["Beta"], query: "code[operator]=eq&code[value]=B2" },
	{ labels: ["Alpha", "Gamma"], query: `owner.id[operator]=eq&owner.id[value]=${OWNER_ANN}` },
	{ labels: ["Beta"], query: "owner.name[operator]=eq&owner.name[value]=Bob" },
	{ labels: ["Beta", "Gamma"], query: "rank[operator]=gt&rank[value]=1" },
	{ labels: ["Beta"], query: "sponsor.name[operator]=eq&sponsor.name[value]=Ann" },
	{ labels: ["Alpha"], query: `sponsor.id[operator]=eq&sponsor.id[value]=${OWNER_BOB}` },
];

const CURSOR_REJECTED_QUERIES: Array<string> = [`id[operator]=eq&id[value]=${ITEM_ALPHA}`, `owner.id[operator]=eq&owner.id[value]=${OWNER_ANN}`, ...Object.values(UNKNOWN_GROUPS), ...UNKNOWN_PLAIN_KEYS.filter(({ key }: { key: string }): boolean => key !== "after").map(({ query }: { query: string }): string => query)];

const CURSOR_ACCEPTED_CASES: Array<{ labels: Array<string>; query: string }> = [
	{ labels: ["Gamma"], query: "code[operator]=eq&code[value]=C3" },
	{ labels: ["Alpha", "Gamma"], query: "owner.name[operator]=eq&owner.name[value]=Ann" },
	{ labels: ["Beta", "Gamma"], query: "rank[operator]=gt&rank[value]=1" },
];

describe("GET_LIST filters a manual QUERY DTO publishes (E2E)", () => {
	it("fails startup for a to-many filter the route cannot apply, before any request", async () => {
		const compile = Test.createTestingModule({ controllers: [E2eUnknownFilterToManyItemController], imports: [ApiAuthorizationModule.forRoot()], providers: [{ provide: E2eUnknownFilterItemService, useValue: {} }] }).compile();

		await expect(compile).rejects.toThrowError('publishes "tags.name[operator]", a filter the route cannot apply');
	});
});

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("GET_LIST unknown filter groups on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<IHostPipeCase>([{ name: "no host pipe" }, { createPipe: () => new ValidationPipe(), isValidatingUnknownKeys: true, name: "a default host ValidationPipe" }, { createPipe: () => new ValidationPipe({ transform: true, whitelist: true }), name: "a transforming, whitelisting host ValidationPipe" }])("with $name", ({ createPipe, isValidatingUnknownKeys }: IHostPipeCase) => {
		let app: INestApplication | undefined;
		let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		const queryLogger: UnknownFilterQueryLogger = new UnknownFilterQueryLogger();

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eUnknownFilterOwnerEntity, E2eUnknownFilterItemEntity, E2eUnknownFilterTagEntity];
			// CURSOR pagination supports PostgreSQL storage only.
			const controllers: Array<new () => unknown> = [E2eUnknownFilterItemController, E2eUnknownFilterManualItemController, E2eUnknownFilterTypedItemController, ...(isPostgres ? [E2eUnknownFilterCursorItemController] : [])];
			const moduleReference = await Test.createTestingModule({
				controllers,
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eUnknownFilterItemService, E2eUnknownFilterOwnerService, E2eUnknownFilterTagService],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();

			await app.get(E2eUnknownFilterOwnerService).repository.save([
				{ id: OWNER_ANN, name: "Ann" },
				{ id: OWNER_BOB, name: "Bob" },
			]);
			await app.get(E2eUnknownFilterItemService).repository.save([
				{ code: "A1", id: ITEM_ALPHA, label: "Alpha", owner: { id: OWNER_ANN }, rank: 1, secret: "Hidden", sponsor: { id: OWNER_BOB }, undescribed: "x" },
				{ code: "B2", id: ITEM_BETA, label: "Beta", owner: { id: OWNER_BOB }, rank: 2, secret: "Hidden", sponsor: { id: OWNER_ANN }, undescribed: "x" },
				{ code: "C3", id: ITEM_GAMMA, label: "Gamma", owner: { id: OWNER_ANN }, rank: 3, secret: "Hidden", undescribed: "x" },
			] as Array<E2eUnknownFilterItemEntity>);
			await app.get(E2eUnknownFilterTagService).repository.save([
				{ item: { id: ITEM_ALPHA }, name: "red" },
				{ item: { id: ITEM_BETA }, name: "blue" },
				{ item: { id: ITEM_GAMMA }, name: "red" },
			] as Array<E2eUnknownFilterTagEntity>);
		});

		beforeEach(() => {
			queryLogger.queries.length = 0;
		});

		afterAll(async () => {
			await app?.close();
		});

		const expectRejected = async (url: string, body: unknown): Promise<void> => {
			const response = await fastify.inject({ method: "GET", url });

			expect(response.json()).toEqual(body);
			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(queryLogger.queries).toEqual([]);
		};

		// A host pipe that keeps unknown keys validates the route DTO before the route runs, and its object-level validator answers a lone value first. The status is the same.
		const rejectedBody = (query: string, routeBody: unknown): unknown => (isValidatingUnknownKeys && query === UNKNOWN_GROUPS.typoValueOnly ? { error: "Bad Request", message: [VALUE_WITHOUT_OPERATOR_MESSAGE], statusCode: HttpStatus.BAD_REQUEST } : routeBody);

		const listLabels = async (url: string): Promise<Array<string>> => {
			const response = await fastify.inject({ method: "GET", url });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);

			return (response.json() as { items: Array<{ label: string }> }).items.map((item: { label: string }): string => item.label);
		};

		describe("on a route without a typed filter", () => {
			it("publishes exactly the query keys the route applies", () => {
				const document = SwaggerModule.createDocument(app as INestApplication, new DocumentBuilder().build());
				const parameters: Array<{ name: string }> = (document.paths["/unknown-filter/items"]?.get?.parameters ?? []) as Array<{ name: string }>;

				expect(parameters.map(({ name }: { name: string }): string => name).toSorted()).toEqual(LEGACY_QUERY_PARAMETERS);
			});

			it.each(LEGACY_REJECTED_CASES)("rejects $query before any SQL", async ({ messages, query }: { messages: Array<string>; query: string }) => {
				await expectRejected(`/unknown-filter/items?${PAGE}&${query}`, rejectedBody(query, { error: "Bad Request", message: messages, statusCode: HttpStatus.BAD_REQUEST }));
			});

			it.each(LEGACY_ACCEPTED_CASES)("serves $query", async ({ labels, query }: { labels: Array<string>; query: string }) => {
				expect(await listLabels(`/unknown-filter/items?${PAGE}&${BY_LABEL}&${query}`)).toEqual(labels);
			});

			// A manual QUERY DTO has no pairing validator, so the route itself refuses a group it cannot apply rather than answering the unfiltered list.
			it.each(["label[value]=Alpha", "label[operator]=eq", "label[values]=Alpha&label[values]=Beta", "label[operator]=eq&label[value]=Alpha&label[values]=Beta", "label[operator]=isnull&label[value]=Alpha"])("rejects the group %s a manual QUERY DTO publishes but the route cannot apply", async (query: string) => {
				await expectRejected(`/unknown-filter/manual-items?${PAGE}&${query}`, FILTER_NOT_VALID_BODY);
			});

			it("rejects filter groups a manual QUERY DTO does not publish", async () => {
				await expectRejected(`/unknown-filter/manual-items?${PAGE}&rank[operator]=eq&rank[value]=1`, { error: "Bad Request", message: [unknown("rank[operator]"), unknown("rank[value]")], statusCode: HttpStatus.BAD_REQUEST });
				await expectRejected(`/unknown-filter/manual-items?${PAGE}&id[operator]=eq&id[value]=${ITEM_ALPHA}`, { error: "Bad Request", message: [unknown("id[operator]"), unknown("id[value]")], statusCode: HttpStatus.BAD_REQUEST });

				await expectRejected(`/unknown-filter/manual-items?${PAGE}&campaign=spring`, { error: "Bad Request", message: [unknown("campaign")], statusCode: HttpStatus.BAD_REQUEST });

				expect(await listLabels(`/unknown-filter/manual-items?${PAGE}&${BY_LABEL}&label[operator]=eq&label[value]=Beta`)).toEqual(["Beta"]);
			});
		});

		describe("on a route with a typed PAGE filter", () => {
			it.each(TYPED_REJECTED_QUERIES)("rejects %s before any SQL", async (query: string) => {
				await expectRejected(`/unknown-filter/typed-items?${PAGE}&${query}`, rejectedBody(query, FILTER_NOT_VALID_BODY));
			});

			it.each(TYPED_ACCEPTED_CASES)("serves $query", async ({ labels, query }: { labels: Array<string>; query: string }) => {
				expect(await listLabels(`/unknown-filter/typed-items?${PAGE}&${BY_LABEL}&${query}`)).toEqual(labels);
			});
		});

		describe.runIf(isPostgres)("on a route with a typed CURSOR filter", () => {
			it.each(CURSOR_REJECTED_QUERIES)("rejects %s before any SQL", async (query: string) => {
				await expectRejected(`/unknown-filter/cursor-items?limit=10&${query}`, rejectedBody(query, FILTER_NOT_VALID_BODY));
			});

			it.each(CURSOR_ACCEPTED_CASES)("serves $query", async ({ labels, query }: { labels: Array<string>; query: string }) => {
				expect(await listLabels(`/unknown-filter/cursor-items?limit=10&${query}`)).toEqual(labels);
			});

			it("serves the unfiltered list", async () => {
				expect(await listLabels("/unknown-filter/cursor-items?limit=10")).toEqual(ALL_LABELS);
			});
		});
	});
});
