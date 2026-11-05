import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { Repository } from "typeorm";
import type { IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";
import type { IE2eIamAuditCounter, IE2eIamAuditFixture, IE2eIamAuditItem, IE2eIamAuditRoute, TE2eIamAuditDatabase, TE2eIamAuditRouteName, TE2eIamAuditTypedField } from "./iam-audit-values";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationIamDialectRegistry, ApiAuthorizationModule, ApiAuthorizationSimulator, AuthorizationResolveDefaultPrincipal, EApiAuthorizationIamDialect, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiRouteType } from "../../src/index";
import { createE2eIamAuditFixture, E2E_IAM_AUDIT_PRINCIPAL, E2eIamAuditGuard, readE2eIamAuditNamespace } from "./iam-audit-values";

type TMemoryAnswer = "allow" | "deny" | "refused";

interface IListAnswer {
	ids: Array<string>;
	statusCode: number;
}

// A policy the grammar refuses logs an error; the assertions name what matters.
process.env.NCD_LOG_LEVEL ??= "none";

const MARIADB_PASSWORD: string = "iam-audit";
const MYSQL_PORT: number = 3306;
const PAGE: string = "limit=50&page=1";
const NUL: string = "\u0000";

// Zones east and west of UTC: Kiritimati is UTC+14, Moscow UTC+3 and New York UTC-5 or -4.
const TIME_ZONES: ReadonlyArray<string> = ["Pacific/Kiritimati", "Europe/Moscow", "America/New_York"];
const LAST_INSTANT: string = "9999-12-31T23:59:59.999Z";
const FIRST_INSTANT: string = "0001-01-01T00:00:00.000Z";

const ITEMS: ReadonlyArray<IE2eIamAuditItem> = [{ at: new Date("2024-01-01T00:00:00.000Z"), day: "2024-01-01", flag: true, id: "one", label: "x", price: "10.50", ratio: 1.5, tenant: "t1" }, { at: new Date("2000-01-01T00:00:00.000Z"), day: "2000-01-01", flag: false, id: "zero", label: "y", price: "0.00", ratio: 0, tenant: "T1" }, { id: "nul" }];

// PostgreSQL text holds no NUL, so this row is left out there.
const NUL_ITEM: IE2eIamAuditItem = { id: "nulrow", label: `a${NUL}b`, tenant: "t1x" };

const COUNTERS: ReadonlyArray<IE2eIamAuditCounter> = [
	{ id: 1, rank: 1, tenant: "t1" },
	{ id: 2, rank: 1, tenant: "t2" },
	{ id: 3, rank: 2, tenant: "t3" },
	{ id: 4, rank: 2, tenant: "t1" },
	{ id: 5, rank: 3, tenant: "t2" },
	{ id: 6, rank: 3, tenant: "t3" },
	{ id: 7, rank: 4, tenant: null },
	{ id: 8, rank: 5, tenant: "t1x" },
];

// Text each typed column cannot hold, or holds only after a coercion no policy asks for.
const UNHOLDABLE: Record<TE2eIamAuditTypedField, ReadonlyArray<string>> = {
	at: ["abc", "2024-01-01", "2024-01-01T00:00:00Z", "0000-00-00", "9999-99-99"],
	day: ["abc", "2024-13-45", "2024-01-01abc", "0"],
	flag: ["abc", "2", "yes", "0"],
	price: ["abc", "10.5abc", "1e1", "0x10"],
	ratio: ["abc", "1.5abc", "1e1"],
};

// Text some database of the family holds, such as `NaN` and `Infinity` in a PostgreSQL `numeric`: it fails closed or names what memory names.
const HELD_ELSEWHERE: Array<[TE2eIamAuditTypedField, string]> = [
	["price", "Infinity"],
	["price", "NaN"],
	["ratio", "NaN"],
	["ratio", "-Infinity"],
	["day", "infinity"],
	["day", "2024-02-30"],
];

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "iam", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

// A statement of the namespace, on every resource unless it names a Resource or NotResource of its own.
const statementOf = (effect: EApiPolicyEffect, namespace: string, extra: Partial<IApiPolicyStatement>): IApiPolicyStatement => ({ Action: [`${namespace}:*`], Effect: effect, ...(extra.NotResource ? {} : { Resource: ["*"] }), ...extra });
const allow = (namespace: string, extra: Partial<IApiPolicyStatement> = {}): IApiPolicyStatement => statementOf(EApiPolicyEffect.ALLOW, namespace, extra);
const deny = (namespace: string, extra: Partial<IApiPolicyStatement> = {}): IApiPolicyStatement => statementOf(EApiPolicyEffect.DENY, namespace, extra);

describe.each<{ database: TE2eIamAuditDatabase; databaseName: string }>([
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL 17" },
	{ database: "mysql", databaseName: "MySQL 8.4" },
	{ database: "mariadb", databaseName: "MariaDB 11" },
])("IAM values, dialects and evaluation on $databaseName (E2E)", ({ database }: { database: TE2eIamAuditDatabase; databaseName: string }) => {
	const previousTimeZone: string | undefined = process.env.TZ;
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; remoteAddress?: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let fixture: IE2eIamAuditFixture;
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	let simulator: ApiAuthorizationSimulator;
	let namespace: string = "";
	let statements: ReadonlyArray<IApiPolicyStatement> = [];

	const items = (): Repository<IE2eIamAuditItem> => (app!.get(fixture.itemService) as { repository: Repository<IE2eIamAuditItem> }).repository;
	const counters = (): Repository<IE2eIamAuditCounter> => (app!.get(fixture.counterService) as { repository: Repository<IE2eIamAuditCounter> }).repository;
	const hasNulRow: boolean = database !== "postgres";

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

	const use = (name: TE2eIamAuditRouteName, policy: ReadonlyArray<IApiPolicyStatement>): IE2eIamAuditRoute => {
		const route: IE2eIamAuditRoute | undefined = fixture.routes[name];

		if (!route) {
			throw new Error(`No ${name} route on ${database}`);
		}

		namespace = route.authorization.policyNamespace;
		statements = policy;

		return route;
	};

	const list = async (route: IE2eIamAuditRoute, query: string = PAGE, request: { headers?: Record<string, string>; remoteAddress?: string } = {}): Promise<IListAnswer> => {
		const response = await fastify.inject({ ...request, method: "GET", url: `${route.url}?${query}` });

		return { ids: response.statusCode === HttpStatus.OK ? (response.json() as { items: Array<{ id: number | string }> }).items.map((item: { id: number | string }): string => String(item.id)).sort() : [], statusCode: response.statusCode };
	};

	const remember = async (route: IE2eIamAuditRoute, row: object): Promise<TMemoryAnswer> => {
		try {
			const decision = await simulator.evaluate({ action: EApiRouteType.GET_LIST, authorization: route.authorization as never, entity: route.entity as never, principal: E2E_IAM_AUDIT_PRINCIPAL, requestMetadata: { ip: "127.0.0.1", parameters: {} } as never, resource: row as never, routeType: EApiRouteType.GET_LIST });

			return decision.effect === EApiPolicyEffect.ALLOW ? "allow" : "deny";
		} catch {
			return "refused";
		}
	};

	// The ids memory allows of the loaded rows of a route.
	const memoryAllowed = async (route: IE2eIamAuditRoute): Promise<Array<string>> => {
		const rows: Array<{ id: number | string }> = (await (route.entity === fixture.counter ? counters() : items()).find()) as Array<{ id: number | string }>;
		const allowed: Array<string> = [];

		for (const row of rows) {
			if ((await remember(route, row)) === "allow") {
				allowed.push(String(row.id));
			}
		}

		return allowed.sort();
	};

	// A list answers 200 or 403, and never shows a row memory denies.
	const expectNoHardDisagreement = async (route: IE2eIamAuditRoute, answer: IListAnswer): Promise<Array<string>> => {
		const allowed: Array<string> = await memoryAllowed(route);

		expect([HttpStatus.OK, HttpStatus.FORBIDDEN]).toContain(answer.statusCode);
		expect(answer.ids.filter((id: string): boolean => !allowed.includes(id))).toEqual([]);

		return allowed;
	};

	const seedItems = async (): Promise<void> => {
		await items().clear();
		await items().save([...ITEMS, ...(hasNulRow ? [NUL_ITEM] : [])] as never);
	};

	beforeAll(async () => {
		process.env.TZ = "UTC";

		if (database === "postgres") {
			postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		if (database === "mysql") {
			mysqlContainer = await new MySqlContainer("mysql:8.4").start();
		}

		if (database === "mariadb") {
			mariaDbContainer = await startMariaDb();
		}

		fixture = createE2eIamAuditFixture(database);

		const entities: Array<new () => unknown> = [fixture.item, fixture.counter];
		const moduleReference = await Test.createTestingModule({
			controllers: Object.values(fixture.routes).map((route: IE2eIamAuditRoute): new () => unknown => route.controller),
			imports: [
				TypeOrmModule.forRoot(connection(entities)),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "audit-policy", principalId: E2E_IAM_AUDIT_PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("audit-policy") ? [{ document: { Statement: statements as Array<IApiPolicyStatement>, Version: "2012-10-17" }, id: "audit-policy", namespace, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [fixture.itemService, fixture.counterService, E2eIamAuditGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		simulator = app.get(ApiAuthorizationSimulator);

		await seedItems();

		if (fixture.routes.counter) {
			await counters().save(COUNTERS as never);
		}
	}, 300_000);

	afterEach(() => {
		vi.restoreAllMocks();
	});

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();

		if (previousTimeZone === undefined) {
			delete process.env.TZ;
		} else {
			process.env.TZ = previousTimeZone;
		}
	});

	describe("F5: a placeholder text its column cannot hold names no row", () => {
		const cases: Array<[TE2eIamAuditTypedField, string]> = Object.entries(UNHOLDABLE).flatMap(([field, values]: [string, ReadonlyArray<string>]): Array<[TE2eIamAuditTypedField, string]> => values.map((value: string): [TE2eIamAuditTypedField, string] => [field as TE2eIamAuditTypedField, value]));

		it.each(cases)("%s = %j", async (field: TE2eIamAuditTypedField, value: string) => {
			const ns: string = readE2eIamAuditNamespace(field, database);
			const target: string = `${ns}/${value}`;
			const every: Array<string> = (await items().find()).map((row: IE2eIamAuditItem): string => row.id).sort();

			// A Deny of no row keeps every row, with no coercion: `abc` removes no 0.00 row, `10.5abc` no 10.50 row.
			const denied: IListAnswer = await list(use(field, [allow(ns), deny(ns, { Resource: [target] })]));

			expect(await expectNoHardDisagreement(fixture.routes[field], denied)).toEqual(every);
			expect(denied).toEqual({ ids: every, statusCode: HttpStatus.OK });

			const others: IListAnswer = await list(use(field, [allow(ns, { NotResource: [target] })]));

			expect(await expectNoHardDisagreement(fixture.routes[field], others)).toEqual(every);
			expect(others).toEqual({ ids: every, statusCode: HttpStatus.OK });

			const allowed: IListAnswer = await list(use(field, [allow(ns, { Resource: [target] })]));

			expect(await expectNoHardDisagreement(fixture.routes[field], allowed)).toEqual([]);
			expect(allowed.ids).toEqual([]);
		});

		it.each(HELD_ELSEWHERE)("%s = %j fails closed or names what memory names, with no coercion", async (field: TE2eIamAuditTypedField, value: string) => {
			const ns: string = readE2eIamAuditNamespace(field, database);
			const target: string = `${ns}/${value}`;
			const every: Array<string> = (await items().find()).map((row: IE2eIamAuditItem): string => row.id).sort();

			for (const policy of [[allow(ns), deny(ns, { Resource: [target] })], [allow(ns, { NotResource: [target] })], [allow(ns, { Resource: [target] })]]) {
				const answer: IListAnswer = await list(use(field, policy));
				const remembered: Array<string> = await expectNoHardDisagreement(fixture.routes[field], answer);

				expect([HttpStatus.OK, HttpStatus.FORBIDDEN]).toContain(answer.statusCode);

				if (answer.statusCode === HttpStatus.OK) {
					expect(answer.ids).toEqual(remembered);
				}

				expect(remembered.length === 0 || remembered.length === every.length).toBe(true);
			}
		});

		it("reads a principal value no decimal column holds as no row", async () => {
			const ns: string = readE2eIamAuditNamespace("price", database);
			const every: Array<string> = (await items().find()).map((row: IE2eIamAuditItem): string => row.id).sort();
			const denied: IListAnswer = await list(use("price", [allow(ns), deny(ns, { Resource: [`${ns}/\${principal.attributes.attr}`] })]));

			expect(await expectNoHardDisagreement(fixture.routes.price, denied)).toEqual(every);
			expect(denied).toEqual({ ids: every, statusCode: HttpStatus.OK });
		});
	});

	describe("F6: an instant at the edge of the range fails closed in every process time zone", () => {
		it.each(TIME_ZONES)("in %s", async (timeZone: string) => {
			process.env.TZ = timeZone;

			try {
				await seedItems();

				const ns: string = readE2eIamAuditNamespace("items", database);
				const isWallClock: boolean = database !== "sqlite";
				// The local wall clock of the last instant leaves year 9999 east of UTC, and that of the first leaves year 1 west of it.
				const leaving: string = timeZone === "America/New_York" ? FIRST_INSTANT : LAST_INSTANT;

				for (const [operator, value] of [
					["DateLessThan", LAST_INSTANT],
					["DateGreaterThan", FIRST_INSTANT],
				] as Array<[string, string]>) {
					const condition: Record<string, Record<string, string>> = { [operator]: { "resource.at": value } };
					const allowed: IListAnswer = await list(use("items", [allow(ns, { Condition: condition })]));

					await expectNoHardDisagreement(fixture.routes.items, allowed);

					const denied: IListAnswer = await list(use("items", [allow(ns), deny(ns, { Condition: condition })]));
					const memory: Array<string> = await expectNoHardDisagreement(fixture.routes.items, denied);

					if (isWallClock && value === leaving) {
						expect(denied.statusCode).toBe(HttpStatus.FORBIDDEN);
						expect(allowed.ids).toEqual([]);
					} else {
						expect(denied).toEqual({ ids: memory, statusCode: HttpStatus.OK });
					}
				}
			} finally {
				process.env.TZ = "UTC";
				await seedItems();
			}
		});
	});

	describe("F8: a NUL in a text path or filter value is refused", () => {
		it.each([
			["a read", "/iam-audit/items/a%00b"],
			["an equality filter", `/iam-audit/items?${PAGE}&label[operator]=eq&label[value]=a%00b`],
			["a contains filter", `/iam-audit/items?${PAGE}&label[operator]=cont&label[value]=a%00b`],
			["a list filter", `/iam-audit/items?${PAGE}&label[operator]=in&label[values]=x&label[values]=a%00b`],
		])("in %s", async (_name: string, url: string) => {
			use("items", [allow(readE2eIamAuditNamespace("items", database))]);

			expect((await fastify.inject({ method: "GET", url })).statusCode).toBe(HttpStatus.BAD_REQUEST);
		});
	});

	describe.skipIf(database !== "postgres")("F9: a cursor walk keeps the scope a lowerer writes in SQL", () => {
		const walk = async (route: IE2eIamAuditRoute): Promise<{ ids: Array<string>; statusCode: number }> => {
			const seen: Array<string> = [];
			let url: string = `${route.url}?limit=1`;

			for (let index: number = 0; index <= COUNTERS.length; index++) {
				const response = await fastify.inject({ method: "GET", url });

				if (response.statusCode !== HttpStatus.OK) {
					return { ids: seen, statusCode: response.statusCode };
				}

				const body: { items: Array<{ id: number }>; nextCursor: null | string } = response.json() as { items: Array<{ id: number }>; nextCursor: null | string };

				seen.push(...body.items.map((item: { id: number }): string => String(item.id)));

				if (!body.nextCursor) {
					break;
				}

				url = `${route.url}?limit=1&after=${body.nextCursor}`;
			}

			return { ids: seen.sort(), statusCode: HttpStatus.OK };
		};

		it.each<[string, (ns: string) => Array<IApiPolicyStatement>]>([
			["an Allow StringLike", (ns: string) => [allow(ns, { Condition: { StringLike: { "resource.tenant": "t1*" } } })]],
			["a Deny StringLike", (ns: string) => [allow(ns), deny(ns, { Condition: { StringLike: { "resource.tenant": "t1*" } } })]],
			["a Deny of an integer key", (ns: string) => [allow(ns), deny(ns, { Resource: [`${ns}/1`] })]],
			["an Allow of two scopes", (ns: string) => [allow(ns, { Condition: { StringLike: { "resource.tenant": "t1*" } } }), allow(ns, { Condition: { NumericEquals: { "resource.rank": 3 } } })]],
		])("under %s", async (_name: string, policy: (ns: string) => Array<IApiPolicyStatement>) => {
			const route: IE2eIamAuditRoute = use("counter", policy(readE2eIamAuditNamespace("counter", database)));
			const walked: { ids: Array<string>; statusCode: number } = await walk(route);

			expect(walked).toEqual({ ids: await memoryAllowed(route), statusCode: HttpStatus.OK });
			expect(walked.ids.length).toBeGreaterThan(1);
		});

		it("still refuses a client cursor it did not write", async () => {
			const route: IE2eIamAuditRoute = use("counter", [allow(readE2eIamAuditNamespace("counter", database), { Condition: { StringLike: { "resource.tenant": "t1*" } } })]);

			expect((await fastify.inject({ method: "GET", url: `${route.url}?limit=1&after=not-a-cursor` })).statusCode).toBe(HttpStatus.BAD_REQUEST);
		});
	});

	describe("F10: the portable dialect compares no text it cannot compare exactly", () => {
		it.each<[string, TE2eIamAuditRouteName, (ns: string) => Array<IApiPolicyStatement>]>([
			["an Allow StringEquals", "items", (ns: string) => [allow(ns, { Condition: { StringEquals: { "resource.tenant": "t1" } } })]],
			["an Allow of a text placeholder", "tenant", (ns: string) => [allow(ns, { Resource: [`${ns}/t1`] })]],
			["a Deny StringNotEquals", "items", (ns: string) => [allow(ns), deny(ns, { Condition: { StringNotEquals: { "resource.tenant": "t1" } } })]],
			["a Deny of a text placeholder", "tenant", (ns: string) => [allow(ns), deny(ns, { NotResource: [`${ns}/t1`] })]],
			["a Deny DateGreaterThan on an instant", "items", (ns: string) => [allow(ns), deny(ns, { Condition: { DateGreaterThan: { "resource.at": "2020-01-01T00:00:00Z" } } })]],
		])("%s fails closed", async (_name: string, name: TE2eIamAuditRouteName, policy: (ns: string) => Array<IApiPolicyStatement>) => {
			vi.spyOn(ApiAuthorizationIamDialectRegistry.prototype, "resolve").mockResolvedValue({ type: EApiAuthorizationIamDialect.PORTABLE });

			const route: IE2eIamAuditRoute = use(name, policy(readE2eIamAuditNamespace(name, database)));
			const answer: IListAnswer = await list(route);

			await expectNoHardDisagreement(route, answer);
			expect(answer.statusCode).toBe(HttpStatus.FORBIDDEN);
		});
	});

	describe("F11-F13: request keys read as the request means them", () => {
		it.each<[string, (ns: string) => Array<IApiPolicyStatement>, { headers?: Record<string, string>; remoteAddress?: string }]>([
			["a Deny of a header key written in upper case", (ns: string) => [allow(ns), deny(ns, { Condition: { StringEquals: { "request.headers.X-Foo": "bad" } } })], { headers: { "x-foo": "bad" } }],
			["an Allow StringNotEqualsIfExists of a header key written in upper case", (ns: string) => [allow(ns, { Condition: { StringNotEqualsIfExists: { "request.headers.X-Foo": "bad" } } })], { headers: { "x-foo": "bad" } }],
			["an Allow Null false of an inherited principal property", (ns: string) => [allow(ns, { Condition: { Null: { "principal.attributes.constructor": "false" } } })], {}],
			["an Allow Null false of the prototype", (ns: string) => [allow(ns, { Condition: { Null: { "principal.attributes.__proto__": "false" } } })], {}],
			["a Deny of an IPv4-mapped range for an IPv4 client", (ns: string) => [allow(ns), deny(ns, { Condition: { IpAddress: { "request.ip": "::ffff:10.0.0.0/104" } } })], { remoteAddress: "10.1.2.3" }],
			["a Deny of an IPv4-mapped range for an IPv4-mapped client", (ns: string) => [allow(ns), deny(ns, { Condition: { IpAddress: { "request.ip": "::ffff:10.0.0.0/104" } } })], { remoteAddress: "::ffff:10.1.2.3" }],
		])("%s denies", async (_name: string, policy: (ns: string) => Array<IApiPolicyStatement>, request: { headers?: Record<string, string>; remoteAddress?: string }) => {
			const answer: IListAnswer = await list(use("items", policy(readE2eIamAuditNamespace("items", database))), PAGE, request);

			expect(answer.statusCode).toBe(HttpStatus.FORBIDDEN);
		});

		it("allows an IPv4 client in an IPv4-mapped range", async () => {
			const ns: string = readE2eIamAuditNamespace("items", database);
			const answer: IListAnswer = await list(use("items", [allow(ns, { Condition: { IpAddress: { "request.ip": "::ffff:10.0.0.0/104" } } })]), PAGE, { remoteAddress: "10.1.2.3" });

			expect(answer.statusCode).toBe(HttpStatus.OK);
		});
	});

	describe("F14: an empty default in a pattern is refused when the document loads", () => {
		it.each<[string, (ns: string) => Array<IApiPolicyStatement>]>([
			["a StringLike value", (ns: string) => [allow(ns), deny(ns, { Condition: { StringLike: { "resource.tenant": "${principal.attributes.missing, ''}*" } } })]],
			["a Resource pattern", (ns: string) => [allow(ns), deny(ns, { Resource: [`${ns}/\${principal.attributes.missing, ''}*`] })]],
			["a NotResource pattern", (ns: string) => [allow(ns, { NotResource: [`${ns}/\${principal.attributes.missing, ''}x`] })]],
		])("in %s", async (_name: string, policy: (ns: string) => Array<IApiPolicyStatement>) => {
			const answer: IListAnswer = await list(use("items", policy(readE2eIamAuditNamespace("items", database))));

			expect(answer.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});
	});

	describe.skipIf(!hasNulRow)("F15: a row holding a NUL agrees with memory or is withheld", () => {
		it.each<[string, (ns: string) => Array<IApiPolicyStatement>]>([
			["an Allow StringLike suffix", (ns: string) => [allow(ns, { Condition: { StringLike: { "resource.label": "*a" } } })]],
			["an Allow StringLike prefix", (ns: string) => [allow(ns, { Condition: { StringLike: { "resource.label": "a" } } })]],
			["a Deny StringLike", (ns: string) => [allow(ns), deny(ns, { Condition: { StringLike: { "resource.label": "a*b" } } })]],
			["an Allow StringNotLike", (ns: string) => [allow(ns, { Condition: { StringNotLike: { "resource.label": "a*b" } } })]],
			["an Allow StringEqualsIgnoreCase", (ns: string) => [allow(ns, { Condition: { StringEqualsIgnoreCase: { "resource.label": "A" } } })]],
			["a Deny StringNotEqualsIgnoreCase", (ns: string) => [allow(ns), deny(ns, { Condition: { StringNotEqualsIgnoreCase: { "resource.label": "A" } } })]],
		])("under %s", async (_name: string, policy: (ns: string) => Array<IApiPolicyStatement>) => {
			const route: IE2eIamAuditRoute = use("items", policy(readE2eIamAuditNamespace("items", database)));

			await expectNoHardDisagreement(route, await list(route));
		});
	});
});
