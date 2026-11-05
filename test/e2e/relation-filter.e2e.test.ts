import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { OpenAPIObject } from "@nestjs/swagger";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { DataSource, ObjectLiteral } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiServiceBase, IApiControllerPropertiesRouteGetListQueryFilter } from "../../src/index";

import { ApiAuthorizationModule, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal } from "../../src/index";
import {
	createRelationFilterController,
	createRelationFilterPolicy,
	createRelationFilterService,
	ERelationFilterState as State,
	RELATION_FILTER_COLUMN_FILTER,
	RELATION_FILTER_CONDITION_FILTER,
	RELATION_FILTER_ENTITIES,
	RELATION_FILTER_GAME_FILTER,
	RELATION_FILTER_INVERSE_FILTER,
	RELATION_FILTER_MAX_VALUES,
	RELATION_FILTER_MISSING_FILTER,
	RELATION_FILTER_OFFER_FILTER,
	RELATION_FILTER_OPERATOR_FILTER,
	RELATION_FILTER_PLAIN_OFFER_FILTER,
	RELATION_FILTER_TAGGED_FILTER,
	RelationFilterAuthGuard,
	RelationFilterCategoryEntity,
	RelationFilterCategoryGameEntity,
	RelationFilterColumnGameEntity,
	RelationFilterColumnLinkEntity,
	RelationFilterFeaturedCategoryEntity,
	RelationFilterGameEntity,
	RelationFilterGameSourceLinkEntity,
	RelationFilterInverseGameEntity,
	RelationFilterInverseLinkEntity,
	RelationFilterOfferEntity,
	RelationFilterProviderEntity,
	RelationFilterSourceEntity,
	RelationFilterTaggedGameEntity,
} from "./relation-filter";

type TDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

const MARIADB_PASSWORD: string = "relation-filter";
const MYSQL_PORT: number = 3306;
const PAGE_LIMIT: number = 2;

const id = (prefix: string, index: number): string => `${prefix}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const game = (index: number): string => id("a", index);
const category = (index: number): string => id("b", index);
const provider = (index: number): string => id("c", index);
const source = (index: number): string => id("d", index);
const link = (index: number): string => id("e", index);

const CATEGORY_ACTIVE_ONE: string = category(1);
const CATEGORY_ACTIVE_TWO: string = category(2);
const CATEGORY_INACTIVE: string = category(3);
const CATEGORY_SOFT_DELETED: string = category(4);
const CATEGORY_UNUSED: string = category(5);
const PROVIDER_ACTIVE: string = provider(1);
const PROVIDER_INACTIVE: string = provider(2);

// Which categories each game of a model belongs to: game 5 only through a soft-deleted link, game 7 through nothing, game 8 outside the scope.
const MEMBERSHIPS: ReadonlyArray<{ categoryId: string; gameIndex: number; isDeleted?: boolean }> = [
	{ categoryId: CATEGORY_ACTIVE_ONE, gameIndex: 1 },
	{ categoryId: CATEGORY_ACTIVE_ONE, gameIndex: 2 },
	{ categoryId: CATEGORY_ACTIVE_TWO, gameIndex: 2 },
	{ categoryId: CATEGORY_ACTIVE_TWO, gameIndex: 3 },
	{ categoryId: CATEGORY_INACTIVE, gameIndex: 4 },
	{ categoryId: CATEGORY_ACTIVE_ONE, gameIndex: 5, isDeleted: true },
	{ categoryId: CATEGORY_SOFT_DELETED, gameIndex: 6 },
	{ categoryId: CATEGORY_ACTIVE_ONE, gameIndex: 8 },
];

const GAME_COUNT: number = 8;
const OUT_OF_SCOPE_GAME: number = 8;

interface IModel {
	entity: Type<object>;
	filter: IApiControllerPropertiesRouteGetListQueryFilter<never>;
	key: string;
	name: string;
	seedMemberships: (dataSource: DataSource) => Promise<void>;
	service: Type<ApiServiceBase<never>>;
}

const seedLinks = async (dataSource: DataSource, entity: Type<ObjectLiteral>): Promise<void> => {
	for (const [index, membership] of MEMBERSHIPS.entries()) {
		const repository = dataSource.getRepository(entity);

		await repository.save({ categoryId: membership.categoryId, gameId: game(membership.gameIndex), id: link(index + 1) });

		if (membership.isDeleted) {
			await repository.softDelete({ id: link(index + 1) });
		}
	}
};

const seedGames = async (dataSource: DataSource, entity: Type<ObjectLiteral>): Promise<void> => {
	for (let index: number = 1; index <= GAME_COUNT; index += 1) {
		await dataSource.getRepository(entity).save({ id: game(index), region: index === OUT_OF_SCOPE_GAME ? "us" : "eu" });
	}
};

const asModel = <E extends object>(name: string, key: string, entity: Type<E>, filter: IApiControllerPropertiesRouteGetListQueryFilter<E>, seedMemberships: (dataSource: DataSource) => Promise<void>): IModel => ({
	entity,
	filter: filter as never,
	key,
	name,
	seedMemberships,
	service: createRelationFilterService(entity) as never,
});

const MODELS: ReadonlyArray<IModel> = [
	asModel("relation-filter-link", "category.id", RelationFilterGameEntity, RELATION_FILTER_GAME_FILTER, async (dataSource: DataSource) => seedLinks(dataSource, RelationFilterCategoryGameEntity)),
	asModel("relation-filter-inverse", "categoryLinks.category.id", RelationFilterInverseGameEntity, RELATION_FILTER_INVERSE_FILTER, async (dataSource: DataSource) => seedLinks(dataSource, RelationFilterInverseLinkEntity)),
	asModel("relation-filter-tagged", "categories.id", RelationFilterTaggedGameEntity, RELATION_FILTER_TAGGED_FILTER, async (dataSource: DataSource) => {
		for (const membership of MEMBERSHIPS) {
			// A junction row has no delete date, so this model holds no soft-deleted link.
			if (!membership.isDeleted) {
				await dataSource.createQueryBuilder().relation(RelationFilterTaggedGameEntity, "categories").of(game(membership.gameIndex)).add(membership.categoryId);
			}
		}
	}),
	asModel("relation-filter-column", "category.id", RelationFilterColumnGameEntity, RELATION_FILTER_COLUMN_FILTER, async (dataSource: DataSource) => seedLinks(dataSource, RelationFilterColumnLinkEntity)),
];

const CONTROLLERS: ReadonlyArray<{ controller: Type<unknown>; isCursor: boolean; isScoped: boolean; model: IModel; path: string }> = MODELS.flatMap((model: IModel) =>
	[
		{ isCursor: false, isScoped: false, suffix: "page" },
		{ isCursor: false, isScoped: true, suffix: "page-scoped" },
		{ isCursor: true, isScoped: false, suffix: "cursor" },
		{ isCursor: true, isScoped: true, suffix: "cursor-scoped" },
	].map(({ isCursor, isScoped, suffix }: { isCursor: boolean; isScoped: boolean; suffix: string }) => {
		const path: string = `${model.name}-${suffix}`;

		return { controller: createRelationFilterController(path, model.entity, model.service, model.filter, { isCursor, isScoped }), isCursor, isScoped, model, path };
	}),
);

const GAME_SERVICE: Type<ApiServiceBase<never>> = (MODELS[0] as IModel).service;
const OFFER_SERVICE = createRelationFilterService(RelationFilterOfferEntity);
const PLAIN_ROUTE: { isCursor: boolean; isScoped: boolean } = { isCursor: false, isScoped: false };

const EXTRA_CONTROLLERS: ReadonlyArray<Type<unknown>> = [
	createRelationFilterController("relation-filter-operators", RelationFilterGameEntity, GAME_SERVICE as never, RELATION_FILTER_OPERATOR_FILTER, PLAIN_ROUTE),
	createRelationFilterController("relation-filter-conditions", RelationFilterGameEntity, GAME_SERVICE as never, RELATION_FILTER_CONDITION_FILTER, PLAIN_ROUTE),
	createRelationFilterController("relation-filter-missing", RelationFilterGameEntity, GAME_SERVICE as never, RELATION_FILTER_MISSING_FILTER, PLAIN_ROUTE),
	createRelationFilterController("relation-filter-offers", RelationFilterOfferEntity, OFFER_SERVICE, RELATION_FILTER_OFFER_FILTER, PLAIN_ROUTE),
	createRelationFilterController("relation-filter-plain-offers", RelationFilterOfferEntity, OFFER_SERVICE, RELATION_FILTER_PLAIN_OFFER_FILTER, PLAIN_ROUTE),
];

const POLICIES: ReadonlyArray<Type<unknown>> = MODELS.map((model: IModel) => createRelationFilterPolicy(model.entity));

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "relation_filter", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

describe.each<{ database: TDatabase }>([{ database: "sqlite" }, { database: "postgres" }, { database: "mysql" }, { database: "mariadb" }])("Declared relation filters on $database (E2E)", ({ database }: { database: TDatabase }) => {
	const isPostgres: boolean = database === "postgres";
	let app: INestApplication | undefined;
	let document: OpenAPIObject;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let postgresContainer: StartedPostgreSqlContainer | undefined;

	const connection = (): TypeOrmModuleOptions => {
		if (mariaDbContainer) {
			return { database: "relation_filter", dropSchema: true, entities: RELATION_FILTER_ENTITIES, host: mariaDbContainer.getHost(), password: MARIADB_PASSWORD, port: mariaDbContainer.getMappedPort(MYSQL_PORT), synchronize: true, type: "mysql", username: "root" };
		}

		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities: RELATION_FILTER_ENTITIES, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities: RELATION_FILTER_ENTITIES, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities: RELATION_FILTER_ENTITIES, synchronize: true, type: "better-sqlite3" };
	};

	const eq = (key: string, value: string): string => `${key}[operator]=eq&${key}[value]=${value}`;
	const inList = (key: string, values: ReadonlyArray<string>): string => [`${key}[operator]=in`, ...values.map((value: string) => `${key}[values]=${value}`)].join("&");
	const request = async (url: string): Promise<{ json: () => unknown; statusCode: number }> => await fastify.inject({ method: "GET", url });

	// Walks every page of a route, so a filter that fails to narrow a later page or to count its rows shows.
	const walkPages = async (path: string, query: string): Promise<{ ids: Array<string>; totalCount: number; totalPages: number }> => {
		const ids: Array<string> = [];
		let page: number = 1;
		let totalCount: number = -1;
		let totalPages: number = 1;

		while (page <= totalPages) {
			const response = await request(`/${path}?limit=${String(PAGE_LIMIT)}&page=${String(page)}&${query}`);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			const body = response.json() as { items: Array<{ id: string }>; totalCount: number; totalPages: number };

			ids.push(...body.items.map((item: { id: string }) => item.id));
			totalCount = body.totalCount;
			totalPages = Math.max(body.totalPages, 1);
			page += 1;
		}

		return { ids, totalCount, totalPages };
	};

	// Walks a cursor route to its end, then back again.
	const walkCursor = async (path: string, query: string): Promise<Array<string>> => {
		const ids: Array<string> = [];
		let after: null | string = null;

		do {
			const response = await request(`/${path}?limit=${String(PAGE_LIMIT)}&${query}${after ? `&after=${after}` : ""}`);

			expect(response.statusCode, JSON.stringify(response.json())).toBe(HttpStatus.OK);
			const body = response.json() as { items: Array<{ id: string }>; nextCursor: null | string; previousCursor: null | string };

			ids.push(...body.items.map((item: { id: string }) => item.id));

			if (!body.nextCursor && body.previousCursor) {
				const back = await request(`/${path}?limit=${String(PAGE_LIMIT)}&${query}&before=${body.previousCursor}`);

				expect(back.statusCode).toBe(HttpStatus.OK);
				expect((back.json() as { items: Array<{ id: string }> }).items.every((item: { id: string }) => ids.includes(item.id))).toBe(true);
			}

			after = body.nextCursor;
		} while (after);

		return ids;
	};

	beforeAll(async () => {
		if (database === "postgres") {
			postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		if (database === "mysql") {
			mysqlContainer = await new MySqlContainer("mysql:8.4").start();
		}

		if (database === "mariadb") {
			mariaDbContainer = await startMariaDb();
		}

		const moduleReference = await Test.createTestingModule({
			// A cursor route runs only on PostgreSQL, which stops startup on the other databases.
			controllers: [...CONTROLLERS.filter(({ isCursor }: { isCursor: boolean }) => isPostgres || !isCursor).map(({ controller }: { controller: Type<unknown> }) => controller), ...EXTRA_CONTROLLERS],
			imports: [TypeOrmModule.forRoot(connection()), TypeOrmModule.forFeature(RELATION_FILTER_ENTITIES), ApiAuthorizationModule.forRoot({ principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) } }), ApiSubscriberModule],
			providers: [RelationFilterAuthGuard, OFFER_SERVICE, ...MODELS.map((model: IModel) => model.service), ...POLICIES],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		document = SwaggerModule.createDocument(app, new DocumentBuilder().build());
		fastify = app.getHttpAdapter().getInstance();
		await (fastify as unknown as { ready: () => Promise<void> }).ready();

		const dataSource: DataSource = app.get(getDataSourceToken());

		await dataSource.getRepository(RelationFilterCategoryEntity).save([
			{ id: CATEGORY_ACTIVE_ONE, state: State.ACTIVE },
			{ id: CATEGORY_ACTIVE_TWO, state: State.ACTIVE },
			{ id: CATEGORY_INACTIVE, state: State.INACTIVE },
			{ id: CATEGORY_SOFT_DELETED, state: State.ACTIVE },
			{ id: CATEGORY_UNUSED, state: State.ACTIVE },
		]);
		await dataSource.getRepository(RelationFilterCategoryEntity).softDelete({ id: CATEGORY_SOFT_DELETED });
		await dataSource.getRepository(RelationFilterProviderEntity).save([
			{ code: "Alpha_1", foundedAt: new Date("2020-01-01T00:00:00.000Z"), id: PROVIDER_ACTIVE, score: 10, state: State.ACTIVE },
			{ code: "Beta", foundedAt: new Date("2021-01-01T00:00:00.000Z"), id: PROVIDER_INACTIVE, score: 20, state: State.INACTIVE },
		]);
		await dataSource.getRepository(RelationFilterOfferEntity).save([
			{ id: link(201), providerId: PROVIDER_ACTIVE },
			{ id: link(202), providerId: PROVIDER_INACTIVE },
			{ id: link(203), providerId: null },
		]);

		for (const model of MODELS) {
			await seedGames(dataSource, model.entity as Type<ObjectLiteral>);
			await model.seedMemberships(dataSource);
		}

		// Games 1 and 2 reach the active provider, game 3 the inactive one, game 4 points at a source of another game, and game 5 at no source.
		await dataSource.getRepository(RelationFilterSourceEntity).save([
			{ gameId: game(1), id: source(1), providerId: PROVIDER_ACTIVE },
			{ gameId: game(2), id: source(2), providerId: PROVIDER_ACTIVE },
			{ gameId: game(3), id: source(3), providerId: PROVIDER_INACTIVE },
			{ gameId: game(8), id: source(8), providerId: PROVIDER_ACTIVE },
		]);

		for (const [gameIndex, sourceIndex] of [
			[1, 1],
			[2, 2],
			[3, 3],
			[4, 1],
			[8, 8],
		] as const) {
			await dataSource.getRepository(RelationFilterGameEntity).update({ id: game(gameIndex) }, { gameSourceId: source(sourceIndex) });
		}

		// Game 2 reaches the active provider through the link and game 3 the inactive one.
		await dataSource.getRepository(RelationFilterGameSourceLinkEntity).save([
			{ gameId: game(2), id: link(301), sourceId: source(1) },
			{ gameId: game(3), id: link(302), sourceId: source(3) },
		]);

		// The second link to the same target table: game 1 is featured in the second category, game 3 in the first.
		await dataSource.getRepository(RelationFilterFeaturedCategoryEntity).save([
			{ categoryId: CATEGORY_ACTIVE_TWO, gameId: game(1), id: link(101) },
			{ categoryId: CATEGORY_ACTIVE_ONE, gameId: game(3), id: link(102) },
			{ categoryId: CATEGORY_INACTIVE, gameId: game(4), id: link(103) },
		]);

		await dataSource.getRepository(RelationFilterColumnGameEntity).update({ id: game(1) }, { categoryId: CATEGORY_ACTIVE_TWO });
		await dataSource.getRepository(RelationFilterColumnGameEntity).update({ id: game(2) }, { categoryId: CATEGORY_ACTIVE_ONE });
		await dataSource.getRepository(RelationFilterColumnGameEntity).update({ id: game(3) }, { categoryId: CATEGORY_ACTIVE_ONE });
	}, 600_000);

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();
	}, 120_000);

	describe.each(MODELS.map((model: IModel) => ({ key: model.key, model: model.name })))("$model by $key", ({ key, model }: { key: string; model: string }) => {
		const page: string = `${model}-page`;
		const hasSoftDeletedLink: boolean = model !== "relation-filter-tagged";

		it("filters with eq, once each, and counts what it filters", async () => {
			await expect(walkPages(page, eq(key, CATEGORY_ACTIVE_ONE))).resolves.toEqual({ ids: [game(1), game(2), game(8)], totalCount: 3, totalPages: 2 });
		});

		it("filters with in, without a duplicate for a game in two categories", async () => {
			await expect(walkPages(page, inList(key, [CATEGORY_ACTIVE_ONE, CATEGORY_ACTIVE_TWO]))).resolves.toEqual({ ids: [game(1), game(2), game(3), game(8)], totalCount: 4, totalPages: 2 });
		});

		it("accepts a list at its cap and answers 400 with only a code above it", async () => {
			expect((await request(`/${page}?limit=10&page=1&${inList(key, [category(1), category(2), category(3)])}`)).statusCode).toBe(HttpStatus.OK);

			const response = await request(
				`/${page}?limit=10&page=1&${inList(
					key,
					Array.from({ length: RELATION_FILTER_MAX_VALUES + 1 }, (_: unknown, index: number) => category(index + 1)),
				)}`,
			);

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect((response.json() as { message: unknown }).message).toBe("FILTER_NOT_VALID");
		});

		it("answers 400 with only a code for a malformed value", async () => {
			const response = await request(`/${page}?limit=10&page=1&${eq(key, "not-a-uuid")}`);

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(JSON.stringify(response.json())).not.toContain("not-a-uuid");
		});

		it("answers 400 for a path nobody declared and for an operator nobody allowed", async () => {
			expect((await request(`/${page}?limit=10&page=1&${eq(`${key.slice(0, key.lastIndexOf("."))}.state`, "ACTIVE")}`)).statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect((await request(`/${page}?limit=10&page=1&${key}[operator]=ne&${key}[value]=${CATEGORY_ACTIVE_ONE}`)).statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect((await request(`/${page}?limit=10&page=1&${key}[operator]=isnull`)).statusCode).toBe(HttpStatus.BAD_REQUEST);
		});

		it("matches no game for an inactive target or a soft-deleted target", async () => {
			await expect(walkPages(page, eq(key, CATEGORY_INACTIVE))).resolves.toEqual({ ids: [], totalCount: 0, totalPages: 1 });
			await expect(walkPages(page, eq(key, CATEGORY_SOFT_DELETED))).resolves.toEqual({ ids: [], totalCount: 0, totalPages: 1 });
		});

		// A junction row has no delete date, so the ManyToMany model holds no soft-deleted link.
		it.skipIf(!hasSoftDeletedLink)("does not match through a soft-deleted link", async () => {
			const { ids }: { ids: Array<string> } = await walkPages(page, eq(key, CATEGORY_ACTIVE_ONE));

			expect(ids).not.toContain(game(5));
		});

		it("narrows with a HOOKS scope at the same time, in the rows and in the count", async () => {
			await expect(walkPages(`${page}-scoped`, eq(key, CATEGORY_ACTIVE_ONE))).resolves.toEqual({ ids: [game(1), game(2)], totalCount: 2, totalPages: 1 });
		});

		// CURSOR runs on PostgreSQL only: on any other database the route stops startup, so it is not registered there.
		it.skipIf(!isPostgres)("walks every cursor page, alone and under a scope", async () => {
			await expect(walkCursor(`${model}-cursor`, eq(key, CATEGORY_ACTIVE_ONE))).resolves.toEqual([game(1), game(2), game(8)]);
			await expect(walkCursor(`${model}-cursor`, inList(key, [CATEGORY_ACTIVE_ONE, CATEGORY_ACTIVE_TWO]))).resolves.toEqual([game(1), game(2), game(3), game(8)]);
			await expect(walkCursor(`${model}-cursor-scoped`, eq(key, CATEGORY_ACTIVE_ONE))).resolves.toEqual([game(1), game(2)]);
		});

		it("refuses a forged raw operator on a page route", async () => {
			expect((await request(`/${page}?limit=10&page=1&${key}[operator]=raw&${key}[value]=1=1`)).statusCode).toBe(HttpStatus.BAD_REQUEST);
		});

		it.skipIf(!isPostgres)("refuses a forged raw operator on a cursor route", async () => {
			expect((await request(`/${model}-cursor?limit=10&${key}[operator]=raw&${key}[value]=1=1`)).statusCode).toBe(HttpStatus.BAD_REQUEST);
		});
	});

	describe("Core's shape", () => {
		const page: string = "relation-filter-link-page";
		const cursor: string = "relation-filter-link-cursor";
		const providerKey: string = "gameSource.provider.id";

		it("filters across a composite to-one hop and a second to-one hop", async () => {
			// Game 4 points at the source of game 1, so the composite join keeps it out.
			await expect(walkPages(page, eq(providerKey, PROVIDER_ACTIVE))).resolves.toEqual({ ids: [game(1), game(2), game(8)], totalCount: 3, totalPages: 2 });
			await expect(walkPages(page, inList(providerKey, [PROVIDER_ACTIVE, PROVIDER_INACTIVE]))).resolves.toEqual({ ids: [game(1), game(2), game(8)], totalCount: 3, totalPages: 2 });
		});

		it("matches no game through an inactive provider", async () => {
			await expect(walkPages(page, eq(providerKey, PROVIDER_INACTIVE))).resolves.toEqual({ ids: [], totalCount: 0, totalPages: 1 });
		});

		it("uses the provider and the category filters together", async () => {
			const query: string = `${eq(providerKey, PROVIDER_ACTIVE)}&${eq("category.id", CATEGORY_ACTIVE_TWO)}`;

			await expect(walkPages(page, query)).resolves.toEqual({ ids: [game(2)], totalCount: 1, totalPages: 1 });
		});

		it.skipIf(!isPostgres)("uses them together on a cursor walk", async () => {
			await expect(walkCursor(cursor, `${eq(providerKey, PROVIDER_ACTIVE)}&${eq("category.id", CATEGORY_ACTIVE_TWO)}`)).resolves.toEqual([game(2)]);
		});

		it("keeps two links to one target table apart under their own names", async () => {
			await expect(walkPages(page, eq("featuredCategory.id", CATEGORY_ACTIVE_ONE))).resolves.toEqual({ ids: [game(3)], totalCount: 1, totalPages: 1 });
			await expect(walkPages(page, eq("featuredCategory.id", CATEGORY_ACTIVE_TWO))).resolves.toEqual({ ids: [game(1)], totalCount: 1, totalPages: 1 });
			await expect(walkPages(page, eq("featuredCategory.id", CATEGORY_INACTIVE))).resolves.toEqual({ ids: [], totalCount: 0, totalPages: 1 });
			await expect(walkPages(page, `${eq("category.id", CATEGORY_ACTIVE_ONE)}&${eq("featuredCategory.id", CATEGORY_ACTIVE_TWO)}`)).resolves.toEqual({ ids: [game(1)], totalCount: 1, totalPages: 1 });
			await expect(walkPages(page, `${eq("category.id", CATEGORY_ACTIVE_TWO)}&${eq("featuredCategory.id", CATEGORY_ACTIVE_ONE)}`)).resolves.toEqual({ ids: [game(3)], totalCount: 1, totalPages: 1 });
		});

		it("publishes the filters and their caps, and hides the fixed conditions", async () => {
			const parameters: Array<{ name: string; schema?: { oneOf?: Array<{ properties: { operator: { enum: Array<string> }; values?: { maxItems?: number } } }> } }> = (document.paths[`/${page}`]?.get?.parameters ?? []) as never;

			for (const key of ["category.id", "featuredCategory.id", "gameSource.provider.id"]) {
				const branches = parameters.find((parameter: { name: string }) => parameter.name === key)?.schema?.oneOf ?? [];

				expect(branches.map((branch) => branch.properties.operator.enum[0]).toSorted((left?: string, right?: string) => String(left).localeCompare(String(right)))).toEqual(["eq", "in"]);
				expect(branches.find((branch) => branch.properties.operator.enum[0] === "in")?.properties.values?.maxItems).toBe(RELATION_FILTER_MAX_VALUES);
			}

			expect(JSON.stringify(parameters)).not.toContain("ACTIVE");
			await expect(JSON.stringify(parameters, undefined, "\t")).toMatchFileSnapshot("./relation-filter/openapi.snapshot.txt");
		});
	});

	describe("the operators of an EXISTS path", () => {
		const page: string = "relation-filter-operators";
		const code: string = "gameSource.provider.code";
		const score: string = "gameSource.provider.score";
		const foundedAt: string = "gameSource.provider.foundedAt";
		const first: ReadonlyArray<string> = [game(1), game(2), game(8)];
		const second: ReadonlyArray<string> = [game(3)];
		const op = (key: string, operator: string, value: string): string => `${key}[operator]=${operator}&${key}[value]=${encodeURIComponent(value)}`;
		const between = (key: string, from: string, to: string): string => `${key}[operator]=between&${key}[values]=${encodeURIComponent(from)}&${key}[values]=${encodeURIComponent(to)}`;

		it.each<[string, string, string, ReadonlyArray<string>]>([
			["eq", "eq", "Alpha_1", first],
			["eql", "eql", "alpha_1", first],
			["cont", "cont", "lpha", first],
			["contl", "contl", "LPHA", first],
			["starts", "starts", "Be", second],
			["startsl", "startsl", "BE", second],
			["ends", "ends", "ta", second],
			["endsl", "endsl", "TA", second],
			["cont, where a wildcard of the client matches itself", "cont", "_", first],
			["cont, where a wildcard of the client matches no other text", "cont", "%", []],
		])("compares text with %s", async (_case: string, operator: string, value: string, expected: ReadonlyArray<string>) => {
			await expect(walkPages(page, op(code, operator, value)).then(({ ids }: { ids: Array<string> }) => ids)).resolves.toEqual(expected);
		});

		it("compares text with in and inl", async () => {
			await expect(walkPages(page, inList(code, ["Beta"])).then(({ ids }: { ids: Array<string> }) => ids)).resolves.toEqual(second);
			await expect(walkPages(page, `${code}[operator]=inl&${code}[values]=BETA`).then(({ ids }: { ids: Array<string> }) => ids)).resolves.toEqual(second);
		});

		it.each<[string, string, ReadonlyArray<string>]>([
			["gt", "10", second],
			["gte", "10", [game(1), game(2), game(3), game(8)]],
			["lt", "20", first],
			["lte", "20", [game(1), game(2), game(3), game(8)]],
			["eq", "20", second],
		])("compares a number with %s", async (operator: string, value: string, expected: ReadonlyArray<string>) => {
			await expect(walkPages(page, op(score, operator, value)).then(({ ids }: { ids: Array<string> }) => ids)).resolves.toEqual(expected);
		});

		it("compares a number with between and in", async () => {
			await expect(walkPages(page, between(score, "15", "25")).then(({ ids }: { ids: Array<string> }) => ids)).resolves.toEqual(second);
			await expect(walkPages(page, inList(score, ["10"])).then(({ ids }: { ids: Array<string> }) => ids)).resolves.toEqual(first);
		});

		it("compares a date", async () => {
			await expect(walkPages(page, op(foundedAt, "gt", "2020-06-01T00:00:00.000Z")).then(({ ids }: { ids: Array<string> }) => ids)).resolves.toEqual(second);
			await expect(walkPages(page, op(foundedAt, "lt", "2020-06-01T00:00:00.000Z")).then(({ ids }: { ids: Array<string> }) => ids)).resolves.toEqual(first);
			await expect(walkPages(page, between(foundedAt, "2019-06-01T00:00:00.000Z", "2020-06-01T00:00:00.000Z")).then(({ ids }: { ids: Array<string> }) => ids)).resolves.toEqual(first);
		});
	});

	describe("fixed conditions along a path", () => {
		it("hold on a hop before the last", async () => {
			await expect(walkPages("relation-filter-conditions", eq("gameSource.provider.id", PROVIDER_ACTIVE))).resolves.toEqual({ ids: [game(1)], totalCount: 1, totalPages: 1 });
		});

		it("hold on a relation a link leads on to", async () => {
			await expect(walkPages("relation-filter-conditions", eq("sourceLink.provider.id", PROVIDER_ACTIVE))).resolves.toEqual({ ids: [game(2)], totalCount: 1, totalPages: 1 });
			await expect(walkPages("relation-filter-conditions", eq("sourceLink.provider.id", PROVIDER_INACTIVE))).resolves.toEqual({ ids: [], totalCount: 0, totalPages: 1 });
		});

		it("hold on the row of a link", async () => {
			await expect(walkPages("relation-filter-conditions", eq("category.id", CATEGORY_ACTIVE_ONE))).resolves.toEqual({ ids: [game(1)], totalCount: 1, totalPages: 1 });
		});
	});

	describe("a relation filter the query leaves out", () => {
		const page: string = "relation-filter-missing";

		it("answers 400 under REJECT", async () => {
			expect((await request(`/${page}?limit=10&page=1`)).statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect((await request(`/${page}?limit=10&page=1&${eq("category.id", CATEGORY_ACTIVE_ONE)}`)).statusCode).toBe(HttpStatus.BAD_REQUEST);
		});

		it("applies its condition under USE_DEFAULT", async () => {
			await expect(walkPages(page, eq("featuredCategory.id", CATEGORY_ACTIVE_ONE))).resolves.toEqual({ ids: [game(3)], totalCount: 1, totalPages: 1 });
		});

		it("gives way to the condition the query sends", async () => {
			await expect(walkPages(page, `${eq("category.id", CATEGORY_ACTIVE_ONE)}&${eq("featuredCategory.id", CATEGORY_ACTIVE_TWO)}`)).resolves.toEqual({ ids: [game(1)], totalCount: 1, totalPages: 1 });
		});
	});

	describe("a one-hop to-one path", () => {
		it("with fixed conditions is an EXISTS path", async () => {
			await expect(walkPages("relation-filter-offers", eq("provider.id", PROVIDER_ACTIVE))).resolves.toEqual({ ids: [link(201)], totalCount: 1, totalPages: 1 });
			await expect(walkPages("relation-filter-offers", eq("provider.id", PROVIDER_INACTIVE))).resolves.toEqual({ ids: [], totalCount: 0, totalPages: 1 });
			await expect(walkPages("relation-filter-offers", inList("provider.id", [PROVIDER_ACTIVE, PROVIDER_INACTIVE]))).resolves.toEqual({ ids: [link(201)], totalCount: 1, totalPages: 1 });
		});

		it("leaves an eager relation of the row loaded", async () => {
			const response = await request(`/relation-filter-offers?limit=10&page=1&${eq("provider.id", PROVIDER_ACTIVE)}`);

			expect((response.json() as { items: Array<{ provider: { id: string } }> }).items.map((item: { provider: { id: string } }) => item.provider.id)).toEqual([PROVIDER_ACTIVE]);
		});

		it("without them keeps its left join", async () => {
			await expect(walkPages("relation-filter-plain-offers", eq("provider.id", PROVIDER_INACTIVE))).resolves.toEqual({ ids: [link(202)], totalCount: 1, totalPages: 1 });
			await expect(walkPages("relation-filter-plain-offers", `provider.id[operator]=ne&provider.id[value]=${PROVIDER_ACTIVE}`)).resolves.toEqual({ ids: [link(202)], totalCount: 1, totalPages: 1 });
		});
	});

	describe("a real column of the same meaning", () => {
		const page: string = "relation-filter-column-page";

		it("stays a plain direct filter, and works with the relation filter of a similar name", async () => {
			await expect(walkPages(page, eq("categoryId", CATEGORY_ACTIVE_ONE))).resolves.toEqual({ ids: [game(2), game(3)], totalCount: 2, totalPages: 1 });
			await expect(walkPages(page, `${eq("categoryId", CATEGORY_ACTIVE_ONE)}&${eq("category.id", CATEGORY_ACTIVE_TWO)}`)).resolves.toEqual({ ids: [game(2), game(3)], totalCount: 2, totalPages: 1 });
			await expect(walkPages(page, `${eq("categoryId", CATEGORY_ACTIVE_ONE)}&${eq("category.id", CATEGORY_ACTIVE_ONE)}`)).resolves.toEqual({ ids: [game(2)], totalCount: 1, totalPages: 1 });
		});

		it("keeps a filter on the column the condition attaches to", async () => {
			await expect(walkPages(page, `${eq("id", game(2))}&${eq("category.id", CATEGORY_ACTIVE_ONE)}`)).resolves.toEqual({ ids: [game(2)], totalCount: 1, totalPages: 1 });
			await expect(walkPages(page, `${eq("id", game(3))}&${eq("category.id", CATEGORY_ACTIVE_ONE)}`)).resolves.toEqual({ ids: [], totalCount: 0, totalPages: 1 });
		});
	});
});
