import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { ObjectLiteral, Repository } from "typeorm";
import type { IApiPolicyStatement } from "../../src/index";
import type { IE2eIamPathApp, IE2eIamPathFixture, IE2eIamPathRefusal, IE2eIamPathRow, TE2eIamPathDatabase } from "./iam-audit-paths";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EFilterOperation } from "../../src/index";
import { createE2eIamPathFixture, E2E_IAM_PATH_LIKE_OPERATIONS, E2E_IAM_PATH_PRINCIPAL, E2eIamPathGuard, EE2eIamPathKind } from "./iam-audit-paths";

// A refused startup and a refused policy document log an error; the assertions name what matters.
process.env.NCD_LOG_LEVEL ??= "none";

const MARIADB_PASSWORD: string = "iam-path";
const MYSQL_PORT: number = 3306;
const PAGE: string = "limit=50&page=1";
const BIG_MAX: string = "9223372036854775807";
const BIG_MIN: string = "-9223372036854775808";

// Literal text holding each LIKE wildcard and the escape character, and rows each would match as a pattern.
const LABELS: ReadonlyArray<string> = ["\\", "%", "_", "a\\", "a%b", "axb", "a_b", "a", "ab", "x\\y", "xy", "b%"];
const LIKE_VALUES: ReadonlyArray<string> = ["\\", "%", "_", "a\\", "a%b"];

const ROWS: ReadonlyArray<IE2eIamPathRow> = LABELS.map((label: string, index: number): IE2eIamPathRow => ({ big: String(index + 1), id: `aaaaaaaa-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, kind: EE2eIamPathKind.PUBLIC, label, rank: index + 1 }));
const DENIED_ID: string = ROWS[0]!.id;
const OTHER_ID: string = ROWS[1]!.id;

// Every other spelling a database would read as the denied key.
const UUID_SPELLINGS: ReadonlyArray<string> = [DENIED_ID.toUpperCase(), DENIED_ID.replaceAll("-", ""), `%7B${DENIED_ID}%7D`, `urn:uuid:${DENIED_ID}`, `${DENIED_ID}%20`];
const ENUM_SPELLINGS: ReadonlyArray<string> = ["SECRET", "Secret", "secret%20", "%20secret"];
const INTEGER_SPELLINGS: ReadonlyArray<string> = ["-0", "00", "%2B0", "0.0", "0e0"];

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "iam", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

const statementOf = (effect: EApiPolicyEffect, namespace: string, resource: Array<string> = ["*"]): IApiPolicyStatement => ({ Action: [`${namespace}:*`], Effect: effect, Resource: resource });

// What a LIKE family operator matches when its client text is literal text.
const matchesLiterally = (operation: EFilterOperation, label: string, value: string): boolean => {
	const lowerLabel: string = label.toLowerCase();
	const lowerValue: string = value.toLowerCase();

	switch (operation) {
		case EFilterOperation.CONT: {
			return label.includes(value);
		}

		case EFilterOperation.CONTL: {
			return lowerLabel.includes(lowerValue);
		}

		case EFilterOperation.ENDS: {
			return label.endsWith(value);
		}

		case EFilterOperation.ENDSL: {
			return lowerLabel.endsWith(lowerValue);
		}

		case EFilterOperation.EQL:

		case EFilterOperation.INL: {
			return lowerLabel === lowerValue;
		}

		case EFilterOperation.NEL:

		case EFilterOperation.NOTINL: {
			return lowerLabel !== lowerValue;
		}

		case EFilterOperation.STARTS: {
			return label.startsWith(value);
		}

		case EFilterOperation.STARTSL: {
			return lowerLabel.startsWith(lowerValue);
		}

		default: {
			throw new Error(`${operation} is not a LIKE family operator`);
		}
	}
};

const LIKE_CASES: Array<[EFilterOperation, string]> = E2E_IAM_PATH_LIKE_OPERATIONS.flatMap((operation: EFilterOperation): Array<[EFilterOperation, string]> => LIKE_VALUES.map((value: string): [EFilterOperation, string] => [operation, value]));

const likeQuery = (operation: EFilterOperation, value: string): string => `label[operator]=${operation}&label[${operation === EFilterOperation.INL || operation === EFilterOperation.NOTINL ? "values" : "value"}]=${encodeURIComponent(value)}`;

const expectedLabels = (operation: EFilterOperation, value: string): Array<string> => LABELS.filter((label: string): boolean => matchesLiterally(operation, label, value)).sort();

describe.each<{ database: TE2eIamPathDatabase; databaseName: string }>([
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL 17" },
	{ database: "mysql", databaseName: "MySQL 8.4" },
	{ database: "mariadb", databaseName: "MariaDB 11" },
])("IAM path values, LIKE filters and documents on $databaseName (E2E)", ({ database }: { database: TE2eIamPathDatabase; databaseName: string }) => {
	const fixture: IE2eIamPathFixture = createE2eIamPathFixture(database);
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	let records: Array<Record<string, unknown>> = [];

	const repository = <E extends ObjectLiteral>(service: new () => unknown): Repository<E> => (app!.get(service) as { repository: Repository<E> }).repository;

	// The MySQL family connects as root, so one test can change the global sql_mode.
	const connection = (entities: Array<new () => unknown>, isFresh: boolean): TypeOrmModuleOptions => {
		const schema: { dropSchema: boolean; entities: Array<new () => unknown>; synchronize: boolean } = { dropSchema: isFresh, entities, synchronize: true };

		if (mariaDbContainer) {
			return { ...schema, database: "iam", host: mariaDbContainer.getHost(), password: MARIADB_PASSWORD, port: mariaDbContainer.getMappedPort(MYSQL_PORT), type: "mysql", username: "root" };
		}

		if (mysqlContainer) {
			return { ...schema, database: mysqlContainer.getDatabase(), host: mysqlContainer.getHost(), password: mysqlContainer.getRootPassword(), port: mysqlContainer.getPort(), type: "mysql", username: "root" };
		}

		if (postgresContainer) {
			return { ...schema, type: "postgres", url: postgresContainer.getConnectionUri() };
		}

		return { ...schema, database: ":memory:", type: "better-sqlite3" };
	};

	const create = async (definition: IE2eIamPathApp, isFresh: boolean): Promise<INestApplication> => {
		const moduleReference = await Test.createTestingModule({
			controllers: definition.controllers,
			imports: [
				TypeOrmModule.forRoot(connection(definition.entities, isFresh)),
				TypeOrmModule.forFeature(definition.entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: records.map((record: Record<string, unknown>) => ({ policyId: record.id, principalId: E2E_IAM_PATH_PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER })), boundaries: [] }) }],
						documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(records.filter((record: Record<string, unknown>): boolean => ids.includes(record.id as string))) }],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [...definition.providers, E2eIamPathGuard],
		}).compile();

		return moduleReference.createNestApplication(new FastifyAdapter());
	};

	// The message a definition fails startup with, or "started".
	const startupOf = async (definition: IE2eIamPathApp): Promise<string> => {
		let application: INestApplication | undefined;

		try {
			application = await create(definition, false);
			await application.init();

			return "started";
		} catch (error: unknown) {
			return (error as Error).message;
		} finally {
			await application?.close().catch((): undefined => undefined);
		}
	};

	const recordOf = (id: string, namespace: unknown, statements: ReadonlyArray<IApiPolicyStatement>): Record<string, unknown> => ({ document: { Statement: statements, Version: "2012-10-17" }, id, ...(namespace === undefined ? {} : { namespace }), sourceType: EApiPolicySourceType.DATABASE, version: "1" });

	const use = (policies: Record<string, ReadonlyArray<IApiPolicyStatement>>): void => {
		records = Object.entries(policies).map(([namespace, statements]: [string, ReadonlyArray<IApiPolicyStatement>], index: number) => recordOf(`path-policy-${String(index)}`, namespace, statements));
	};

	const status = async (url: string): Promise<number> => (await fastify.inject({ method: "GET", url })).statusCode;

	const labelsOf = async (url: string): Promise<Array<string> | number> => {
		const response = await fastify.inject({ method: "GET", url });

		if (response.statusCode !== HttpStatus.OK) {
			return response.statusCode;
		}

		const ids: Array<string> = (response.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }): string => item.id);

		return ROWS.filter((row: IE2eIamPathRow): boolean => ids.includes(row.id))
			.map((row: IE2eIamPathRow): string => row.label)
			.sort();
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

		app = await create(fixture.app, true);
		await app.init();
		fastify = app.getHttpAdapter().getInstance();

		await repository<IE2eIamPathRow>(fixture.rowService).save([...ROWS]);
		await repository(fixture.kindService).save([
			{ kind: EE2eIamPathKind.PUBLIC, note: "p" },
			{ kind: EE2eIamPathKind.SECRET, note: "s" },
		] as never);
		await repository(fixture.countService).save([{ id: 0 }, { id: 1 }] as never);
		await repository(fixture.bigService).save([{ id: "1" }] as never);
		await repository(fixture.tenantService).save([
			{ id: 1, tenantCode: "acme" },
			{ id: 2, tenantCode: "other" },
		] as never);
	}, 300_000);

	afterAll(async () => {
		await app?.close();
		await postgresContainer?.stop();
		await mysqlContainer?.stop();
		await mariaDbContainer?.stop();
	});

	describe("a path value has one spelling", () => {
		it.each(fixture.refusals.map((refusal: IE2eIamPathRefusal): [string, IE2eIamPathRefusal] => [refusal.name, refusal]))("refuses to start %s", async (_name: string, refusal: IE2eIamPathRefusal) => {
			expect(await startupOf(refusal.app)).toMatch(refusal.message);
		});

		it("denies the uuid a Deny names and answers 400 to every other spelling of it", async () => {
			use({ [fixture.namespaces.rows]: [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.rows), statementOf(EApiPolicyEffect.DENY, fixture.namespaces.rows, [`${fixture.namespaces.rows}/${DENIED_ID}`])] });

			expect(await status(`/iam-path/rows/${DENIED_ID}`)).toBe(HttpStatus.FORBIDDEN);
			expect(await status(`/iam-path/rows/${OTHER_ID}`)).toBe(HttpStatus.OK);

			for (const spelling of UUID_SPELLINGS) {
				expect({ spelling, status: await status(`/iam-path/rows/${spelling}`) }).toEqual({ spelling, status: HttpStatus.BAD_REQUEST });
			}
		});

		it("denies the enum value a Deny names and answers 400 to every other spelling of it", async () => {
			use({ [fixture.namespaces.kinds]: [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.kinds), statementOf(EApiPolicyEffect.DENY, fixture.namespaces.kinds, [`${fixture.namespaces.kinds}/secret`])] });

			expect(await status("/iam-path/kinds/secret")).toBe(HttpStatus.FORBIDDEN);
			expect(await status("/iam-path/kinds/public")).toBe(HttpStatus.OK);

			for (const spelling of ENUM_SPELLINGS) {
				expect({ spelling, status: await status(`/iam-path/kinds/${spelling}`) }).toEqual({ spelling, status: HttpStatus.BAD_REQUEST });
			}
		});

		it("denies the integer a Deny names and answers 400 to -0 and every other spelling of it", async () => {
			use({ [fixture.namespaces.counts]: [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.counts), statementOf(EApiPolicyEffect.DENY, fixture.namespaces.counts, [`${fixture.namespaces.counts}/0`])] });

			expect(await status("/iam-path/counts/0")).toBe(HttpStatus.FORBIDDEN);
			expect(await status("/iam-path/counts/1")).toBe(HttpStatus.OK);

			for (const spelling of INTEGER_SPELLINGS) {
				expect({ spelling, status: await status(`/iam-path/counts/${spelling}`) }).toEqual({ spelling, status: HttpStatus.BAD_REQUEST });
			}
		});
	});

	describe("a signed 64-bit column holds its range only", () => {
		it("answers 400 to a path value outside the range", async () => {
			use({ [fixture.namespaces.bigs]: [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.bigs)] });

			expect(await status("/iam-path/bigs/9223372036854775808")).toBe(HttpStatus.BAD_REQUEST);
			expect(await status("/iam-path/bigs/-9223372036854775809")).toBe(HttpStatus.BAD_REQUEST);
			expect(await status(`/iam-path/bigs/${BIG_MAX}`)).toBe(HttpStatus.NOT_FOUND);
			expect(await status(`/iam-path/bigs/${BIG_MIN}`)).toBe(HttpStatus.NOT_FOUND);
			expect(await status("/iam-path/bigs/1")).toBe(HttpStatus.OK);
		});

		it("answers 400 to a filter value outside the range", async () => {
			use({ [fixture.namespaces.rows]: [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.rows)] });

			expect(await status(`/iam-path/rows?${PAGE}&big[operator]=eq&big[value]=9223372036854775808`)).toBe(HttpStatus.BAD_REQUEST);
			expect(await status(`/iam-path/rows?${PAGE}&big[operator]=eq&big[value]=-9223372036854775809`)).toBe(HttpStatus.BAD_REQUEST);
			expect(await labelsOf(`/iam-path/rows?${PAGE}&big[operator]=eq&big[value]=${BIG_MAX}`)).toEqual([]);
			expect(await labelsOf(`/iam-path/rows?${PAGE}&big[operator]=eq&big[value]=1`)).toEqual([LABELS[0]]);
		});

		it("answers 400 to a body value outside the range", async () => {
			use({ [fixture.namespaces.rows]: [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.rows)] });
			const body = (id: string, big: string): Record<string, unknown> => ({ big, id, kind: EE2eIamPathKind.PUBLIC, label: "new", rank: 99 });
			const created: Array<string> = ["00000000-0000-4000-8000-0000000000f1", "00000000-0000-4000-8000-0000000000f2"];

			try {
				expect((await fastify.inject({ method: "POST", payload: body("00000000-0000-4000-8000-0000000000f0", "9223372036854775808"), url: "/iam-path/rows" })).statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect((await fastify.inject({ method: "POST", payload: body("00000000-0000-4000-8000-0000000000f0", "-9223372036854775809"), url: "/iam-path/rows" })).statusCode).toBe(HttpStatus.BAD_REQUEST);
				expect((await fastify.inject({ method: "POST", payload: body(created[0]!, BIG_MAX), url: "/iam-path/rows" })).statusCode).toBe(HttpStatus.CREATED);
				expect((await fastify.inject({ method: "POST", payload: body(created[1]!, BIG_MIN), url: "/iam-path/rows" })).statusCode).toBe(HttpStatus.CREATED);
			} finally {
				await repository<IE2eIamPathRow>(fixture.rowService).delete(created);
			}
		});
	});

	describe("the client text of a LIKE family filter is literal", () => {
		it.each(LIKE_CASES)("matches %s %j literally on a page list", async (operation: EFilterOperation, value: string) => {
			use({ [fixture.namespaces.rows]: [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.rows)] });

			expect(await labelsOf(`/iam-path/rows?${PAGE}&${likeQuery(operation, value)}`)).toEqual(expectedLabels(operation, value));
		});

		it.runIf(database === "postgres").each(LIKE_CASES)("matches %s %j literally on a cursor list", async (operation: EFilterOperation, value: string) => {
			const namespace: string = `ipcursor${database}:item`;
			use({ [namespace]: [statementOf(EApiPolicyEffect.ALLOW, namespace)] });

			expect(await labelsOf(`/iam-path/cursor-rows?limit=50&${likeQuery(operation, value)}`)).toEqual(expectedLabels(operation, value));
		});

		it.runIf(database === "postgres")("keeps a LIKE filter literal on a cursor list under a Deny, which the cursor predicate merges", async () => {
			const namespace: string = `ipcursor${database}:item`;
			use({ [namespace]: [statementOf(EApiPolicyEffect.ALLOW, namespace), { ...statementOf(EApiPolicyEffect.DENY, namespace), Condition: { StringLike: { "resource.label": "a*" } } }] });

			expect(await labelsOf(`/iam-path/cursor-rows?limit=50&${likeQuery(EFilterOperation.CONT, "%")}`)).toEqual(["%", "b%"]);
		});
	});

	describe("a policy document namespace is a non-empty string", () => {
		it.each([
			["missing", undefined],
			["null", null],
			["empty", ""],
			["a number", 5],
		])("answers 500 when a Deny document has its namespace %s", async (_name: string, namespace: unknown) => {
			records = [recordOf("path-allow", fixture.namespaces.counts, [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.counts)]), recordOf("path-deny", namespace, [statementOf(EApiPolicyEffect.DENY, fixture.namespaces.counts)])];

			expect(await status("/iam-path/counts/1")).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
		});

		it("denies with the same Deny document under its own namespace", async () => {
			records = [recordOf("path-allow", fixture.namespaces.counts, [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.counts)]), recordOf("path-deny", fixture.namespaces.counts, [statementOf(EApiPolicyEffect.DENY, fixture.namespaces.counts)])];

			expect(await status("/iam-path/counts/1")).toBe(HttpStatus.FORBIDDEN);
		});
	});

	describe("a placeholder reads the column its path scope binds", () => {
		it("allows the tenant an Allow names and no other", async () => {
			use({ [fixture.namespaces.tenants]: [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.tenants, [`${fixture.namespaces.tenants}/acme/*`])] });

			expect(await status("/iam-path/tenants/acme/items/1")).toBe(HttpStatus.OK);
			expect(await status("/iam-path/tenants/other/items/2")).toBe(HttpStatus.FORBIDDEN);
		});

		it("denies the tenant a Deny names and no other", async () => {
			use({ [fixture.namespaces.tenants]: [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.tenants), statementOf(EApiPolicyEffect.DENY, fixture.namespaces.tenants, [`${fixture.namespaces.tenants}/zzz/*`])] });

			expect(await status("/iam-path/tenants/acme/items/1")).toBe(HttpStatus.OK);
			expect(await status("/iam-path/tenants/other/items/2")).toBe(HttpStatus.OK);

			use({ [fixture.namespaces.tenants]: [statementOf(EApiPolicyEffect.ALLOW, fixture.namespaces.tenants), statementOf(EApiPolicyEffect.DENY, fixture.namespaces.tenants, [`${fixture.namespaces.tenants}/acme/*`])] });

			expect(await status("/iam-path/tenants/acme/items/1")).toBe(HttpStatus.FORBIDDEN);
			expect(await status("/iam-path/tenants/other/items/2")).toBe(HttpStatus.OK);
		});
	});

	describe.runIf(database === "mysql" || database === "mariadb")("a MySQL family server reads a backslash as an escape", () => {
		it.each([
			["a controller under IAM", (): IE2eIamPathApp => ({ ...fixture.app, controllers: fixture.app.controllers.slice(2, 3) })],
			["a controller without authorization", (): IE2eIamPathApp => fixture.plainCountApp],
		])("refuses to start %s while the global sql_mode holds NO_BACKSLASH_ESCAPES", async (_name: string, definition: () => IE2eIamPathApp) => {
			const admin: DataSource = new DataSource({ ...connection([], false), entities: [], synchronize: false } as never);
			await admin.initialize();
			const [{ mode }]: [{ mode: string }] = (await admin.query("SELECT @@GLOBAL.sql_mode AS mode")) as [{ mode: string }];

			try {
				expect(await startupOf(definition())).toBe("started");
				await admin.query(`SET GLOBAL sql_mode = '${[mode, "NO_BACKSLASH_ESCAPES"].filter((part: string): boolean => part.length > 0).join(",")}'`);
				expect(await startupOf(definition())).toMatch(/holds NO_BACKSLASH_ESCAPES/u);
			} finally {
				await admin.query(`SET GLOBAL sql_mode = '${mode}'`);
				await admin.destroy();
			}
		});
	});
});
