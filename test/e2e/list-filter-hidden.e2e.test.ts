import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger } from "typeorm";

import { HttpStatus, Inject, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiSubscriberModule, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType, EFilterOperation } from "../../src/index";
import { E2eListHiddenCursorItemController, E2eListHiddenItemController, E2eListHiddenItemEntity, E2eListHiddenItemPolicy, E2eListHiddenItemService, E2eListHiddenManualListDto, E2eListHiddenManualResponseItemController, E2eListHiddenOwnerEntity, E2eListHiddenTypedItemController, E2eListHiddenUncheckedItemController, E2eListHiddenUserGuard, LIST_HIDDEN_DISABLED_ROUTES, LIST_HIDDEN_SECURITY } from "./list-filter-hidden";

class HiddenQueryLogger implements Logger {
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

interface IHiddenRoute {
	isOrdered: boolean;
	isPostgresOnly: boolean;
	url: string;
}

interface IQueryParameter {
	name: string;
	schema?: { enum?: Array<unknown> };
}

const OWNER_ID: string = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
// isExpose: false, select: false, hidden for the route guard, and hidden on the related entity's list response.
const HIDDEN_FIELDS: ReadonlyArray<{ field: string; value: number }> = [
	{ field: "secret", value: 7 },
	{ field: "pin", value: 11 },
	{ field: "note", value: 21 },
	{ field: "owner.code", value: 31 },
];
const HIDDEN_ORDER_FIELDS: ReadonlyArray<string> = ["note", "pin", "secret"];
const ROUTES: ReadonlyArray<IHiddenRoute> = [
	{ isOrdered: true, isPostgresOnly: false, url: "/list-hidden/items?limit=10&page=1" },
	{ isOrdered: true, isPostgresOnly: false, url: "/list-hidden/typed-items?limit=10&page=1" },
	{ isOrdered: false, isPostgresOnly: true, url: "/list-hidden/cursor-items?limit=10" },
];
const ACCEPTED_CASES: ReadonlyArray<{ count: number; query: string }> = [
	{ count: 1, query: "label[operator]=eq&label[value]=Alpha" },
	{ count: 2, query: "rank[operator]=gte&rank[value]=2" },
	{ count: 2, query: "owner.level[operator]=eq&owner.level[value]=1" },
];

const getHiddenQueries = (): Array<string> => HIDDEN_FIELDS.flatMap(({ field, value }: { field: string; value: number }): Array<string> => [`${field}[operator]=eq&${field}[value]=${String(value)}`, `${field}[operator]=gte&${field}[value]=${String(value)}`, `${field}[operator]=in&${field}[values]=${String(value)}`]);

/**
 * Declares a typed GET_LIST controller with one explicit filter field.
 * @param {string} name - Controller name.
 * @param {string} field - The configured filter field.
 * @param {Record<string, unknown>} config - Its filter config.
 * @param {boolean} hasManualResponse - Whether the route answers with the manual list response DTO, which leaves out rank.
 * @returns {new () => unknown} The controller class.
 */
function createFilterController(name: string, field: string, config: Record<string, unknown>, hasManualResponse: boolean = false): new () => unknown {
	@ApiController<E2eListHiddenItemEntity>({
		entity: E2eListHiddenItemEntity,
		name,
		path: `list-hidden/${name}`,
		routes: {
			...LIST_HIDDEN_DISABLED_ROUTES,
			[EApiRouteType.GET_LIST]: {
				...(hasManualResponse ? { dto: { [EApiDtoType.RESPONSE]: E2eListHiddenManualListDto } } : {}),
				request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { [field]: config } as never, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } },
				security: LIST_HIDDEN_SECURITY,
			},
		},
	})
	class E2eListHiddenConfiguredController {
		@Inject(E2eListHiddenItemService)
		public readonly service!: E2eListHiddenItemService;
	}

	return E2eListHiddenConfiguredController;
}

describe("GET_LIST filters on columns hidden from the list response at startup (E2E)", () => {
	it.each(HIDDEN_FIELDS.map(({ field }: { field: string }): string => field))("refuses an explicit filter config on %s", (field: string) => {
		expect(() => createFilterController(`E2eListHiddenExplicit${field.replace(".", "")}`, field, { allowedOperations: [EFilterOperation.EQ], isEnabled: true })).toThrow(`Controller "E2eListHiddenConfiguredController" route "getList": GET_LIST filter field "${field}" is hidden from the list response, so no client may filter by it`);
	});

	it.each(HIDDEN_FIELDS.map(({ field }: { field: string }): string => field))("accepts a config that disables a filter on %s", (field: string) => {
		expect(() => createFilterController(`E2eListHiddenDisabled${field.replace(".", "")}`, field, { isEnabled: false })).not.toThrow();
	});

	it("refuses a filter on a column the manual list response leaves out", () => {
		@ApiController<E2eListHiddenItemEntity>({
			entity: E2eListHiddenItemEntity,
			name: "E2eListHiddenManualLegacy",
			path: "list-hidden/manual-legacy",
			routes: { ...LIST_HIDDEN_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: E2eListHiddenManualListDto }, security: LIST_HIDDEN_SECURITY } },
		})
		class E2eListHiddenManualLegacyController {
			@Inject(E2eListHiddenItemService)
			public readonly service!: E2eListHiddenItemService;
		}

		expect(() => new E2eListHiddenManualLegacyController()).toThrow('Controller "E2eListHiddenManualLegacyController" route "getList": GET_LIST filter field "rank" is hidden from the list response, so no client may filter by it: the manual GET_LIST response DTO does not publish it');
	});

	it("refuses an explicit filter config on a field the manual list response leaves out", () => {
		const controller: new () => unknown = createFilterController("E2eListHiddenManualExplicit", "rank", { allowedOperations: [EFilterOperation.EQ], isEnabled: true }, true);

		expect(() => new controller()).toThrow('GET_LIST filter field "rank" is hidden from the list response, so no client may filter by it: the manual GET_LIST response DTO does not publish it');
	});

	it("refuses an explicit order config on a column the database does not select", () => {
		expect(() => {
			@ApiController<E2eListHiddenItemEntity>({
				entity: E2eListHiddenItemEntity,
				name: "E2eListHiddenOrderPin",
				path: "list-hidden/order-pin",
				routes: { ...LIST_HIDDEN_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { order: { fields: { pin: { isEnabled: true } } as never, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } }, security: LIST_HIDDEN_SECURITY } },
			})
			class E2eListHiddenOrderPinController {
				@Inject(E2eListHiddenItemService)
				public readonly service!: E2eListHiddenItemService;
			}

			return E2eListHiddenOrderPinController;
		}).toThrow(/GET_LIST order field "pin"/);
	});
});

describe("GET_LIST query schema of columns hidden from the list response (E2E)", () => {
	let app: INestApplication | undefined;
	let document: OpenAPIObject;

	beforeAll(async () => {
		const entities: Array<new () => unknown> = [E2eListHiddenOwnerEntity, E2eListHiddenItemEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eListHiddenItemController, E2eListHiddenTypedItemController, E2eListHiddenManualResponseItemController],
			imports: [TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
			providers: [E2eListHiddenItemPolicy, E2eListHiddenItemService, E2eListHiddenUserGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
	});

	afterAll(async () => {
		await app?.close();
	});

	it.each(["/list-hidden/items", "/list-hidden/typed-items"])("publishes no filter group or order value of a hidden column on %s", (path: string) => {
		const parameters: Array<IQueryParameter> = (document.paths[path]?.get?.parameters ?? []) as Array<IQueryParameter>;
		// A legacy route publishes `<field>[operator]` and its operands, a typed plan one deep-object parameter per field.
		const fields: Array<string> = parameters.map((parameter: IQueryParameter): string => parameter.name.replace(/\[(operator|value|values)\]$/u, ""));

		expect(fields).toEqual(expect.arrayContaining(["label", "rank", "owner.level"]));

		for (const { field } of HIDDEN_FIELDS) {
			expect(fields).not.toContain(field);
		}

		expect(parameters.find((parameter: IQueryParameter): boolean => parameter.name === "orderBy")?.schema?.enum).not.toEqual(expect.arrayContaining(["pin"]));
	});
});

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("GET_LIST filters on columns hidden from the list response on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
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
		let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
		const queryLogger: HiddenQueryLogger = new HiddenQueryLogger();

		beforeAll(async () => {
			const entities: Array<new () => unknown> = [E2eListHiddenOwnerEntity, E2eListHiddenItemEntity];
			const moduleReference = await Test.createTestingModule({
				// A CURSOR route boots only against PostgreSQL.
				controllers: [E2eListHiddenItemController, E2eListHiddenTypedItemController, ...(isPostgres ? [E2eListHiddenCursorItemController] : []), E2eListHiddenManualResponseItemController, E2eListHiddenUncheckedItemController],
				imports: [TypeOrmModule.forRoot(container ? { dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, logger: queryLogger, logging: ["query", "error"], synchronize: true, type: "better-sqlite3" }), TypeOrmModule.forFeature(entities), ApiAuthorizationModule.forRoot(), ApiSubscriberModule],
				providers: [E2eListHiddenItemPolicy, E2eListHiddenItemService, E2eListHiddenUserGuard],
			}).compile();

			app = moduleReference.createNestApplication(new FastifyAdapter());

			if (createPipe) {
				app.useGlobalPipes(createPipe());
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();

			const manager = app.get(E2eListHiddenItemService).repository.manager;

			await manager.save(E2eListHiddenOwnerEntity, { code: 31, id: OWNER_ID, level: 1 });
			await manager.save(E2eListHiddenItemEntity, [
				{ label: "Alpha", note: 21, owner: { id: OWNER_ID }, pin: 11, rank: 1, secret: 7 },
				{ label: "Beta", note: 22, pin: 12, rank: 2, secret: 8 },
				{ label: "Gamma", note: 23, owner: { id: OWNER_ID }, pin: 13, rank: 3, secret: 9 },
			]);
		});

		beforeEach(() => {
			queryLogger.queries.length = 0;
		});

		afterAll(async () => {
			await app?.close();
		});

		describe.each(ROUTES.filter((route: IHiddenRoute): boolean => isPostgres || !route.isPostgresOnly))("on $url", ({ isOrdered, url }: IHiddenRoute) => {
			it.each(ACCEPTED_CASES)("filters by $query", async ({ count, query }: { count: number; query: string }) => {
				const response = await fastify.inject({ method: "GET", url: `${url}&${query}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect((response.json() as { items: Array<unknown> }).items).toHaveLength(count);
			});

			it.each(getHiddenQueries())("answers %s with 400 before any SQL", async (query: string) => {
				const response = await fastify.inject({ method: "GET", url: `${url}&${query}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(queryLogger.queries).toEqual([]);
			});

			it("does not tell one hidden value from another through a filter", async () => {
				const responses: Array<{ body: unknown; statusCode: number }> = [];

				for (const value of [7, 8, 9, 10]) {
					const response = await fastify.inject({ method: "GET", url: `${url}&secret[operator]=eq&secret[value]=${String(value)}` });

					responses.push({ body: response.json(), statusCode: response.statusCode });
				}

				expect(responses.map(({ statusCode }: { statusCode: number }): number => statusCode)).toEqual([HttpStatus.BAD_REQUEST, HttpStatus.BAD_REQUEST, HttpStatus.BAD_REQUEST, HttpStatus.BAD_REQUEST]);
				expect(new Set(responses.map(({ body }: { body: unknown }): string => JSON.stringify(body))).size).toBe(1);
			});

			it.runIf(isOrdered).each(HIDDEN_ORDER_FIELDS)("refuses to order by %s", async (field: string) => {
				const response = await fastify.inject({ method: "GET", url: `${url}&orderBy=${field}&orderDirection=asc` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(queryLogger.queries).toEqual([]);
			});

			it.runIf(isOrdered)("orders by a column the response publishes", async () => {
				const response = await fastify.inject({ method: "GET", url: `${url}&orderBy=rank&orderDirection=desc` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect((response.json() as { items: Array<{ label: string }> }).items.map(({ label }: { label: string }): string => label)).toEqual(["Gamma", "Beta", "Alpha"]);
			});
		});

		describe("on a route whose manual list response leaves out rank", () => {
			const url: string = "/list-hidden/manual-response-items?limit=10&page=1";

			it("filters by a field the response publishes", async () => {
				const response = await fastify.inject({ method: "GET", url: `${url}&label[operator]=eq&label[value]=Alpha` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect((response.json() as { items: Array<unknown> }).items, JSON.stringify(response.json())).toHaveLength(1);
			});

			it.each(["rank[operator]=eq&rank[value]=1", "orderBy=rank&orderDirection=asc", ...getHiddenQueries()])("answers %s with 400 before any SQL", async (query: string) => {
				const response = await fastify.inject({ method: "GET", url: `${url}&${query}` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(queryLogger.queries).toEqual([]);
			});
		});

		describe("on a route the factory built without the startup check", () => {
			const url: string = "/list-hidden/unchecked-items?limit=10&page=1";

			it("filters by a field the response publishes", async () => {
				const response = await fastify.inject({ method: "GET", url: `${url}&label[operator]=eq&label[value]=Alpha` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
				expect((response.json() as { items: Array<unknown> }).items, JSON.stringify(response.json())).toHaveLength(1);
			});

			it("answers a filter on a field the manual list response leaves out with 400 FILTER_NOT_VALID before any SQL", async () => {
				const response = await fastify.inject({ method: "GET", url: `${url}&rank[operator]=eq&rank[value]=1` });

				expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.BAD_REQUEST);
				expect(JSON.stringify(response.json())).toContain("FILTER_NOT_VALID");
				expect(queryLogger.queries).toEqual([]);
			});
		});
	});
});
