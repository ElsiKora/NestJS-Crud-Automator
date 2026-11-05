import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { Repository } from "typeorm";
import type { IApiAuthorizationPrincipal, IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";
import type { IE2eIamMultiFixture, IE2eIamMultiRow, TE2eIamMultiDatabase } from "./iam-multi-value-parity";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationSimulator, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiRouteType } from "../../src/index";
import { createE2eIamMultiFixture, E2E_IAM_MULTI_USER, E2eIamMultiGuard } from "./iam-multi-value-parity";

/**
 * One condition, and the rows it holds on. An Allow of it keeps exactly those rows and a Deny of it keeps the others,
 * on a list, on a loaded row and on a read. A database in `failClosedOn` cannot express it: the list answers 403 and no
 * row is allowed either way. A database in `refusedOn` has no column of the family: the document does not validate.
 */
interface IMultiCase {
	failClosedOn?: ReadonlyArray<TE2eIamMultiDatabase>;
	field: string;
	operator: string;
	refusedOn?: ReadonlyArray<TE2eIamMultiDatabase>;
	rows: string;
	value: unknown;
}

const MARIADB_PASSWORD: string = "iam-multi";
const MYSQL_PORT: number = 3306;
const LIST_URL: string = "/iam-multi/items?limit=50&page=1";
const ITEM_URL: string = "/iam-multi/items";
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(E2E_IAM_MULTI_USER);

const MYSQL_FAMILY: ReadonlyArray<TE2eIamMultiDatabase> = ["mariadb", "mysql"];
const NOT_POSTGRES: ReadonlyArray<TE2eIamMultiDatabase> = ["mariadb", "mysql", "sqlite"];

const JANUARY_1: Date = new Date("2024-01-01T00:00:00.000Z");
const JANUARY_2: Date = new Date("2024-01-02T00:00:00.000Z");
const JULY_1: Date = new Date("2024-07-01T00:00:00.000Z");
const AUGUST_1: Date = new Date("2024-08-01T00:00:00.000Z");
const JANUARY_2_TEXT: string = "2024-01-02T00:00:00Z";
const JANUARY_1_TEXT: string = "2024-01-01T00:00:00Z";
const JUNE_1_TEXT: string = "2024-06-01T00:00:00Z";
const JULY_1_TEXT: string = "2024-07-01T00:00:00Z";
const AUGUST_1_TEXT: string = "2024-08-01T00:00:00Z";

const ALL_ROWS: ReadonlyArray<string> = ["a", "b", "c", "d", "e", "f", "g", "h"];

const ITEMS: ReadonlyArray<Record<string, unknown>> = [
	{ address: "10.0.0.1", id: "a", isActive: true, label: "red", occurredAt: JANUARY_1, rank: 1 },
	{ address: "192.168.0.1", id: "b", isActive: false, label: "blue", occurredAt: JULY_1, rank: 5 },
	{ address: "172.16.0.1", id: "c", isActive: true, label: "RED", occurredAt: AUGUST_1, rank: 10 },
	{ address: null, id: "d", isActive: null, label: null, occurredAt: null, rank: null },
	{ address: "10.1.1.1", id: "e", isActive: false, label: "green", occurredAt: JANUARY_2, rank: 20 },
	{ address: "8.8.8.8", id: "f", isActive: true, label: "r_d", occurredAt: JANUARY_1, rank: -1 },
	{ address: "192.168.1.1", id: "g", isActive: false, label: "", occurredAt: JULY_1, rank: 0 },
	{ address: null, id: "h", isActive: null, label: "Blue", occurredAt: null, rank: 7 },
];

// Text, score, activity, date and address of each note of an item. Item `a` has no note.
const NOTES: ReadonlyArray<[string, string, null | string, null | number, boolean | null, Date | null, null | string]> = [
	["b1", "b", "red", 1, true, JANUARY_1, "10.0.0.1"],
	["c1", "c", null, null, null, null, null],
	["d1", "d", "red", 1, true, JANUARY_1, "10.0.0.1"],
	["d2", "d", "blue", 10, false, JULY_1, "192.168.0.1"],
	["e1", "e", "blue", 10, false, JULY_1, "192.168.0.1"],
	["e2", "e", "green", 20, false, AUGUST_1, "172.16.0.1"],
	["f1", "f", "red", 1, true, JANUARY_1, "10.0.0.1"],
	["f2", "f", null, null, null, null, null],
	["g1", "g", "RED", 1, false, JANUARY_1, "192.168.0.1"],
	["h1", "h", "red", 1, true, JANUARY_1, "10.0.0.2"],
	["h2", "h", "red", 2, false, JANUARY_2, "10.0.0.3"],
];

const TAGS: ReadonlyArray<Record<string, unknown>> = [
	{ id: "t-blue", name: "blue" },
	{ id: "t-null", name: null },
	{ id: "t-red", name: "red" },
	{ id: "t-upper", name: "RED" },
];

// Tags of each item; item `a` has none.
const ITEM_TAGS: ReadonlyArray<[string, ReadonlyArray<string>]> = [
	["b", ["t-red"]],
	["c", ["t-null"]],
	["d", ["t-red", "t-blue"]],
	["e", ["t-blue"]],
	["f", ["t-red", "t-null"]],
	["g", ["t-upper"]],
	["h", ["t-red"]],
];

// Items of each group, whose relation an item reads from the inverse side.
const GROUPS: ReadonlyArray<[string, null | string, ReadonlyArray<string>]> = [
	["g-null", null, ["c"]],
	["g-x", "x", ["b", "d"]],
	["g-y", "y", ["d", "e"]],
];

const SET_FAMILIES: ReadonlyArray<[string, ReadonlyArray<IMultiCase>]> = [
	[
		"String on a OneToMany",
		[
			{ field: "noteText", operator: "ForAnyValue:StringEquals", rows: "b d f h", value: "red" },
			{ field: "noteText", operator: "ForAnyValue:StringEquals", rows: "b d f h", value: "${principal.attributes.color}" },
			{ field: "noteText", operator: "ForAnyValue:StringEquals", rows: "b d e f h", value: ["red", "green"] },
			{ field: "noteText", operator: "ForAllValues:StringEquals", rows: "a b h", value: "red" },
			{ field: "noteText", operator: "ForAllValues:StringEquals", rows: "a b d e h", value: ["red", "blue", "green"] },
			{ field: "noteText", operator: "ForAnyValue:StringNotEquals", rows: "c d e f g", value: "red" },
			{ field: "noteText", operator: "ForAnyValue:StringNotEquals", rows: "c e f g", value: ["red", "blue"] },
			{ field: "noteText", operator: "ForAllValues:StringNotEquals", rows: "a c e g", value: "red" },
			{ field: "noteText", operator: "ForAllValues:StringNotEquals", rows: "a c g", value: ["red", "blue"] },
			{ field: "noteText", operator: "ForAnyValue:StringEqualsIfExists", rows: "a b d f h", value: "red" },
			{ field: "noteText", operator: "ForAllValues:StringEqualsIfExists", rows: "a b h", value: "red" },
			{ field: "noteText", operator: "ForAnyValue:StringNotEqualsIfExists", rows: "a c d e f g", value: "red" },
			{ field: "noteText", operator: "ForAllValues:StringNotEqualsIfExists", rows: "a c e g", value: "red" },
		],
	],
	[
		"StringLike on a OneToMany",
		[
			{ field: "noteText", operator: "ForAnyValue:StringLike", rows: "b d f h", value: "r*" },
			{ field: "noteText", operator: "ForAnyValue:StringLike", rows: "b d e f h", value: ["r*", "g*"] },
			{ field: "noteText", operator: "ForAnyValue:StringLike", rows: "b c d e f g h", value: "*" },
			{ field: "noteText", operator: "ForAllValues:StringLike", rows: "a b c d e f g h", value: "*" },
			{ field: "noteText", operator: "ForAllValues:StringLike", rows: "a b d h", value: ["r*", "b*"] },
			{ field: "noteText", operator: "ForAnyValue:StringNotLike", rows: "c d e f g", value: "r*" },
			{ field: "noteText", operator: "ForAllValues:StringNotLike", rows: "a c g", value: ["r*", "b*"] },
		],
	],
	[
		"IgnoreCase on a OneToMany",
		[
			{ failClosedOn: MYSQL_FAMILY, field: "noteText", operator: "ForAnyValue:StringEqualsIgnoreCase", rows: "b d f g h", value: "RED" },
			{ failClosedOn: MYSQL_FAMILY, field: "noteText", operator: "ForAnyValue:StringEqualsIgnoreCase", rows: "b d e f g h", value: ["RED", "GREEN"] },
			{ failClosedOn: MYSQL_FAMILY, field: "noteText", operator: "ForAllValues:StringEqualsIgnoreCase", rows: "a b d g h", value: ["RED", "BLUE"] },
			{ failClosedOn: MYSQL_FAMILY, field: "noteText", operator: "ForAllValues:StringNotEqualsIgnoreCase", rows: "a c", value: ["RED", "blue"] },
		],
	],
	[
		"Numeric on a OneToMany",
		[
			{ field: "noteScore", operator: "ForAnyValue:NumericGreaterThan", rows: "d e", value: "5" },
			{ field: "noteScore", operator: "ForAllValues:NumericGreaterThan", rows: "a e", value: "5" },
			{ field: "noteScore", operator: "ForAnyValue:NumericEquals", rows: "e h", value: ["2", "20"] },
			{ field: "noteScore", operator: "ForAllValues:NumericEquals", rows: "a b g h", value: ["1", "2"] },
			{ field: "noteScore", operator: "ForAllValues:NumericNotEquals", rows: "a c e", value: "1" },
			{ field: "noteScore", operator: "ForAnyValue:NumericNotEquals", rows: "c d e f h", value: "1" },
		],
	],
	[
		"Bool on a OneToMany",
		[
			{ field: "noteActive", operator: "ForAnyValue:Bool", rows: "b d f h", value: "true" },
			{ field: "noteActive", operator: "ForAllValues:Bool", rows: "a b", value: "true" },
			{ field: "noteActive", operator: "ForAnyValue:Bool", rows: "b d e f g h", value: ["true", "false"] },
			{ field: "noteActive", operator: "ForAllValues:Bool", rows: "a b d e g h", value: ["true", "false"] },
		],
	],
	[
		"Date on a OneToMany",
		[
			{ field: "noteAt", operator: "ForAnyValue:DateGreaterThan", rows: "d e", value: JUNE_1_TEXT },
			{ field: "noteAt", operator: "ForAllValues:DateGreaterThan", rows: "a e", value: JUNE_1_TEXT },
			{ field: "noteAt", operator: "ForAnyValue:DateEquals", rows: "e h", value: [JANUARY_2_TEXT, AUGUST_1_TEXT] },
			{ field: "noteAt", operator: "ForAllValues:DateLessThan", rows: "a b g h", value: JUNE_1_TEXT },
		],
	],
	[
		"IP and Arn on a OneToMany",
		[
			{ field: "noteAddress", operator: "ForAnyValue:IpAddress", refusedOn: NOT_POSTGRES, rows: "b d f h", value: "10.0.0.0/8" },
			{ field: "noteAddress", operator: "ForAllValues:IpAddress", refusedOn: NOT_POSTGRES, rows: "a b d g h", value: ["10.0.0.0/8", "192.168.0.0/16"] },
			{ field: "noteAddress", operator: "ForAllValues:NotIpAddress", refusedOn: NOT_POSTGRES, rows: "a c e g", value: "10.0.0.0/8" },
			{ failClosedOn: NOT_POSTGRES, field: "noteText", operator: "ForAnyValue:ArnLike", rows: "b d e f h", value: ["r*", "g*"] },
			{ failClosedOn: NOT_POSTGRES, field: "noteText", operator: "ForAllValues:ArnNotLike", rows: "a c e g", value: "r*" },
		],
	],
	[
		"the owner side of a ManyToMany",
		[
			{ field: "tagName", operator: "ForAnyValue:StringEquals", rows: "b d f h", value: "red" },
			{ field: "tagName", operator: "ForAllValues:StringEquals", rows: "a b h", value: "red" },
			{ field: "tagName", operator: "ForAnyValue:StringNotEquals", rows: "c d e f g", value: "red" },
			{ field: "tagName", operator: "ForAllValues:StringNotEquals", rows: "a c g", value: ["red", "blue"] },
			{ field: "tagName", operator: "ForAnyValue:StringEqualsIfExists", rows: "a b d f h", value: "red" },
		],
	],
	[
		"the inverse side of a ManyToMany",
		[
			{ field: "groupName", operator: "ForAnyValue:StringEquals", rows: "b d", value: "x" },
			{ field: "groupName", operator: "ForAnyValue:StringEquals", rows: "b d e", value: ["x", "y"] },
			{ field: "groupName", operator: "ForAllValues:StringEquals", rows: "a b f g h", value: "x" },
			{ field: "groupName", operator: "ForAllValues:StringNotEquals", rows: "a c e f g h", value: "x" },
		],
	],
	[
		"a soft-deletable related entity, whose deleted rows do not count",
		[
			{ field: "softText", operator: "ForAnyValue:StringEquals", rows: "b", value: "gone" },
			{ field: "softText", operator: "ForAllValues:StringEquals", rows: "a c d e f g h", value: "keep" },
		],
	],
];

const VALUE_FAMILIES: ReadonlyArray<[string, ReadonlyArray<IMultiCase>]> = [
	[
		"String",
		[
			{ field: "label", operator: "StringEquals", rows: "a b", value: ["red", "blue"] },
			{ field: "label", operator: "StringEquals", rows: "a b", value: ["${principal.attributes.color}", "blue"] },
			{ field: "label", operator: "StringNotEquals", rows: "c d e f g h", value: ["red", "blue"] },
			{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringEqualsIgnoreCase", rows: "a b c h", value: ["RED", "blue"] },
			{ failClosedOn: MYSQL_FAMILY, field: "label", operator: "StringNotEqualsIgnoreCase", rows: "d e f g", value: ["RED", "blue"] },
			{ field: "label", operator: "StringLike", rows: "a b f h", value: ["r*", "*e"] },
			{ field: "label", operator: "StringNotLike", rows: "c d e g", value: ["r*", "*e"] },
			{ field: "label", operator: "StringLike", rows: "a b c d e f g h", value: ["x*", "*"] },
			{ field: "label", operator: "StringNotLike", rows: "", value: ["x*", "*"] },
			{ field: "label", operator: "StringEqualsIfExists", rows: "a b", value: ["red", "blue"] },
			{ field: "label", operator: "StringNotEqualsIfExists", rows: "c d e f g h", value: ["red", "blue"] },
		],
	],
	[
		"Numeric",
		[
			{ field: "rank", operator: "NumericEquals", rows: "a b", value: ["1", "5"] },
			{ field: "rank", operator: "NumericNotEquals", rows: "c d e f g h", value: ["1", "5"] },
			{ field: "rank", operator: "NumericGreaterThan", rows: "c e h", value: ["10", "5"] },
			{ field: "rank", operator: "NumericLessThan", rows: "f", value: ["0", "-5"] },
		],
	],
	["Bool", [{ field: "isActive", operator: "Bool", rows: "a b c e f g", value: ["true", "false"] }]],
	[
		"Date",
		[
			{ field: "occurredAt", operator: "DateEquals", rows: "a c f", value: [JANUARY_1_TEXT, AUGUST_1_TEXT] },
			{ field: "occurredAt", operator: "DateNotEquals", rows: "b d e g h", value: [JANUARY_1_TEXT, AUGUST_1_TEXT] },
			{ field: "occurredAt", operator: "DateGreaterThan", rows: "c", value: [JULY_1_TEXT, AUGUST_1_TEXT] },
			{ field: "occurredAt", operator: "DateLessThan", rows: "a e f", value: [JANUARY_2_TEXT, JULY_1_TEXT] },
		],
	],
	[
		"IP and Arn",
		[
			{ field: "address", operator: "IpAddress", refusedOn: NOT_POSTGRES, rows: "a c e", value: ["10.0.0.0/8", "172.16.0.0/12"] },
			{ field: "address", operator: "NotIpAddress", refusedOn: NOT_POSTGRES, rows: "b d f g h", value: ["10.0.0.0/8", "172.16.0.0/12"] },
			{ failClosedOn: NOT_POSTGRES, field: "label", operator: "ArnLike", rows: "a e f", value: ["r*", "g*"] },
			{ failClosedOn: NOT_POSTGRES, field: "label", operator: "ArnNotLike", rows: "b c d g h", value: ["r*", "g*"] },
		],
	],
];

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "iam", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

describe.each<{ database: TE2eIamMultiDatabase; databaseName: string }>([
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL 17" },
	{ database: "mysql", databaseName: "MySQL 8.4" },
	{ database: "mariadb", databaseName: "MariaDB 11" },
])("IAM several values and set qualifiers answer alike on a list, a loaded row and a read on $databaseName (E2E)", ({ database }: { database: TE2eIamMultiDatabase; databaseName: string }) => {
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let fixture: IE2eIamMultiFixture;
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	let simulator: ApiAuthorizationSimulator;
	let statements: Array<IApiPolicyStatement> = [];

	// Validation reads every controller of a namespace in the process, so each database has its own.
	const namespace: string = `mlt${database}:item`;

	const statement = (effect: EApiPolicyEffect, condition?: Record<string, Record<string, unknown>>): IApiPolicyStatement => ({ Action: [`${namespace}:*`], ...(condition ? { Condition: condition } : {}), Effect: effect, Resource: ["*"] });

	const ALLOW_ALL: IApiPolicyStatement = statement(EApiPolicyEffect.ALLOW);

	const repository = (): Repository<IE2eIamMultiRow> => (app!.get(fixture.service) as { repository: Repository<IE2eIamMultiRow> }).repository;

	const connection = (entities: Array<new () => unknown>): TypeOrmModuleOptions => {
		if (mariaDbContainer) {
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

	// The rows the in-memory evaluator allows, given the relations each resource is loaded with.
	const allowedInMemory = async (options: { relations?: Record<string, boolean>; withDeleted?: boolean } = {}): Promise<Array<string>> => {
		const allowed: Array<string> = [];

		for (const row of await repository().find({ relations: (options.relations ?? { groups: true, notes: true, softNotes: true, tags: true }) as never, ...(options.withDeleted ? { withDeleted: true } : {}) })) {
			const decision = await simulator.evaluate({ action: EApiRouteType.GET, authorization: fixture.authorization as never, entity: fixture.entities.item as never, principal: PRINCIPAL, resource: row as never, routeType: EApiRouteType.GET });

			if (decision.effect === EApiPolicyEffect.ALLOW) {
				allowed.push(row.id);
			}
		}

		return allowed.sort();
	};

	const list = async (): Promise<{ ids: Array<string>; statusCode: number }> => {
		const response = await fastify.inject({ method: "GET", url: LIST_URL });

		return { ids: response.statusCode === HttpStatus.OK ? (response.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }): string => item.id).sort() : [], statusCode: response.statusCode };
	};

	// The rows a read of each answers; a row the scope does not reach answers no 200, whichever way.
	const readable = async (): Promise<Array<string>> => {
		const answers: Array<[string, number]> = await Promise.all(ALL_ROWS.map(async (id: string): Promise<[string, number]> => [id, (await fastify.inject({ method: "GET", url: `${ITEM_URL}/${id}` })).statusCode]));

		for (const [, statusCode] of answers) {
			expect([HttpStatus.OK, HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND]).toContain(statusCode);
		}

		return answers.filter(([, statusCode]: [string, number]): boolean => statusCode === HttpStatus.OK).map(([id]: [string, number]): string => id);
	};

	const expectRows = async (rows: ReadonlyArray<string>): Promise<void> => {
		expect(await allowedInMemory()).toEqual(rows);
		expect(await list()).toEqual({ ids: rows, statusCode: HttpStatus.OK });
		expect(await readable()).toEqual(rows);
	};

	const expectFailedClosed = async (): Promise<void> => {
		expect(await allowedInMemory()).toEqual([]);
		expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
		expect(await readable()).toEqual([]);
	};

	const runCases = (cases: ReadonlyArray<IMultiCase>): void => {
		const name = (multiCase: IMultiCase): string => `${multiCase.operator} ${multiCase.field} ${JSON.stringify(multiCase.value)}`;

		it.each(cases.map((multiCase: IMultiCase): [string, IMultiCase] => [name(multiCase), multiCase]))("%s", async (_name: string, multiCase: IMultiCase) => {
			const condition: Record<string, Record<string, unknown>> = { [multiCase.operator]: { [`resource.${multiCase.field}`]: multiCase.value } };
			const holding: Array<string> = multiCase.rows === "" ? [] : multiCase.rows.split(" ");
			const kept: Array<string> = ALL_ROWS.filter((id: string): boolean => !holding.includes(id));

			for (const [policy, rows] of [
				[[statement(EApiPolicyEffect.ALLOW, condition)], holding],
				[[ALLOW_ALL, statement(EApiPolicyEffect.DENY, condition)], kept],
			] as Array<[Array<IApiPolicyStatement>, Array<string>]>) {
				statements = policy;

				if (multiCase.refusedOn?.includes(database)) {
					expect((await list()).statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
					await expect(allowedInMemory()).rejects.toThrow();

					continue;
				}

				if (multiCase.failClosedOn?.includes(database)) {
					await expectFailedClosed();

					continue;
				}

				await expectRows(rows);
			}
		});
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

		fixture = createE2eIamMultiFixture(database);

		const entities: Array<new () => unknown> = [fixture.entities.item, fixture.entities.note, fixture.entities.softNote, fixture.entities.tag, fixture.entities.group];
		const moduleReference = await Test.createTestingModule({
			controllers: [fixture.controller],
			imports: [
				TypeOrmModule.forRoot(connection(entities)),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "mlt-policy", principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("mlt-policy") ? [{ document: { Statement: statements, Version: "2012-10-17" }, id: "mlt-policy", namespace, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [fixture.service, E2eIamMultiGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		simulator = app.get(ApiAuthorizationSimulator);

		const manager = repository().manager;

		await manager.getRepository(fixture.entities.tag).save(TAGS as never);
		await repository().save(ITEMS as never);
		await manager.getRepository(fixture.entities.note).save(NOTES.map(([id, item, text, score, isActive, occurredAt, address]) => ({ address, id, isActive, item: { id: item }, occurredAt, score, text })) as never);

		for (const [item, tags] of ITEM_TAGS) {
			await repository().save({ id: item, tags: tags.map((id: string): { id: string } => ({ id })) } as never);
		}

		await manager.getRepository(fixture.entities.group).save(GROUPS.map(([id, name, items]) => ({ id, items: items.map((item: string): { id: string } => ({ id: item })), name })) as never);
		await manager.getRepository(fixture.entities.softNote).save([
			{ id: "s-a", item: { id: "a" }, text: "gone" },
			{ id: "s-b", item: { id: "b" }, text: "gone" },
			{ id: "s-h1", item: { id: "h" }, text: "keep" },
			{ id: "s-h2", item: { id: "h" }, text: "gone" },
		] as never);
		await manager.getRepository(fixture.entities.softNote).softDelete(["s-a", "s-h2"]);
	}, 300_000);

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();
	});

	describe.each(SET_FAMILIES)("a set qualifier on %s", (_family: string, cases: ReadonlyArray<IMultiCase>) => {
		runCases(cases);
	});

	describe.each(VALUE_FAMILIES)("several values on a %s column", (_family: string, cases: ReadonlyArray<IMultiCase>) => {
		runCases(cases);
	});

	it("reads Null with both true and false as every row: an Allow allows them and a Deny denies the request", async () => {
		const condition: Record<string, Record<string, unknown>> = { Null: { "resource.label": ["true", "false"] } };

		statements = [statement(EApiPolicyEffect.ALLOW, condition)];
		await expectRows(ALL_ROWS);

		statements = [ALLOW_ALL, statement(EApiPolicyEffect.DENY, condition)];
		await expectFailedClosed();
	});

	describe("keys of a statement together", () => {
		it("ANDs a to-many key with a key of the resource and with another to-many key", async () => {
			statements = [statement(EApiPolicyEffect.ALLOW, { "ForAllValues:StringEquals": { "resource.tagName": "red" }, "ForAnyValue:StringEquals": { "resource.noteText": ["red", "green"] }, NumericGreaterThan: { "resource.rank": "0" } })];

			// `a` has no note, and `d`, `e` and `f` have a tag that is not red.
			await expectRows(["b", "h"]);
		});

		it("ORs Allow statements and removes what a Deny of the same relation holds on", async () => {
			statements = [statement(EApiPolicyEffect.ALLOW, { "ForAnyValue:StringEquals": { "resource.noteText": "red" } }), statement(EApiPolicyEffect.ALLOW, { "ForAnyValue:StringEquals": { "resource.tagName": "blue" } }), statement(EApiPolicyEffect.DENY, { "ForAnyValue:StringEquals": { "resource.noteText": "blue" } })];

			await expectRows(["b", "f", "h"]);
		});
	});

	describe("a relation that cannot be read", () => {
		it("fails a loaded row closed when the relation is not loaded", async () => {
			const condition: Record<string, Record<string, unknown>> = { "ForAnyValue:StringEquals": { "resource.noteText": "red" } };

			statements = [statement(EApiPolicyEffect.ALLOW, condition)];
			expect(await allowedInMemory({ relations: {} })).toEqual([]);

			statements = [ALLOW_ALL, statement(EApiPolicyEffect.DENY, condition)];
			expect(await allowedInMemory({ relations: {} })).toEqual([]);
		});

		it("does not count a deleted related row that a load with deleted rows carries", async () => {
			statements = [statement(EApiPolicyEffect.ALLOW, { "ForAnyValue:StringEquals": { "resource.softText": "gone" } })];

			expect(await allowedInMemory({ relations: { softNotes: true }, withDeleted: true })).toEqual(["b"]);
		});

		it("refuses a to-many key without a qualifier at validation", async () => {
			statements = [statement(EApiPolicyEffect.ALLOW, { StringEquals: { "resource.noteText": "red" } })];

			expect((await list()).statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			await expect(allowedInMemory()).rejects.toThrow("iamPolicyConditionQualifierRequired");
		});

		it("refuses a qualifier on a column of the resource at validation", async () => {
			statements = [statement(EApiPolicyEffect.ALLOW, { "ForAnyValue:StringEquals": { "resource.label": "red" } })];

			expect((await list()).statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			await expect(allowedInMemory()).rejects.toThrow("iamPolicyConditionQualifierUnsupported");
		});
	});

	describe("a value of a list that does not resolve", () => {
		it.each([
			["several values on a column", "StringEquals", "resource.label"],
			["a set qualifier on a relation", "ForAnyValue:StringEquals", "resource.noteText"],
			["a negated set qualifier on a relation", "ForAllValues:StringNotEquals", "resource.noteText"],
		])("fails %s closed, whatever the other values say", async (_name: string, operator: string, key: string) => {
			const condition: Record<string, Record<string, unknown>> = { [operator]: { [key]: ["red", "${principal.attributes.missing}"] } };

			statements = [statement(EApiPolicyEffect.ALLOW, condition)];
			await expectFailedClosed();

			statements = [ALLOW_ALL, statement(EApiPolicyEffect.DENY, condition)];
			await expectFailedClosed();
		});
	});

	describe("a set qualifier on a context key", () => {
		it.each<[string, string, string, unknown, boolean]>([
			["several roles, one of them matches", "ForAnyValue:StringEquals", "principal.roles", ["admin", "x"], true],
			["several roles, none matches", "ForAnyValue:StringEquals", "principal.roles", ["x", "y"], false],
			["every role is listed", "ForAllValues:StringEquals", "principal.roles", ["admin", "dev", "x"], true],
			["a role is not listed", "ForAllValues:StringEquals", "principal.roles", "admin", false],
			["an empty set fails ForAnyValue", "ForAnyValue:StringEquals", "principal.groups", "x", false],
			["an empty set holds ForAllValues", "ForAllValues:StringEquals", "principal.groups", "x", true],
			["a missing key fails ForAnyValue", "ForAnyValue:StringEquals", "principal.attributes.none", "x", false],
			["a missing key holds ForAllValues", "ForAllValues:StringEquals", "principal.attributes.none", "x", true],
			["a missing key holds ForAnyValue with IfExists", "ForAnyValue:StringEqualsIfExists", "principal.attributes.none", "x", true],
			["a list attribute", "ForAnyValue:StringLike", "principal.attributes.teams", ["c*"], true],
		])("an Allow and a Deny answer alike: %s", async (_name: string, operator: string, key: string, value: unknown, isHolding: boolean) => {
			statements = [statement(EApiPolicyEffect.ALLOW, { [operator]: { [key]: value } })];
			expect(await list()).toEqual({ ids: isHolding ? ALL_ROWS : [], statusCode: isHolding ? HttpStatus.OK : HttpStatus.FORBIDDEN });
			expect(await readable()).toEqual(isHolding ? ALL_ROWS : []);

			statements = [ALLOW_ALL, statement(EApiPolicyEffect.DENY, { [operator]: { [key]: value } })];
			expect(await list()).toEqual({ ids: isHolding ? [] : ALL_ROWS, statusCode: isHolding ? HttpStatus.FORBIDDEN : HttpStatus.OK });
			expect(await readable()).toEqual(isHolding ? [] : ALL_ROWS);
		});

		it.each(["ForAnyValue:StringEquals", "ForAllValues:StringEquals", "ForAllValues:StringNotEquals"])("%s on a list with an element that is no scalar grants nothing and denies the request", async (operator: string) => {
			const condition: Record<string, Record<string, unknown>> = { [operator]: { "principal.attributes.malformed": "admin" } };

			statements = [statement(EApiPolicyEffect.ALLOW, condition)];
			expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });

			statements = [ALLOW_ALL, statement(EApiPolicyEffect.DENY, condition)];
			expect(await list()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });
		});
	});
});
