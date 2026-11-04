import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { Repository } from "typeorm";
import type { IApiAuthorizationPrincipal, IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationIamDialectRegistry, ApiAuthorizationModule, ApiAuthorizationSimulator, AuthorizationResolveDefaultPrincipal, EApiAuthorizationIamDialect, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiRouteType } from "../../src/index";
import { E2E_IAM_DIALECT_ITEM_AUTHORIZATION, E2E_IAM_DIALECT_NAME_AUTHORIZATION, E2E_IAM_DIALECT_OPERATOR_AUTHORIZATION, E2E_IAM_DIALECT_OPERATOR_ID, E2E_IAM_DIALECT_OPERATOR_PATH_AUTHORIZATION, E2E_IAM_DIALECT_USER, E2eIamDialectGuard, E2eIamDialectItemController, E2eIamDialectItemEntity, E2eIamDialectItemService, E2eIamDialectNameController, E2eIamDialectOperatorController, E2eIamDialectOperatorPathController, E2eIamDialectOwnerEntity } from "./iam-dialect-parity";

type TDatabase = "mariadb" | "mysql" | "postgres" | "sqlite";

interface IPolicyCase {
	namespace: string;
	statements: Array<IApiPolicyStatement>;
}

const ITEMS: string = "/iam-dialect/items";
const NAMES: string = "/iam-dialect/names";
const OPERATORS: string = "/iam-dialect/operators";
const OPERATOR_PATHS: string = "/iam-dialect/operator-paths";
const OPERATOR_A: string = E2E_IAM_DIALECT_OPERATOR_ID;
const OPERATOR_B: string = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
const OPERATOR_WITHOUT_ROWS: string = "16fd2706-8baf-433b-82eb-8c7fada847da";
const PAGE: string = "limit=50&page=1";
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(E2E_IAM_DIALECT_USER);
const MARIADB_PASSWORD: string = "iam-dialect";
const MYSQL_PORT: number = 3306;

const OWNERS: Array<E2eIamDialectOwnerEntity> = [
	{ id: "o-ann", name: "ann" },
	{ id: "o-upper", name: "ANN" },
	{ id: "o-null", name: null },
];

// Names that differ only in letter case, accents or trailing spaces, a LIKE metacharacter, NULL, and the empty string.
// Each row also holds a uuid operator and an enum kind, or NULL.
const ITEM_ROWS: Array<E2eIamDialectItemEntity> = [
	{ id: "a", kind: "alpha", name: "ann", operatorId: OPERATOR_A, owner: { id: "o-ann" } as E2eIamDialectOwnerEntity, price: "1.50", rank: 1, tenantId: "t-1" },
	{ id: "b", kind: "beta", name: "Ann", operatorId: OPERATOR_B, owner: { id: "o-upper" } as E2eIamDialectOwnerEntity, price: "2.00", rank: 2, tenantId: "t-1" },
	{ id: "c", kind: null, name: "ånn", operatorId: null, owner: null, price: null, rank: null, tenantId: "t-2" },
	{ id: "d", kind: "alpha", name: "ann ", operatorId: OPERATOR_A, owner: { id: "o-null" } as E2eIamDialectOwnerEntity, price: "1.50", rank: 1, tenantId: "t-1" },
	{ id: "e", kind: null, name: null, operatorId: null, owner: null, price: null, rank: null, tenantId: null },
	{ id: "f", kind: "beta", name: "", operatorId: OPERATOR_B, owner: { id: "o-ann" } as E2eIamDialectOwnerEntity, price: null, rank: null, tenantId: "" },
	{ id: "g", kind: null, name: "an_n", operatorId: OPERATOR_A, owner: null, price: null, rank: 3, tenantId: "t-2" },
	{ id: "h", kind: "alpha", name: "bob", operatorId: null, owner: { id: "o-ann" } as E2eIamDialectOwnerEntity, price: null, rank: null, tenantId: "t-1" },
];
const ALL_ROWS: Array<string> = ITEM_ROWS.map((row: E2eIamDialectItemEntity): string => row.id);

const statement = (effect: EApiPolicyEffect, options: { condition?: Record<string, Record<string, unknown>>; resource?: Array<string> } = {}): IApiPolicyStatement => ({
	Action: ["dial:item:*"],
	...(options.condition ? { Condition: options.condition } : {}),
	Effect: effect,
	Resource: options.resource ?? ["*"],
});

const ALLOW_ALL: IApiPolicyStatement = statement(EApiPolicyEffect.ALLOW);
const allow = (operator: string, field: string, value: unknown): IPolicyCase => ({ namespace: "dial:item", statements: [statement(EApiPolicyEffect.ALLOW, { condition: { [operator]: { [`resource.${field}`]: value } } })] });
const deny = (operator: string, field: string, value: unknown): IPolicyCase => ({ namespace: "dial:item", statements: [ALLOW_ALL, statement(EApiPolicyEffect.DENY, { condition: { [operator]: { [`resource.${field}`]: value } } })] });
const denyResource = (resource: Array<string>): IPolicyCase => ({ namespace: "dial:item", statements: [ALLOW_ALL, statement(EApiPolicyEffect.DENY, { resource })] });

// The list keeps exactly the rows the in-memory evaluator allows, on every database, and those are the rows named.
const COMPILABLE_CASES: Array<[string, IPolicyCase, Array<string>]> = [
	['Allow StringEquals name "ann"', allow("StringEquals", "name", "ann"), ["a"]],
	["Allow StringEquals name ${principal.attributes.name}", allow("StringEquals", "name", "${principal.attributes.name}"), ["a"]],
	['Allow StringEquals ownerName "ann"', allow("StringEquals", "ownerName", "ann"), ["a", "f", "h"]],
	['Allow StringEqualsIfExists ownerName "ann"', allow("StringEqualsIfExists", "ownerName", "ann"), ["a", "c", "e", "f", "g", "h"]],
	['Deny StringEquals name "ann"', deny("StringEquals", "name", "ann"), ["b", "c", "d", "e", "f", "g", "h"]],
	['Deny StringNotEquals name "ann"', deny("StringNotEquals", "name", "ann"), ["a"]],
	['Deny StringEqualsIfExists ownerName "ann"', deny("StringEqualsIfExists", "ownerName", "ann"), ["b", "d"]],
	['Deny StringNotEqualsIfExists ownerName "ann"', deny("StringNotEqualsIfExists", "ownerName", "ann"), ["a", "f", "h"]],
	['Allow everything and Allow StringEquals name "ann"', { namespace: "dial:item", statements: [ALLOW_ALL, ...allow("StringEquals", "name", "ann").statements] }, ["a", "b", "c", "d", "e", "f", "g", "h"]],
	["Deny the exact row dial:tenant/t-1/item/a", denyResource(["dial:tenant/t-1/item/a"]), ["b", "c", "d", "e", "f", "g", "h"]],
	["Deny the exact row dial:tenant/T-1/item/a in another letter case", denyResource(["dial:tenant/T-1/item/a"]), ["a", "b", "c", "d", "e", "f", "g", "h"]],
	["Deny the rows of an empty tenant dial:tenant//item/e and dial:tenant//item/f", denyResource(["dial:tenant//item/e", "dial:tenant//item/f"]), ["a", "b", "c", "d", "g", "h"]],
	["Allow StringEquals operatorId on a uuid column", allow("StringEquals", "operatorId", OPERATOR_A), ["a", "d", "g"]],
	["Deny StringEquals operatorId in upper case", deny("StringEquals", "operatorId", OPERATOR_A.toUpperCase()), ALL_ROWS],
	['Deny StringEquals operatorId "not-a-uuid"', deny("StringEquals", "operatorId", "not-a-uuid"), ALL_ROWS],
	['Deny StringEquals kind "alpha" on an enum column', deny("StringEquals", "kind", "alpha"), ["b", "c", "e", "f", "g"]],
	['Deny StringEquals kind "gamma", which the enum does not declare', deny("StringEquals", "kind", "gamma"), ALL_ROWS],
];

// Values a uuid or enum column cannot hold: an Allow on them allows no row, in SQL as in memory, and never errors. Every
// database answers alike: PostgreSQL lowers the comparison to a condition that matches no row, the others compare text that
// no row holds, so the list is an empty page.
const NO_ROW_CASES: Array<[string, IPolicyCase]> = [
	["Allow StringEquals operatorId in upper case", allow("StringEquals", "operatorId", OPERATOR_A.toUpperCase())],
	['Allow StringEquals operatorId "not-a-uuid"', allow("StringEquals", "operatorId", "not-a-uuid")],
	['Allow StringEquals kind "gamma", which the enum does not declare', allow("StringEquals", "kind", "gamma")],
	['Allow StringEquals kind "Alpha" in another letter case', allow("StringEquals", "kind", "Alpha")],
];

// Row patterns over the uuid placeholder: an empty slot names the NULL rows, another spelling of a UUID names none.
const OPERATOR_PATH_CASES: Array<[string, Array<string>]> = [
	["dialu:item/", ["a", "b", "d", "f", "g"]],
	[`dialu:item/${OPERATOR_A}`, ["b", "c", "e", "f", "h"]],
	[`dialu:item/${OPERATOR_A.toUpperCase()}`, ALL_ROWS],
	["dialu:item/not-a-uuid", ALL_ROWS],
];

// String operators on numeric columns do not fit the column: the grammar refuses the document, so a request answers 500.
const MISFIT_CASES: Array<[string, IPolicyCase]> = [
	['Allow StringEquals rank "1"', allow("StringEquals", "rank", "1")],
	["Allow StringEquals rank ${principal.attributes.rank}", allow("StringEquals", "rank", "${principal.attributes.rank}")],
	['Deny StringEquals price "1.5"', deny("StringEquals", "price", "1.5")],
	['Deny StringNotEquals rank "1"', deny("StringNotEquals", "rank", "1")],
];

// Row patterns over the name placeholder: the list keeps the rows the in-memory evaluator allows.
const NAME_CASES: Array<[string, Array<string>]> = [
	["dialn:item/ann", ["b", "c", "d", "e", "f", "g", "h"]],
	["dialn:item/An*", ["a", "c", "d", "e", "f", "g", "h"]],
	["dialn:item/an_*", ["a", "b", "c", "d", "e", "f", "h"]],
	["dialn:item/", ["a", "b", "c", "d", "g", "h"]],
];

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "iam", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

describe.each<{ database: TDatabase; databaseName: string; dialect: EApiAuthorizationIamDialect }>([
	{ database: "sqlite", databaseName: "SQLite", dialect: EApiAuthorizationIamDialect.SQLITE },
	{ database: "postgres", databaseName: "PostgreSQL 17", dialect: EApiAuthorizationIamDialect.POSTGRES },
	{ database: "mysql", databaseName: "MySQL 8.4", dialect: EApiAuthorizationIamDialect.MYSQL },
	{ database: "mariadb", databaseName: "MariaDB 11", dialect: EApiAuthorizationIamDialect.MARIADB },
])("IAM String conditions match the in-memory evaluator on $databaseName (E2E)", ({ database, dialect }: { database: TDatabase; databaseName: string; dialect: EApiAuthorizationIamDialect }) => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let policy: IPolicyCase = { namespace: "dial:item", statements: [] };
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	let simulator: ApiAuthorizationSimulator;

	const repository = (): Repository<E2eIamDialectItemEntity> => app!.get(E2eIamDialectItemService).repository;

	const connection = (entities: Array<new () => unknown>): TypeOrmModuleOptions => {
		if (mariaDbContainer) {
			// TypeORM reads a MariaDB server behind the mysql type as mysql; the dialect probe tells it apart.
			return { database: "iam", dropSchema: true, entities, host: mariaDbContainer.getHost(), password: MARIADB_PASSWORD, port: mariaDbContainer.getMappedPort(MYSQL_PORT), synchronize: true, type: "mysql", username: "root" };
		}

		if (mysqlContainer) {
			return { database: mysqlContainer.getDatabase(), dropSchema: true, entities, host: mysqlContainer.getHost(), password: mysqlContainer.getUserPassword(), port: mysqlContainer.getPort(), synchronize: true, type: "mysql", username: mysqlContainer.getUsername() };
		}

		if (postgresContainer) {
			return { dropSchema: true, entities, synchronize: true, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" };
	};

	// The rows the in-memory evaluator allows once each resource is loaded with its relations.
	const allowedInMemory = async (authorization: typeof E2E_IAM_DIALECT_ITEM_AUTHORIZATION | typeof E2E_IAM_DIALECT_NAME_AUTHORIZATION | typeof E2E_IAM_DIALECT_OPERATOR_AUTHORIZATION | typeof E2E_IAM_DIALECT_OPERATOR_PATH_AUTHORIZATION): Promise<Array<string>> => {
		const allowed: Array<string> = [];

		for (const row of await repository().find({ relations: { owner: true } })) {
			const decision = await simulator.evaluate({ action: EApiRouteType.GET, authorization: authorization as never, entity: E2eIamDialectItemEntity, principal: PRINCIPAL, resource: row, routeType: EApiRouteType.GET });

			if (decision.effect === EApiPolicyEffect.ALLOW) {
				allowed.push(row.id);
			}
		}

		return allowed.sort();
	};

	const listIds = async (url: string): Promise<{ ids: Array<string>; statusCode: number }> => {
		const response = await fastify.inject({ method: "GET", url: `${url}?${PAGE}` });

		return { ids: response.statusCode === HttpStatus.OK ? (response.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }): string => item.id).sort() : [], statusCode: response.statusCode };
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

		const entities: Array<new () => unknown> = [E2eIamDialectOwnerEntity, E2eIamDialectItemEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [E2eIamDialectItemController, E2eIamDialectNameController, E2eIamDialectOperatorController, E2eIamDialectOperatorPathController],
			imports: [
				TypeOrmModule.forRoot(connection(entities)),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "dial-policy", principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("dial-policy") ? [{ document: { Statement: policy.statements, Version: "2012-10-17" }, id: "dial-policy", namespace: policy.namespace, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [E2eIamDialectItemService, E2eIamDialectGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		simulator = app.get(ApiAuthorizationSimulator);

		await repository().manager.getRepository(E2eIamDialectOwnerEntity).save(OWNERS);
	}, 300_000);

	beforeEach(async () => {
		await repository().delete(ITEM_ROWS.map((row: E2eIamDialectItemEntity): string => row.id));
		await repository().save(ITEM_ROWS);
	});

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();
	});

	it("detects the dialect from the controller's DataSource at bootstrap", async () => {
		const resolved = await app!.get(ApiAuthorizationIamDialectRegistry).resolve(E2eIamDialectItemEntity);

		expect(resolved.type).toBe(dialect);

		if (dialect === EApiAuthorizationIamDialect.MYSQL || dialect === EApiAuthorizationIamDialect.MARIADB) {
			expect(resolved.binaryCollation).toBe(dialect === EApiAuthorizationIamDialect.MYSQL ? "utf8mb4_0900_bin" : "utf8mb4_nopad_bin");
		}
	});

	it.each(COMPILABLE_CASES)("keeps the rows the in-memory evaluator allows for %s", async (_name: string, policyCase: IPolicyCase, kept: Array<string>) => {
		policy = policyCase;

		const allowed: Array<string> = await allowedInMemory(E2E_IAM_DIALECT_ITEM_AUTHORIZATION);

		expect(allowed).toEqual(kept);
		expect(await listIds(ITEMS)).toEqual({ ids: kept, statusCode: HttpStatus.OK });
	});

	it.each(MISFIT_CASES)("refuses the document for %s", async (_name: string, policyCase: IPolicyCase) => {
		policy = policyCase;

		expect(await listIds(ITEMS)).toEqual({ ids: [], statusCode: HttpStatus.INTERNAL_SERVER_ERROR });
		// A simulated request reads the same document.
		await expect(allowedInMemory(E2E_IAM_DIALECT_ITEM_AUTHORIZATION)).rejects.toThrow("iamPolicyConditionKeyTypeMismatch");
	});

	it.each(NO_ROW_CASES)("allows no row, listed or loaded, for %s", async (_name: string, policyCase: IPolicyCase) => {
		policy = policyCase;

		expect(await listIds(ITEMS)).toEqual({ ids: [], statusCode: HttpStatus.OK });
		expect(await allowedInMemory(E2E_IAM_DIALECT_ITEM_AUTHORIZATION)).toEqual([]);
	});

	it.each(OPERATOR_PATH_CASES)("keeps the rows the in-memory evaluator allows for a list Deny on the uuid pattern %s", async (resource: string, kept: Array<string>) => {
		policy = {
			namespace: "dialu:item",
			statements: [
				{ Action: ["dialu:item:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] },
				{ Action: ["dialu:item:*"], Effect: EApiPolicyEffect.DENY, Resource: [resource] },
			],
		};

		expect(await allowedInMemory(E2E_IAM_DIALECT_OPERATOR_PATH_AUTHORIZATION)).toEqual(kept);
		expect(await listIds(OPERATOR_PATHS)).toEqual({ ids: kept, statusCode: HttpStatus.OK });
	});

	describe("Gameport's operator baseline: StringEquals resource.operatorId with ${principal.attributes.operatorId}", () => {
		const read = async (id: string): Promise<number> => (await fastify.inject({ method: "GET", url: `${OPERATORS}/${id}` })).statusCode;

		beforeEach(() => {
			policy = {
				namespace: "dialo:item",
				statements: [{ Action: ["dialo:item:*"], Condition: { StringEquals: { "resource.operatorId": "${principal.attributes.operatorId}" } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["dialo:item/*"] }],
			};
		});

		afterAll(() => {
			E2E_IAM_DIALECT_USER.operatorId = OPERATOR_A;
		});

		it("lists and reads the rows of the principal's operator", async () => {
			E2E_IAM_DIALECT_USER.operatorId = OPERATOR_A;

			expect(await allowedInMemory(E2E_IAM_DIALECT_OPERATOR_AUTHORIZATION)).toEqual(["a", "d", "g"]);
			expect(await listIds(OPERATORS)).toEqual({ ids: ["a", "d", "g"], statusCode: HttpStatus.OK });
			expect(await read("a")).toBe(HttpStatus.OK);
			expect(await read("b")).toBe(HttpStatus.NOT_FOUND);
			expect(await read("c")).toBe(HttpStatus.NOT_FOUND);
		});

		it("lists and reads no row for an operator that owns none", async () => {
			E2E_IAM_DIALECT_USER.operatorId = OPERATOR_WITHOUT_ROWS;

			expect(await allowedInMemory(E2E_IAM_DIALECT_OPERATOR_AUTHORIZATION)).toEqual([]);
			expect(await listIds(OPERATORS)).toEqual({ ids: [], statusCode: HttpStatus.OK });
			expect(await read("a")).toBe(HttpStatus.NOT_FOUND);
		});

		it.each([OPERATOR_A.toUpperCase(), "not-a-uuid"])("allows no row, without an error, for the operator attribute %j", async (operatorId: string) => {
			E2E_IAM_DIALECT_USER.operatorId = operatorId;

			expect(await allowedInMemory(E2E_IAM_DIALECT_OPERATOR_AUTHORIZATION)).toEqual([]);
			expect(await listIds(OPERATORS)).toEqual({ ids: [], statusCode: HttpStatus.OK });
			expect(await read("a")).toBe(HttpStatus.NOT_FOUND);
		});

		// The planner refuses the value "" on every dialect before any lowering, because "" and NULL compare equal in memory but not in SQL.
		it("denies the request for an empty operator attribute, which no scope compares", async () => {
			E2E_IAM_DIALECT_USER.operatorId = "";

			expect(await allowedInMemory(E2E_IAM_DIALECT_OPERATOR_AUTHORIZATION)).toEqual([]);
			expect(await listIds(OPERATORS)).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
			expect(await read("a")).toBe(HttpStatus.FORBIDDEN);
		});
	});

	it.each(NAME_CASES)("keeps the rows the in-memory evaluator allows for a list Deny on %s", async (resource: string, kept: Array<string>) => {
		policy = {
			namespace: "dialn:item",
			statements: [
				{ Action: ["dialn:item:*"], Effect: EApiPolicyEffect.ALLOW, Resource: ["*"] },
				{ Action: ["dialn:item:*"], Effect: EApiPolicyEffect.DENY, Resource: [resource] },
			],
		};

		expect(await allowedInMemory(E2E_IAM_DIALECT_NAME_AUTHORIZATION)).toEqual(kept);
		expect(await listIds(NAMES)).toEqual({ ids: kept, statusCode: HttpStatus.OK });
	});
});
