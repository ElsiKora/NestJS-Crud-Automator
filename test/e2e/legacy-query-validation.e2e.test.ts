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
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule } from "../../src/index";
import {
	E2eLegacyQueryCursorItemController,
	E2eLegacyQueryCustomSlimItemController,
	E2eLegacyQueryItemController,
	E2eLegacyQueryItemEntity,
	E2eLegacyQueryItemService,
	E2eLegacyQueryItemSubscriber,
	E2eLegacyQueryManualItemController,
	E2eLegacyQueryOrderOnlyItemController,
	E2eLegacyQuerySlimItemController,
	E2eLegacyQuerySummaryItemController,
	E2eLegacyQueryTypedItemController,
	E2eLegacyQueryTypedSlimItemController,
	E2eLegacyQueryTypedSummaryItemController,
	EE2eLegacyQueryStatus,
} from "./legacy-query";

class LegacyQueryLogger implements Logger {
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

const getOrderByEnum = (document: OpenAPIObject, path: string): unknown => {
	const parameter: undefined | { schema?: { $ref?: string; enum?: Array<unknown> } } = (document.paths[path]?.get?.parameters as Array<{ name: string; schema?: { $ref?: string; enum?: Array<unknown> } }> | undefined)?.find((candidate: { name: string }): boolean => candidate.name === "orderBy");
	const reference: string | undefined = parameter?.schema?.$ref;

	return reference ? (document.components?.schemas?.[reference.split("/").at(-1) ?? ""] as { enum?: Array<unknown> } | undefined)?.enum : parameter?.schema?.enum;
};

interface IHostPipeCase {
	createPipe?: () => ValidationPipe;
	name: string;
}

const PAGE: string = "limit=10&page=1";
const ITEMS: string = "/legacy-query/items";
const ORDERABLE_FIELDS: Array<string> = ["id", "label", "rank", "status", "note", "releasedOn", "createdAt"];
const ORDER_BY_MESSAGE: string = `orderBy must be one of the following values: ${ORDERABLE_FIELDS.join(", ")}`;
const SLIM_ORDERABLE_FIELDS: Array<string> = ["id", "label", "status"];
const SLIM_ORDER_BY_MESSAGE: string = `orderBy must be one of the following values: ${SLIM_ORDERABLE_FIELDS.join(", ")}`;
const ORDER_DIRECTION_MESSAGE: string = "orderDirection must be one of the following values: asc, desc";
const LIMIT_TYPE_MESSAGES: Array<string> = ["limit must be an integer number", "limit must not be less than 1", "limit must not be greater than 100", "limit must be divisible by 1"];
const PAGE_TYPE_MESSAGES: Array<string> = ["page must be an integer number", "page must not be less than 1", "page must not be greater than 100", "page must be divisible by 1"];
const RANK_OPERATOR_MESSAGE: string = "rank[operator] must be one of the following values: between, eq, gt, gte, in, isnull, lt, lte, ne, notin, notnull";

const NO_ORDER_MESSAGE: (property: string) => string = (property: string): string => `${property} is not accepted because no field of this route is orderable`;
const BETWEEN_MESSAGE: (group: string) => string = (group: string): string => `group "${group}" with between operation requires exactly 2 values`;

const REJECTED_CASES: Array<{ messages: Array<string>; query: string }> = [
	{ messages: [ORDER_BY_MESSAGE], query: `${PAGE}&orderBy=nope&orderDirection=asc` },
	{ messages: [ORDER_BY_MESSAGE], query: `${PAGE}&orderBy=unsortable&orderDirection=desc` },
	{ messages: [ORDER_BY_MESSAGE], query: `${PAGE}&orderBy=undescribed&orderDirection=desc` },
	{ messages: [ORDER_BY_MESSAGE], query: `${PAGE}&orderBy=label%3B%20DROP&orderDirection=asc` },
	{ messages: [ORDER_BY_MESSAGE], query: `${PAGE}&orderBy=label&orderBy=rank&orderDirection=asc` },
	{ messages: [ORDER_DIRECTION_MESSAGE], query: `${PAGE}&orderBy=label&orderDirection=sideways` },
	{ messages: [ORDER_DIRECTION_MESSAGE], query: `${PAGE}&orderBy=label&orderDirection=ASC` },
	{ messages: LIMIT_TYPE_MESSAGES, query: "limit=abc&page=1" },
	{ messages: LIMIT_TYPE_MESSAGES, query: "page=1" },
	{ messages: ["limit must not be less than 1"], query: "limit=0&page=1" },
	{ messages: ["limit must not be greater than 100"], query: "limit=1000&page=1" },
	{ messages: PAGE_TYPE_MESSAGES, query: "limit=10&page=abc" },
	{ messages: PAGE_TYPE_MESSAGES, query: "limit=10" },
	{ messages: ["page must not be greater than 100"], query: "limit=10&page=101" },
	{ messages: [RANK_OPERATOR_MESSAGE, 'Invalid operator "bogus" for group "rank"'], query: `${PAGE}&rank[operator]=bogus&rank[value]=1` },
	{ messages: [RANK_OPERATOR_MESSAGE], query: `${PAGE}&rank[operator]=cont&rank[value]=1` },
	{ messages: ["rank[value] must be an integer number", "rank[value] must not be less than 0", "rank[value] must not be greater than 1000", "rank[value] must be divisible by 1"], query: `${PAGE}&rank[operator]=eq&rank[value]=abc` },
	{ messages: ['group "rank" with value suffix must have an operator suffix [operator]'], query: `${PAGE}&rank[value]=1` },
	{ messages: ['group "rank" with operator suffix must have at least one value with suffix [value, values]'], query: `${PAGE}&rank[operator]=eq` },
	{ messages: ["status[value] must be one of the following values: active, archived"], query: `${PAGE}&status[operator]=eq&status[value]=nope` },
	{ messages: ["each value in status[values] must be one of the following values: active, archived"], query: `${PAGE}&status[operator]=in&status[values]=nope&status[values]=archived` },
	{ messages: ["label[value] must match /^[A-Za-z0-9 ]+$/ regular expression"], query: `${PAGE}&label[operator]=cont&label[value]=%25%25` },
	{ messages: ['group "note" with isnull operation should not have any values'], query: `${PAGE}&note[operator]=isnull&note[value]=x` },
	{ messages: [BETWEEN_MESSAGE("rank")], query: `${PAGE}&rank[operator]=between&rank[values]=1` },
	{ messages: [BETWEEN_MESSAGE("rank")], query: `${PAGE}&rank[operator]=between&rank[values]=1&rank[values]=2&rank[values]=3` },
	{ messages: [BETWEEN_MESSAGE("createdAt")], query: `${PAGE}&createdAt[operator]=between&createdAt[values]=2024-01-01T00:00:00.000Z` },
	{ messages: [BETWEEN_MESSAGE("releasedOn")], query: `${PAGE}&releasedOn[operator]=between&releasedOn[values]=2024-01-01` },
	{ messages: ['group "rank" with value suffix must have an operator suffix [operator]'], query: `${PAGE}&rank[values]=1` },
	{ messages: ['group "status" with value suffix must have an operator suffix [operator]'], query: `${PAGE}&status[values]=active` },
	{ messages: ["createdAt[value] must be a Date instance", "createdAt[value] must be in YYYY-MM-DDTHH:mm:ss.sssZ format"], query: `${PAGE}&createdAt[operator]=gt&createdAt[value]=nope` },
	{ messages: ["property campaign should not exist"], query: `${PAGE}&campaign=spring&orderBy=label&orderDirection=asc` },
];

const ACCEPTED_CASES: Array<{ labels: Array<string>; query: string }> = [
	{ labels: ["Alpha", "Beta", "Gamma"], query: `${PAGE}&orderBy=label&orderDirection=asc` },
	{ labels: ["Gamma", "Beta", "Alpha"], query: `${PAGE}&orderBy=rank&orderDirection=desc` },
	{ labels: ["Gamma", "Beta"], query: "limit=2&page=1&orderBy=rank&orderDirection=desc" },
	{ labels: ["Alpha"], query: "limit=2&page=2&orderBy=rank&orderDirection=desc" },
	{ labels: ["Beta", "Gamma"], query: `${PAGE}&rank[operator]=gt&rank[value]=1&orderBy=label&orderDirection=asc` },
	{ labels: ["Alpha", "Beta"], query: `${PAGE}&rank[operator]=between&rank[values]=1&rank[values]=2&orderBy=label&orderDirection=asc` },
	{ labels: ["Alpha", "Gamma"], query: `${PAGE}&status[operator]=eq&status[value]=active&orderBy=label&orderDirection=asc` },
	{ labels: ["Alpha", "Beta", "Gamma"], query: `${PAGE}&status[operator]=in&status[values]=active&status[values]=archived&orderBy=label&orderDirection=asc` },
	{ labels: ["Alpha"], query: `${PAGE}&rank[operator]=in&rank[values]=1` },
	{ labels: ["Beta", "Gamma"], query: `${PAGE}&rank[operator]=notin&rank[values]=1&orderBy=label&orderDirection=asc` },
	{ labels: ["Alpha", "Gamma"], query: `${PAGE}&status[operator]=in&status[values]=active&orderBy=label&orderDirection=asc` },
	{ labels: ["Beta"], query: `${PAGE}&status[operator]=notin&status[values]=active` },
	{ labels: ["Alpha"], query: `${PAGE}&label[operator]=in&label[values]=Alpha` },
	{ labels: ["Alpha"], query: `${PAGE}&isFeatured[operator]=in&isFeatured[values]=1` },
	{ labels: ["Alpha"], query: `${PAGE}&label[operator]=cont&label[value]=lph` },
	{ labels: ["Alpha", "Beta", "Gamma"], query: `${PAGE}&createdAt[operator]=gt&createdAt[value]=2020-01-01T00:00:00.000Z&orderBy=label&orderDirection=asc` },
	{ labels: ["Alpha"], query: `${PAGE}&isFeatured[operator]=eq&isFeatured[value]=1` },
	{ labels: ["Beta", "Gamma"], query: `${PAGE}&isFeatured[operator]=eq&isFeatured[value]=0&orderBy=label&orderDirection=asc` },
	{ labels: ["Beta"], query: `${PAGE}&releasedOn[operator]=eq&releasedOn[value]=2024-02-02` },
	{ labels: ["Beta", "Gamma"], query: `${PAGE}&note[operator]=isnull&orderBy=label&orderDirection=asc` },
	{ labels: ["Alpha"], query: `${PAGE}&note[operator]=notnull` },
];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("legacy GET_LIST query validation on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
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
		let fastify: { inject: (options: { headers?: Record<string, string>; method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		const queryLogger: LegacyQueryLogger = new LegacyQueryLogger();

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eLegacyQueryItemEntity];
			const moduleReference = await Test.createTestingModule({
				// A CURSOR route fails startup on a database other than PostgreSQL.
				controllers: [E2eLegacyQueryCustomSlimItemController, E2eLegacyQueryItemController, E2eLegacyQueryManualItemController, E2eLegacyQueryOrderOnlyItemController, E2eLegacyQueryTypedItemController, ...(isPostgres ? [E2eLegacyQueryCursorItemController] : []), E2eLegacyQuerySlimItemController, E2eLegacyQueryTypedSlimItemController, E2eLegacyQuerySummaryItemController, E2eLegacyQueryTypedSummaryItemController],
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eLegacyQueryItemService, E2eLegacyQueryItemSubscriber],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();

			await app.get(E2eLegacyQueryItemService).repository.save([
				{ createdAt: new Date("2024-01-01T00:00:00.000Z"), exposeHidden: 3, isFeatured: true, label: "Alpha", note: "Noted", queryDisabled: 3, responseHidden: 2, rank: 1, releasedOn: "2024-01-01", status: EE2eLegacyQueryStatus.ACTIVE, undescribed: "z", unsortable: "z" },
				{ createdAt: new Date("2024-02-02T00:00:00.000Z"), exposeHidden: 1, isFeatured: false, label: "Beta", queryDisabled: 1, responseHidden: 3, rank: 2, releasedOn: "2024-02-02", status: EE2eLegacyQueryStatus.ARCHIVED, undescribed: "y", unsortable: "y" },
				{ createdAt: new Date("2024-03-03T00:00:00.000Z"), exposeHidden: 2, isFeatured: false, label: "Gamma", queryDisabled: 2, responseHidden: 1, rank: 3, releasedOn: "2024-03-03", status: EE2eLegacyQueryStatus.ACTIVE, undescribed: "x", unsortable: "x" },
			] as Array<E2eLegacyQueryItemEntity>);
		});

		beforeEach(() => {
			queryLogger.queries.length = 0;
			E2eLegacyQueryItemSubscriber.afterQueries = [];
			E2eLegacyQueryItemSubscriber.beforeErrors = [];
			E2eLegacyQueryItemSubscriber.beforeQueries = [];
		});

		afterAll(async () => {
			await app?.close();
		});

		const expectRejected = async (url: string, messages: Array<string>): Promise<void> => {
			const response = await fastify.inject({ method: "GET", url });

			expect(response.json()).toEqual({ error: "Bad Request", message: messages, statusCode: HttpStatus.BAD_REQUEST });
			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(queryLogger.queries).toEqual([]);
		};

		const listLabels = async (url: string): Promise<Array<string>> => {
			const response = await fastify.inject({ method: "GET", url });

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);

			return (response.json() as { items: Array<{ label: string }> }).items.map((item: { label: string }): string => item.label);
		};

		it.each(REJECTED_CASES)("answers $query with the ValidationPipe body before any SQL", async ({ messages, query }: { messages: Array<string>; query: string }) => {
			await expectRejected(`${ITEMS}?${query}`, messages);
		});

		it.each(ACCEPTED_CASES)("serves $query", async ({ labels, query }: { labels: Array<string>; query: string }) => {
			expect(await listLabels(`${ITEMS}?${query}`)).toEqual(labels);
		});

		it.each(["asc", "desc"])("does not reveal hidden column values through row order with orderDirection=%s", async (orderDirection: string) => {
			await expectRejected(`${ITEMS}?${PAGE}&orderBy=unsortable&orderDirection=${orderDirection}`, [ORDER_BY_MESSAGE]);
			await expectRejected(`${ITEMS}?${PAGE}&orderBy=undescribed&orderDirection=${orderDirection}`, [ORDER_BY_MESSAGE]);
			await expectRejected(`${ITEMS}?${PAGE}&orderBy=queryDisabled&orderDirection=${orderDirection}`, [ORDER_BY_MESSAGE]);
			await expectRejected(`${ITEMS}?${PAGE}&orderBy=responseHidden&orderDirection=${orderDirection}`, [ORDER_BY_MESSAGE]);
			await expectRejected(`${ITEMS}?${PAGE}&orderBy=exposeHidden&orderDirection=${orderDirection}`, [ORDER_BY_MESSAGE]);
			const typedExposeHidden = await fastify.inject({ method: "GET", url: `/legacy-query/typed-items?${PAGE}&orderBy=exposeHidden&orderDirection=${orderDirection}` });

			expect(typedExposeHidden.json()).toEqual({ error: "Bad Request", message: createPipe ? [ORDER_BY_MESSAGE] : "ORDER_NOT_VALID", statusCode: HttpStatus.BAD_REQUEST });
			expect(queryLogger.queries).toEqual([]);
			const typedResponseHidden = await fastify.inject({ method: "GET", url: `/legacy-query/typed-items?${PAGE}&orderBy=responseHidden&orderDirection=${orderDirection}` });

			expect(typedResponseHidden.json()).toEqual({ error: "Bad Request", message: createPipe ? [ORDER_BY_MESSAGE] : "ORDER_NOT_VALID", statusCode: HttpStatus.BAD_REQUEST });
			expect(queryLogger.queries).toEqual([]);
			const typedQueryDisabled = await fastify.inject({ method: "GET", url: `/legacy-query/typed-items?${PAGE}&orderBy=queryDisabled&orderDirection=${orderDirection}` });

			expect(typedQueryDisabled.json()).toEqual({ error: "Bad Request", message: createPipe ? [ORDER_BY_MESSAGE] : "ORDER_NOT_VALID", statusCode: HttpStatus.BAD_REQUEST });
			expect(queryLogger.queries).toEqual([]);
		});

		it.each([
			{ fields: ORDERABLE_FIELDS, path: ITEMS },
			{ fields: ORDERABLE_FIELDS, path: "/legacy-query/typed-items" },
			{ fields: SLIM_ORDERABLE_FIELDS, path: "/legacy-query/slim-items" },
			{ fields: SLIM_ORDERABLE_FIELDS, path: "/legacy-query/typed-slim-items" },
			{ fields: SLIM_ORDERABLE_FIELDS, path: "/legacy-query/custom/slim-items" },
		])("publishes exactly the orderable columns as the $path orderBy enum", ({ fields, path }: { fields: Array<string>; path: string }) => {
			expect(getOrderByEnum(SwaggerModule.createDocument(app as INestApplication, new DocumentBuilder().build()), path)).toEqual(fields);
		});

		it.each(["asc", "desc"])("orders only by fields a manual list response publishes with orderDirection=%s", async (orderDirection: string) => {
			await expectRejected(`/legacy-query/slim-items?${PAGE}&orderBy=rank&orderDirection=${orderDirection}`, [SLIM_ORDER_BY_MESSAGE]);
			const typedRank = await fastify.inject({ method: "GET", url: `/legacy-query/typed-slim-items?${PAGE}&orderBy=rank&orderDirection=${orderDirection}` });

			expect(typedRank.json()).toEqual({ error: "Bad Request", message: createPipe ? [SLIM_ORDER_BY_MESSAGE] : "ORDER_NOT_VALID", statusCode: HttpStatus.BAD_REQUEST });
			expect(queryLogger.queries).toEqual([]);
			const labels: Array<string> = orderDirection === "asc" ? ["Alpha", "Beta", "Gamma"] : ["Gamma", "Beta", "Alpha"];

			expect(await listLabels(`/legacy-query/slim-items?${PAGE}&orderBy=label&orderDirection=${orderDirection}`)).toEqual(labels);
			expect(await listLabels(`/legacy-query/typed-slim-items?${PAGE}&orderBy=label&orderDirection=${orderDirection}`)).toEqual(labels);
		});

		it("narrows the orderBy of a custom GET_LIST route to the fields its response type publishes", async () => {
			const rank = await fastify.inject({ method: "GET", url: `/legacy-query/custom/slim-items?${PAGE}&orderBy=rank&orderDirection=asc` });
			const label = await fastify.inject({ method: "GET", url: `/legacy-query/custom/slim-items?${PAGE}&orderBy=label&orderDirection=asc` });

			// A custom route leaves query validation to the host pipe, as before.
			expect(rank.json()).toEqual(createPipe ? { error: "Bad Request", message: [SLIM_ORDER_BY_MESSAGE], statusCode: HttpStatus.BAD_REQUEST } : { count: 0, currentPage: 1, items: [], totalCount: 0, totalPages: 0 });
			expect(label.statusCode, JSON.stringify(label.json())).toBe(HttpStatus.OK);
		});

		it("publishes no order parameters and refuses any order when nothing is orderable", async () => {
			const document: OpenAPIObject = SwaggerModule.createDocument(app as INestApplication, new DocumentBuilder().build());

			for (const path of ["/legacy-query/summary-items", "/legacy-query/typed-summary-items"]) {
				const parameterNames: Array<string> = ((document.paths[path]?.get?.parameters ?? []) as Array<{ name: string }>).map((parameter: { name: string }): string => parameter.name);

				expect(parameterNames).toEqual(expect.arrayContaining(["limit", "page"]));
				expect(parameterNames).not.toContain("orderBy");
				expect(parameterNames).not.toContain("orderDirection");
				expect((await fastify.inject({ method: "GET", url: `${path}?${PAGE}` })).statusCode).toBe(HttpStatus.OK);
			}

			queryLogger.queries.length = 0;
			await expectRejected(`/legacy-query/summary-items?${PAGE}&orderBy=label&orderDirection=asc`, [NO_ORDER_MESSAGE("orderBy"), NO_ORDER_MESSAGE("orderDirection")]);
			await expectRejected(`/legacy-query/summary-items?${PAGE}&orderBy=`, [NO_ORDER_MESSAGE("orderBy")]);
			const typed = await fastify.inject({ method: "GET", url: `/legacy-query/typed-summary-items?${PAGE}&orderBy=label&orderDirection=asc` });

			expect(typed.json()).toEqual({ error: "Bad Request", message: createPipe ? [NO_ORDER_MESSAGE("orderBy"), NO_ORDER_MESSAGE("orderDirection")] : "ORDER_NOT_VALID", statusCode: HttpStatus.BAD_REQUEST });
			expect(queryLogger.queries).toEqual([]);
		});

		it("applies one membership rule and an exact between pair on the typed route", async () => {
			expect(await listLabels(`/legacy-query/typed-items?${PAGE}&rank[operator]=in&rank[values]=1`)).toEqual(["Alpha"]);
			expect(await listLabels(`/legacy-query/typed-items?${PAGE}&rank[operator]=notin&rank[values]=1`)).toHaveLength(2);
			expect(await listLabels(`/legacy-query/typed-items?${PAGE}&rank[operator]=between&rank[values]=1&rank[values]=2`)).toHaveLength(2);

			for (const values of ["rank[values]=1", "rank[values]=1&rank[values]=2&rank[values]=3"]) {
				queryLogger.queries.length = 0;
				const response = await fastify.inject({ method: "GET", url: `/legacy-query/typed-items?${PAGE}&rank[operator]=between&${values}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(queryLogger.queries).toEqual([]);
			}

			queryLogger.queries.length = 0;
			const pageResponse = await fastify.inject({ method: "GET", url: "/legacy-query/typed-items?limit=10&page=101" });

			expect(pageResponse.statusCode, JSON.stringify(pageResponse.json())).toBe(HttpStatus.BAD_REQUEST);
			expect(queryLogger.queries).toEqual([]);
		});

		it("validates a value a before subscriber wrote, and reports the failure to before-error subscribers", async () => {
			const url: string = `${ITEMS}?${PAGE}&subscriberOrderBy=undescribed`;

			await expectRejected(url, [ORDER_BY_MESSAGE]);

			expect(E2eLegacyQueryItemSubscriber.beforeErrors).toEqual(["BadRequestException"]);
		});

		it.each([
			{ route: "legacy", url: `${ITEMS}?limit=2&page=1&orderBy=rank&orderDirection=desc&rank[operator]=gt&rank[value]=0` },
			{ route: "typed", url: "/legacy-query/typed-items?limit=2&page=1&rank[operator]=eq&rank[value]=2" },
			// CURSOR pagination supports PostgreSQL storage only.
			...(isPostgres ? [{ route: "cursor", url: "/legacy-query/cursor-items?limit=2&orderBy=rank&orderDirection=desc" }] : []),
		])("hands AFTER subscribers the query BEFORE subscribers produced on the $route route", async ({ url }: { route: string; url: string }) => {
			const response = await fastify.inject({ headers: { "x-trace-query": "1" }, method: "GET", url });
			const rawQuery: Record<string, string> = Object.fromEntries(new URLSearchParams(url.slice(url.indexOf("?") + 1)));

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			expect(E2eLegacyQueryItemSubscriber.beforeQueries).toHaveLength(1);
			expect(E2eLegacyQueryItemSubscriber.afterQueries).toHaveLength(1);
			expect(E2eLegacyQueryItemSubscriber.afterQueries[0]).toBe(E2eLegacyQueryItemSubscriber.beforeQueries[0]);
			expect({ ...E2eLegacyQueryItemSubscriber.afterQueries[0] }).toEqual(rawQuery);
		});

		it("validates a manual QUERY DTO and keeps its class defaults", async () => {
			await expectRejected(`/legacy-query/manual-items?limit=99&page=1`, ["limit must not be greater than 50"]);
			await expectRejected(`/legacy-query/manual-items?limit=1&page=1&orderBy=rank&orderDirection=asc`, ["orderBy must be one of the following values: label"]);

			expect(await listLabels("/legacy-query/manual-items?page=1&orderBy=label&orderDirection=asc")).toEqual(["Alpha"]);
		});

		it("validates legacy filters on a route whose plan only types the order", async () => {
			await expectRejected(`/legacy-query/order-only-items?${PAGE}&status[operator]=eq&status[value]=nope`, ["status[value] must be one of the following values: active, archived"]);

			expect(await listLabels(`/legacy-query/order-only-items?${PAGE}&status[operator]=eq&status[value]=archived`)).toEqual(["Beta"]);
			expect(await listLabels(`/legacy-query/order-only-items?${PAGE}&orderBy=rank&orderDirection=desc`)).toEqual(["Gamma", "Beta", "Alpha"]);
		});
	});
});
