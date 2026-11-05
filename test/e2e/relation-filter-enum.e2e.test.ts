import "reflect-metadata";

import type { INestApplication, Type } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { DataSource } from "typeorm";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getDataSourceToken, TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import type { ApiServiceBase } from "../../src/index";

import { ApiAuthorizationModule, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType } from "../../src/index";
import { createRelationFilterController, createRelationFilterPolicy, createRelationFilterService, RelationFilterAuthGuard } from "./relation-filter";
import {
	ERelationFilterEnumCategoryState as CategoryState,
	ERelationFilterEnumProviderState as ProviderState,
	ERelationFilterEnumTagState as TagState,
	RELATION_FILTER_ENUM_ENTITIES,
	RELATION_FILTER_ENUM_FILTER,
	RELATION_FILTER_ENUM_IAM_AUTHORIZATION,
	RELATION_FILTER_ENUM_IAM_NAMESPACE,
	RelationFilterEnumCategoryEntity,
	RelationFilterEnumCategoryGameEntity,
	RelationFilterEnumGameEntity,
	RelationFilterEnumProviderEntity,
	RelationFilterEnumSourceEntity,
	RelationFilterEnumTagEntity,
} from "./relation-filter-enum";

type TDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

interface IStatement {
	Action: Array<string>;
	Condition?: Record<string, Record<string, unknown>>;
	Effect: EApiPolicyEffect;
	Resource: Array<string>;
}

const MARIADB_PASSWORD: string = "relation-filter-enum";
const MYSQL_PORT: number = 3306;
const PAGE_LIMIT: number = 2;
const POLICY_ID: string = "relation-filter-enum-policy";

const id = (prefix: string, index: number): string => `${prefix}0000000-0000-4000-8000-${String(index).padStart(12, "0")}`;
const game = (index: number): string => id("a", index);
const category = (index: number): string => id("b", index);
const provider = (index: number): string => id("c", index);
const source = (index: number): string => id("d", index);
const link = (index: number): string => id("e", index);
const tag = (index: number): string => id("f", index);

const CATEGORY_ACTIVE_ONE: string = category(1);
const CATEGORY_ACTIVE_TWO: string = category(2);
const CATEGORY_INACTIVE: string = category(3);
const PROVIDER_ACTIVE: string = provider(1);
const PROVIDER_SUSPENDED: string = provider(2);

// Game 3 reaches a suspended provider, game 4 only an inactive category, game 5 no provider, and game 6 sits outside the HOOKS scope.
const GAMES: ReadonlyArray<{ categories: ReadonlyArray<string>; region: string; source: null | string; tag: TagState }> = [
	{ categories: [CATEGORY_ACTIVE_ONE], region: "eu", source: source(1), tag: TagState.ACTIVE },
	{ categories: [CATEGORY_ACTIVE_ONE, CATEGORY_ACTIVE_TWO], region: "eu", source: source(2), tag: TagState.ARCHIVED },
	{ categories: [CATEGORY_ACTIVE_ONE], region: "eu", source: source(3), tag: TagState.ACTIVE },
	{ categories: [CATEGORY_INACTIVE], region: "eu", source: source(1), tag: TagState.ACTIVE },
	{ categories: [CATEGORY_ACTIVE_TWO], region: "eu", source: null, tag: TagState.ACTIVE },
	{ categories: [CATEGORY_ACTIVE_TWO], region: "us", source: source(2), tag: TagState.ACTIVE },
];

// Every game whose category and provider are both active.
const BOTH_ACTIVE: ReadonlyArray<string> = [game(1), game(2), game(6)];

const IAM_POLICY: { statements: Array<IStatement> } = { statements: [] };
const PRINCIPAL: { id: string } = AuthorizationResolveDefaultPrincipal({ id: "user-1" } as never);

const statement = (effect: EApiPolicyEffect, condition: Record<string, Record<string, unknown>>): IStatement => ({ Action: [`${RELATION_FILTER_ENUM_IAM_NAMESPACE}:*`], Condition: condition, Effect: effect, Resource: [`${RELATION_FILTER_ENUM_IAM_NAMESPACE}/*`] });

const SERVICE: Type<ApiServiceBase<never>> = createRelationFilterService(RelationFilterEnumGameEntity) as never;
const PAGE: string = "relation-filter-enum-page";
const PAGE_SCOPED: string = "relation-filter-enum-page-scoped";
const PAGE_IAM: string = "relation-filter-enum-page-iam";
const CURSOR: string = "relation-filter-enum-cursor";
const CURSOR_IAM: string = "relation-filter-enum-cursor-iam";

const PAGE_CONTROLLERS: ReadonlyArray<Type<unknown>> = [
	createRelationFilterController(PAGE, RelationFilterEnumGameEntity, SERVICE as never, RELATION_FILTER_ENUM_FILTER, { isCursor: false, isScoped: false }),
	createRelationFilterController(PAGE_SCOPED, RelationFilterEnumGameEntity, SERVICE as never, RELATION_FILTER_ENUM_FILTER, { isCursor: false, isScoped: true }),
	createRelationFilterController(PAGE_IAM, RelationFilterEnumGameEntity, SERVICE as never, RELATION_FILTER_ENUM_FILTER, { authorization: RELATION_FILTER_ENUM_IAM_AUTHORIZATION, isCursor: false, isScoped: true }),
];

// A cursor route runs only on PostgreSQL; on any other database it stops startup.
const CURSOR_CONTROLLERS: ReadonlyArray<Type<unknown>> = [createRelationFilterController(CURSOR, RelationFilterEnumGameEntity, SERVICE as never, RELATION_FILTER_ENUM_FILTER, { isCursor: true, isScoped: false }), createRelationFilterController(CURSOR_IAM, RelationFilterEnumGameEntity, SERVICE as never, RELATION_FILTER_ENUM_FILTER, { authorization: RELATION_FILTER_ENUM_IAM_AUTHORIZATION, isCursor: true, isScoped: true })];

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "relation_filter_enum", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

// PostgreSQL deduces one type per bound parameter, so two relation filters that bind one value to enum columns of two types must not share a parameter.
describe.each<{ database: TDatabase }>([{ database: "sqlite" }, { database: "postgres" }, { database: "mysql" }, { database: "mariadb" }])("Relation filters on enum columns of different types on $database (E2E)", ({ database }: { database: TDatabase }) => {
	const isPostgres: boolean = database === "postgres";
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let postgresContainer: StartedPostgreSqlContainer | undefined;

	const connection = (): TypeOrmModuleOptions => {
		if (mariaDbContainer) {
			return { database: "relation_filter_enum", dropSchema: true, entities: RELATION_FILTER_ENUM_ENTITIES, host: mariaDbContainer.getHost(), password: MARIADB_PASSWORD, port: mariaDbContainer.getMappedPort(MYSQL_PORT), synchronize: true, type: "mysql", username: "root" };
		}

		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities: RELATION_FILTER_ENUM_ENTITIES, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities: RELATION_FILTER_ENUM_ENTITIES, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities: RELATION_FILTER_ENUM_ENTITIES, synchronize: true, type: "better-sqlite3" };
	};

	const eq = (key: string, value: string): string => `${key}[operator]=eq&${key}[value]=${value}`;
	const inList = (key: string, values: ReadonlyArray<string>): string => [`${key}[operator]=in`, ...values.map((value: string) => `${key}[values]=${value}`)].join("&");
	const request = async (url: string): Promise<{ json: () => unknown; statusCode: number }> => await fastify.inject({ method: "GET", url });

	// Walks every page of a route, so a filter that fails to narrow a later page or to count its rows shows.
	const walkPages = async (path: string, query: string): Promise<{ ids: Array<string>; totalCount: number }> => {
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

		return { ids, totalCount };
	};

	// Walks a cursor route to its end, then back from its last page.
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

				expect(back.statusCode, JSON.stringify(back.json())).toBe(HttpStatus.OK);
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
			controllers: [...PAGE_CONTROLLERS, ...(isPostgres ? CURSOR_CONTROLLERS : [])],
			imports: [
				TypeOrmModule.forRoot(connection()),
				TypeOrmModule.forFeature(RELATION_FILTER_ENUM_ENTITIES),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: POLICY_ID, principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(ids.includes(POLICY_ID) ? [{ document: { Statement: IAM_POLICY.statements, Version: "2012-10-17" }, id: POLICY_ID, namespace: RELATION_FILTER_ENUM_IAM_NAMESPACE, sourceType: EApiPolicySourceType.DATABASE, version: String(Date.now()) }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
				ApiSubscriberModule,
			],
			providers: [RelationFilterAuthGuard, SERVICE, createRelationFilterPolicy(RelationFilterEnumGameEntity)],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		await (fastify as unknown as { ready: () => Promise<void> }).ready();

		const dataSource: DataSource = app.get(getDataSourceToken());

		await dataSource.getRepository(RelationFilterEnumProviderEntity).save([
			{ id: PROVIDER_ACTIVE, state: ProviderState.ACTIVE },
			{ id: PROVIDER_SUSPENDED, state: ProviderState.SUSPENDED },
		]);
		await dataSource.getRepository(RelationFilterEnumSourceEntity).save([
			{ id: source(1), providerId: PROVIDER_ACTIVE },
			{ id: source(2), providerId: PROVIDER_ACTIVE },
			{ id: source(3), providerId: PROVIDER_SUSPENDED },
		]);
		await dataSource.getRepository(RelationFilterEnumCategoryEntity).save([
			{ id: CATEGORY_ACTIVE_ONE, state: CategoryState.ACTIVE },
			{ id: CATEGORY_ACTIVE_TWO, state: CategoryState.ACTIVE },
			{ id: CATEGORY_INACTIVE, state: CategoryState.INACTIVE },
		]);

		let linkIndex: number = 0;

		for (const [index, entry] of GAMES.entries()) {
			await dataSource.getRepository(RelationFilterEnumGameEntity).save({ gameSourceId: entry.source, id: game(index + 1), region: entry.region });
			await dataSource.getRepository(RelationFilterEnumTagEntity).save({ gameId: game(index + 1), id: tag(index + 1), state: entry.tag });

			for (const categoryId of entry.categories) {
				linkIndex += 1;
				await dataSource.getRepository(RelationFilterEnumCategoryGameEntity).save({ categoryId, gameId: game(index + 1), id: link(linkIndex) });
			}
		}
	}, 600_000);

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();
	}, 120_000);

	it("applies each fixed-condition filter alone", async () => {
		await expect(walkPages(PAGE, eq("category.id", CATEGORY_ACTIVE_ONE))).resolves.toEqual({ ids: [game(1), game(2), game(3)], totalCount: 3 });
		await expect(walkPages(PAGE, eq("gameSource.provider.id", PROVIDER_ACTIVE))).resolves.toEqual({ ids: [game(1), game(2), game(4), game(6)], totalCount: 4 });
	});

	it("applies both fixed-condition filters together", async () => {
		await expect(walkPages(PAGE, `${eq("category.id", CATEGORY_ACTIVE_ONE)}&${eq("gameSource.provider.id", PROVIDER_ACTIVE)}`)).resolves.toEqual({ ids: [game(1), game(2)], totalCount: 2 });
		await expect(walkPages(PAGE, `${eq("category.id", CATEGORY_ACTIVE_TWO)}&${eq("gameSource.provider.id", PROVIDER_ACTIVE)}`)).resolves.toEqual({ ids: [game(2), game(6)], totalCount: 2 });
		await expect(walkPages(PAGE, `${eq("category.id", CATEGORY_INACTIVE)}&${eq("gameSource.provider.id", PROVIDER_ACTIVE)}`)).resolves.toEqual({ ids: [], totalCount: 0 });
		await expect(walkPages(PAGE, `${eq("category.id", CATEGORY_ACTIVE_ONE)}&${eq("gameSource.provider.id", PROVIDER_SUSPENDED)}`)).resolves.toEqual({ ids: [], totalCount: 0 });
	});

	it("applies both plain declared state fields together", async () => {
		await expect(walkPages(PAGE, `${eq("category.state", CategoryState.ACTIVE)}&${eq("gameSource.provider.state", ProviderState.ACTIVE)}`)).resolves.toEqual({ ids: BOTH_ACTIVE, totalCount: 3 });
		await expect(walkPages(PAGE, `${eq("category.state", CategoryState.INACTIVE)}&${eq("gameSource.provider.state", ProviderState.ACTIVE)}`)).resolves.toEqual({ ids: [game(4)], totalCount: 1 });
	});

	it("applies a plain state field with the fixed condition of the other filter", async () => {
		await expect(walkPages(PAGE, `${eq("category.state", CategoryState.ACTIVE)}&${eq("gameSource.provider.id", PROVIDER_ACTIVE)}`)).resolves.toEqual({ ids: BOTH_ACTIVE, totalCount: 3 });
		await expect(walkPages(PAGE, `${eq("category.id", CATEGORY_ACTIVE_TWO)}&${eq("gameSource.provider.state", ProviderState.ACTIVE)}`)).resolves.toEqual({ ids: [game(2), game(6)], totalCount: 2 });
	});

	it("applies in on both", async () => {
		await expect(walkPages(PAGE, `${inList("category.id", [CATEGORY_ACTIVE_ONE, CATEGORY_ACTIVE_TWO, CATEGORY_INACTIVE])}&${inList("gameSource.provider.id", [PROVIDER_ACTIVE, PROVIDER_SUSPENDED])}`)).resolves.toEqual({ ids: BOTH_ACTIVE, totalCount: 3 });
		await expect(walkPages(PAGE, `${inList("category.state", [CategoryState.ACTIVE])}&${inList("gameSource.provider.state", [ProviderState.ACTIVE])}`)).resolves.toEqual({ ids: BOTH_ACTIVE, totalCount: 3 });
	});

	it("applies both under a HOOKS scope", async () => {
		await expect(walkPages(PAGE_SCOPED, `${eq("category.state", CategoryState.ACTIVE)}&${eq("gameSource.provider.id", PROVIDER_ACTIVE)}`)).resolves.toEqual({ ids: [game(1), game(2)], totalCount: 2 });
	});

	it("applies both under an IAM scope on a to-many relation with a third enum type", async () => {
		IAM_POLICY.statements = [statement(EApiPolicyEffect.ALLOW, { "ForAnyValue:StringEquals": { "resource.tagState": TagState.ACTIVE } })];

		await expect(walkPages(PAGE_IAM, "")).resolves.toEqual({ ids: [game(1), game(3), game(4), game(5), game(6)], totalCount: 5 });
		await expect(walkPages(PAGE_IAM, `${eq("category.id", CATEGORY_ACTIVE_TWO)}&${eq("gameSource.provider.id", PROVIDER_ACTIVE)}`)).resolves.toEqual({ ids: [game(6)], totalCount: 1 });
		await expect(walkPages(PAGE_IAM, `${eq("category.state", CategoryState.ACTIVE)}&${eq("gameSource.provider.state", ProviderState.ACTIVE)}`)).resolves.toEqual({ ids: [game(1), game(6)], totalCount: 2 });
		await expect(walkPages(PAGE_IAM, `${inList("category.id", [CATEGORY_ACTIVE_ONE, CATEGORY_ACTIVE_TWO])}&${inList("gameSource.provider.id", [PROVIDER_ACTIVE])}`)).resolves.toEqual({ ids: [game(1), game(6)], totalCount: 2 });
	});

	// CURSOR runs on PostgreSQL only: on any other database the route stops startup, so it is not registered there.
	it.skipIf(!isPostgres)("walks every cursor page with both, alone and under an IAM scope", async () => {
		IAM_POLICY.statements = [statement(EApiPolicyEffect.ALLOW, { "ForAnyValue:StringEquals": { "resource.tagState": TagState.ACTIVE } })];

		await expect(walkCursor(CURSOR, `${inList("category.id", [CATEGORY_ACTIVE_ONE, CATEGORY_ACTIVE_TWO])}&${eq("gameSource.provider.id", PROVIDER_ACTIVE)}`)).resolves.toEqual(BOTH_ACTIVE);
		await expect(walkCursor(CURSOR, `${eq("category.state", CategoryState.ACTIVE)}&${eq("gameSource.provider.state", ProviderState.ACTIVE)}`)).resolves.toEqual(BOTH_ACTIVE);
		await expect(walkCursor(CURSOR_IAM, `${eq("category.state", CategoryState.ACTIVE)}&${eq("gameSource.provider.id", PROVIDER_ACTIVE)}`)).resolves.toEqual([game(1), game(6)]);
	});
});
