import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { StartedTestContainer } from "testcontainers";
import type { Repository } from "typeorm";
import type { IApiAuthorizationPrincipal, IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";
import type { IE2eIamParityCase, IE2eIamParityDefinition, IE2eIamParityFixture, IE2eIamParityItem, IE2eIamParityNote, IE2eIamParityNoteSeed, IE2eIamParityPinnedCase, IE2eIamParityRoute, TE2eIamParityDatabase } from "./iam-parity-property";

import { appendFileSync } from "node:fs";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { GenericContainer, Wait } from "testcontainers";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationSimulator, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiRouteType } from "../../src/index";
import { createE2eIamParityFixture, createE2eIamParityPinnedCase, E2E_IAM_PARITY_NOTES, E2E_IAM_PARITY_OWNERS, E2E_IAM_PARITY_PINNED_CASES, E2E_IAM_PARITY_ROWS, E2E_IAM_PARITY_USER, E2eIamParityGuard, generateE2eIamParityCase } from "./iam-parity-property";

// What one in-memory evaluation of a loaded row answers; "refused" means the grammar refused the document.
type TMemoryAnswer = "allow" | "deny" | "refused";

interface IViewAnswers {
	list: { ids: Array<string>; statusCode: number };
	memoryList: Map<string, TMemoryAnswer>;
	memoryRead: Map<string, TMemoryAnswer>;
	reads: Map<string, number>;
}

/**
 * One way the views disagree. A hard one shows a row that memory denies, or answers an error no view explains; a soft one
 * withholds a row that memory allows, which fails closed and is reported by rule.
 */
interface IDisagreement {
	answers: string;
	isHard: boolean;
	row?: string;
	rule: string;
}

interface IRunStatistics {
	gapRows: number;
	grammarRefused: number;
	listRefused: number;
	partialLists: number;
	policies: number;
	readsAllowed: number;
	readsWithheld: number;
	rowsHidden: number;
	rowsShown: number;
}

// A policy the grammar refuses logs an error per view; the report names what matters. Set the level to read them on a replay.
process.env.NCD_LOG_LEVEL ??= "none";

const readInteger = (name: string, fallback: number): number => {
	const text: string | undefined = process.env[name];

	return text === undefined || text === "" ? fallback : Number.parseInt(text, 10);
};

// A run replays from these: the same seed draws the same policies on every database.
const SEED: number = readInteger("IAM_PARITY_SEED", 20_261_105);
const COUNT: number = readInteger("IAM_PARITY_COUNT", 500);
const ONLY_INDEX: string | undefined = process.env.IAM_PARITY_INDEX;
const ONLY_DATABASES: ReadonlyArray<string> | undefined = process.env.IAM_PARITY_DATABASES?.split(",");
const REPORT_PATH: string | undefined = process.env.IAM_PARITY_REPORT;

const CASE_INDICES: ReadonlyArray<number> = ONLY_INDEX === undefined ? Array.from({ length: COUNT }, (_value: unknown, index: number): number => index) : [Number.parseInt(ONLY_INDEX, 10)];
// Below this many policies a run replays one case, and proves nothing about the generator.
const MIN_COUNT_FOR_COVERAGE: number = 50;
const MS_PER_POLICY: number = 2000;
const BASE_TIMEOUT_MS: number = 60_000;
const PINNED_TIMEOUT_MS: number = 30_000;
const MAX_REPORTED_HARD: number = 5;
const MAX_REPORTED_SOFT_SAMPLES: number = 3;

// A zone with daylight saving: a local hour repeats on 2024-11-03 and is skipped on 2024-03-10.
const TIME_ZONE: string = "America/New_York";
const PAGE: string = "limit=50&page=1";
const MARIADB_PASSWORD: string = "iam-parity";
const MYSQL_PORT: number = 3306;
const REMOTE_ADDRESS: string = "127.0.0.1";
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(E2E_IAM_PARITY_USER);
const ROW_IDS: ReadonlyArray<string> = E2E_IAM_PARITY_ROWS.map((row: IE2eIamParityItem): string => row.id);

const startMariaDb = async (): Promise<StartedTestContainer> =>
	await new GenericContainer("mariadb:11")
		.withEnvironment({ MARIADB_DATABASE: "iam", MARIADB_ROOT_PASSWORD: MARIADB_PASSWORD })
		.withExposedPorts(MYSQL_PORT)
		// The image first runs a temporary server on port 0 to initialize the database.
		.withWaitStrategy(Wait.forLogMessage(/port: 3306\s/u))
		.withStartupTimeout(240_000)
		.start();

/**
 * Compares the answers of the views for one policy.
 * @param {IViewAnswers} answers - What each view answered.
 * @param {boolean} hasRead - Whether the resource path has a read route.
 * @returns {Array<IDisagreement>} Every disagreement.
 */
function compareViews(answers: IViewAnswers, hasRead: boolean): Array<IDisagreement> {
	const disagreements: Array<IDisagreement> = [];
	const { list, memoryList, memoryRead, reads }: IViewAnswers = answers;
	const isRefusedByGrammar: boolean = [...memoryList.values()].includes("refused");

	if (isRefusedByGrammar) {
		if (list.statusCode !== HttpStatus.INTERNAL_SERVER_ERROR) {
			disagreements.push({ answers: `list=${list.statusCode} [${list.ids.join(" ")}] memory=refused`, isHard: true, rule: "the grammar refuses the document in memory but not on a list" });
		}
	} else if (![HttpStatus.FORBIDDEN, HttpStatus.OK].includes(list.statusCode)) {
		disagreements.push({ answers: `list=${list.statusCode}`, isHard: true, rule: "a list answers an error while memory reads the document" });
	}

	const hidden: Array<string> = [];

	for (const id of ROW_IDS) {
		const memory: TMemoryAnswer = memoryList.get(id) ?? "refused";
		const isShown: boolean = list.ids.includes(id);

		if (isShown && memory !== "allow") {
			disagreements.push({ answers: `list=shown memory=${memory}`, isHard: true, row: id, rule: "a list shows a row that memory denies" });
		}

		if (!isShown && memory === "allow") {
			hidden.push(id);
		}
	}

	if (hidden.length > 0 && list.statusCode === HttpStatus.FORBIDDEN) {
		disagreements.push({ answers: `list=403 memory allows [${hidden.join(" ")}]`, isHard: false, rule: "a list refused as a whole while memory allows rows" });
	}

	if (hidden.length > 0 && list.statusCode === HttpStatus.OK) {
		disagreements.push({ answers: `list=200 [${list.ids.join(" ")}] memory also allows [${hidden.join(" ")}]`, isHard: false, row: hidden[0], rule: "a list omits a row that memory allows" });
	}

	if (!hasRead) {
		return disagreements;
	}

	for (const id of ROW_IDS) {
		const memory: TMemoryAnswer = memoryRead.get(id) ?? "refused";
		const statusCode: number = reads.get(id) ?? 0;

		if (statusCode === HttpStatus.OK && memory !== "allow") {
			disagreements.push({ answers: `read=200 memory=${memory}`, isHard: true, row: id, rule: "a read returns a row that memory denies" });
		}

		if (memory === "refused" ? statusCode !== HttpStatus.INTERNAL_SERVER_ERROR : ![HttpStatus.FORBIDDEN, HttpStatus.NOT_FOUND, HttpStatus.OK].includes(statusCode)) {
			disagreements.push({ answers: `read=${statusCode} memory=${memory}`, isHard: true, row: id, rule: "a read answers an error that memory does not explain" });
		}

		if (memory === "allow" && statusCode !== HttpStatus.OK) {
			disagreements.push({ answers: `read=${statusCode} memory=allow`, isHard: false, row: id, rule: "a read withholds a row that memory allows" });
		}
	}

	return disagreements;
}

/**
 * Lists the policies one edit smaller: a statement less, a key less, or a pattern less.
 * @param {ReadonlyArray<IApiPolicyStatement>} statements - Policy.
 * @returns {Array<Array<IApiPolicyStatement>>} The smaller policies.
 */
function listSmallerPolicies(statements: ReadonlyArray<IApiPolicyStatement>): Array<Array<IApiPolicyStatement>> {
	const smaller: Array<Array<IApiPolicyStatement>> = [];
	const replaced = (index: number, statement: IApiPolicyStatement): Array<IApiPolicyStatement> => statements.map((current: IApiPolicyStatement, position: number): IApiPolicyStatement => (position === index ? statement : current));

	for (const [index, statement] of statements.entries()) {
		smaller.push(statements.filter((_statement: IApiPolicyStatement, position: number): boolean => position !== index));

		for (const [operator, keys] of Object.entries(statement.Condition ?? {})) {
			for (const key of Object.keys(keys)) {
				const condition: Record<string, Record<string, unknown>> = JSON.parse(JSON.stringify(statement.Condition)) as Record<string, Record<string, unknown>>;

				delete condition[operator]?.[key];

				if (Object.keys(condition[operator] ?? {}).length === 0) {
					delete condition[operator];
				}

				const { Condition: _removed, ...withoutCondition }: IApiPolicyStatement = statement;

				smaller.push(replaced(index, Object.keys(condition).length > 0 ? { ...statement, Condition: condition } : withoutCondition));
			}
		}

		for (const field of ["Action", "NotAction", "Resource", "NotResource"] as const) {
			for (const pattern of statement[field]?.length && statement[field].length > 1 ? statement[field] : []) {
				smaller.push(replaced(index, { ...statement, [field]: statement[field]?.filter((candidate: string): boolean => candidate !== pattern) }));
			}
		}
	}

	return smaller.filter((policy: Array<IApiPolicyStatement>): boolean => policy.length > 0);
}

describe.each<{ database: TE2eIamParityDatabase; databaseName: string }>(
	(
		[
			{ database: "sqlite", databaseName: "SQLite" },
			{ database: "postgres", databaseName: "PostgreSQL 17" },
			{ database: "mysql", databaseName: "MySQL 8.4" },
			{ database: "mariadb", databaseName: "MariaDB 11" },
		] as Array<{ database: TE2eIamParityDatabase; databaseName: string }>
	).filter(({ database }: { database: TE2eIamParityDatabase }): boolean => ONLY_DATABASES?.includes(database) ?? true),
)("IAM random policies give one answer on a list, a loaded row and a read on $databaseName (E2E)", ({ database }: { database: TE2eIamParityDatabase; databaseName: string }) => {
	const previousTimeZone: string | undefined = process.env.TZ;
	let app: INestApplication | undefined;
	let fastify: { inject: (options: { method: string; remoteAddress?: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let fixture: IE2eIamParityFixture;
	let loadedRows: ReadonlyArray<IE2eIamParityItem> = [];
	let mariaDbContainer: StartedTestContainer | undefined;
	let mysqlContainer: StartedMySqlContainer | undefined;
	let namespace: string = "";
	let postgresContainer: StartedPostgreSqlContainer | undefined;
	let simulator: ApiAuthorizationSimulator;
	let statements: ReadonlyArray<IApiPolicyStatement> = [];

	const repository = (): Repository<IE2eIamParityItem> => (app!.get(fixture.service) as { repository: Repository<IE2eIamParityItem> }).repository;

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

	const routeOf = (definition: IE2eIamParityDefinition): IE2eIamParityRoute => fixture.routes.find((route: IE2eIamParityRoute): boolean => route.definition.name === definition.name) as IE2eIamParityRoute;

	const remember = async (route: IE2eIamParityRoute, routeType: EApiRouteType, row: IE2eIamParityItem): Promise<TMemoryAnswer> => {
		const parameters: Record<string, unknown> = routeType === EApiRouteType.GET ? { id: row.id } : {};

		try {
			const decision = await simulator.evaluate({ action: routeType, authorization: route.authorization as never, entity: fixture.item as never, principal: PRINCIPAL, requestMetadata: { ip: REMOTE_ADDRESS, parameters } as never, resource: row as never, routeType });

			return decision.effect === EApiPolicyEffect.ALLOW ? "allow" : "deny";
		} catch {
			return "refused";
		}
	};

	const readViews = async (definition: IE2eIamParityDefinition, policy: ReadonlyArray<IApiPolicyStatement>): Promise<IViewAnswers> => {
		const route: IE2eIamParityRoute = routeOf(definition);

		namespace = (route.authorization as { policyNamespace: string }).policyNamespace;
		statements = policy;

		const listResponse = await fastify.inject({ method: "GET", remoteAddress: REMOTE_ADDRESS, url: `${route.url}?${PAGE}` });
		const list: { ids: Array<string>; statusCode: number } = { ids: listResponse.statusCode === HttpStatus.OK ? (listResponse.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }): string => item.id) : [], statusCode: listResponse.statusCode };
		const memoryList: Map<string, TMemoryAnswer> = new Map<string, TMemoryAnswer>();
		const memoryRead: Map<string, TMemoryAnswer> = new Map<string, TMemoryAnswer>();
		const reads: Map<string, number> = new Map<string, number>();

		for (const row of loadedRows) {
			memoryList.set(row.id, await remember(route, EApiRouteType.GET_LIST, row));

			if (definition.hasRead) {
				memoryRead.set(row.id, await remember(route, EApiRouteType.GET, row));

				const response = await fastify.inject({ method: "GET", remoteAddress: REMOTE_ADDRESS, url: `${route.url}/${encodeURIComponent(row.id)}` });

				reads.set(row.id, response.statusCode);
			}
		}

		return { list, memoryList, memoryRead, reads };
	};

	// Takes edits away from a policy for as long as the same rule still breaks on the same row.
	const reduce = async (testCase: IE2eIamParityCase, disagreement: IDisagreement): Promise<ReadonlyArray<IApiPolicyStatement>> => {
		let current: ReadonlyArray<IApiPolicyStatement> = testCase.statements;
		let isReduced: boolean = true;

		while (isReduced) {
			isReduced = false;

			for (const candidate of listSmallerPolicies(current)) {
				const found: Array<IDisagreement> = compareViews(await readViews(testCase.definition, candidate), testCase.definition.hasRead);

				if (found.some((other: IDisagreement): boolean => other.rule === disagreement.rule && other.row === disagreement.row)) {
					current = candidate;
					isReduced = true;

					break;
				}
			}
		}

		return current;
	};

	const writeDisagreement = async (testCase: IE2eIamParityCase, disagreement: IDisagreement): Promise<string> => {
		const row: IE2eIamParityItem | undefined = loadedRows.find((candidate: IE2eIamParityItem): boolean => candidate.id === disagreement.row);
		const replay: string = `IAM_PARITY_SEED=${testCase.seed} IAM_PARITY_INDEX=${testCase.index} IAM_PARITY_DATABASES=${database}`;
		const lines: Array<string> = [`[${disagreement.isHard ? "hard" : "soft"}] ${disagreement.rule} on ${database}`, `  replay: ${replay}`, `  resource path: ${testCase.definition.path}`, `  answers: ${disagreement.answers}`, `  row: ${JSON.stringify(row)}`, `  policy: ${JSON.stringify(testCase.statements)}`];

		// A hard disagreement is worth the requests it takes to reduce.
		if (disagreement.isHard) {
			lines.push(`  reduced: ${JSON.stringify(await reduce(testCase, disagreement))}`);
		}

		return lines.join("\n");
	};

	beforeAll(async () => {
		process.env.TZ = TIME_ZONE;

		if (database === "postgres") {
			postgresContainer = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		if (database === "mysql") {
			mysqlContainer = await new MySqlContainer("mysql:8.4").start();
		}

		if (database === "mariadb") {
			mariaDbContainer = await startMariaDb();
		}

		fixture = createE2eIamParityFixture(database);

		const entities: Array<new () => unknown> = [fixture.owner, fixture.item, fixture.note];
		const moduleReference = await Test.createTestingModule({
			controllers: fixture.routes.map((route: IE2eIamParityRoute): new () => unknown => route.controller),
			imports: [
				TypeOrmModule.forRoot(connection(entities)),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "parity-policy", principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("parity-policy") ? [{ document: { Statement: statements as Array<IApiPolicyStatement>, Version: "2012-10-17" }, id: "parity-policy", namespace, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [fixture.service, E2eIamParityGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		simulator = app.get(ApiAuthorizationSimulator);

		await repository()
			.manager.getRepository(fixture.owner)
			.save(E2E_IAM_PARITY_OWNERS as never);
		await repository().save(E2E_IAM_PARITY_ROWS as never);

		const notes: Repository<IE2eIamParityNote> = repository().manager.getRepository(fixture.note);

		await notes.save(E2E_IAM_PARITY_NOTES.map(({ isDeleted: _isDeleted, itemId, ...note }: IE2eIamParityNoteSeed) => ({ ...note, item: { id: itemId } })) as never);
		await notes.softDelete(E2E_IAM_PARITY_NOTES.filter((note: IE2eIamParityNoteSeed): boolean => note.isDeleted).map((note: IE2eIamParityNoteSeed): string => note.id));
		// Memory reads each row with its whole relations, as TypeORM loads them: a soft-deleted related row is not loaded.
		loadedRows = await repository().find({ relations: { notes: true, owner: true } as never });
		expect(loadedRows.flatMap((row: IE2eIamParityItem): Array<string> => (row.notes ?? []).map((note: IE2eIamParityNote): string => note.id)).sort()).toEqual(
			E2E_IAM_PARITY_NOTES.filter((note: IE2eIamParityNoteSeed): boolean => !note.isDeleted)
				.map((note: IE2eIamParityNoteSeed): string => note.id)
				.sort(),
		);
		expect(loadedRows.map((row: IE2eIamParityItem): string => row.id).sort()).toEqual([...ROW_IDS].sort());
	}, 300_000);

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

	it.each(E2E_IAM_PARITY_PINNED_CASES.map((pinned: IE2eIamParityPinnedCase): [string, IE2eIamParityPinnedCase] => [pinned.name, pinned]))(
		"never shows a row that memory denies, nor answers an error, for %s",
		async (_name: string, pinned: IE2eIamParityPinnedCase) => {
			const testCase: IE2eIamParityCase = createE2eIamParityPinnedCase(pinned, database);
			const found: Array<IDisagreement> = compareViews(await readViews(testCase.definition, testCase.statements), testCase.definition.hasRead);

			expect(found.filter((disagreement: IDisagreement): boolean => disagreement.isHard)).toEqual([]);
		},
		PINNED_TIMEOUT_MS,
	);

	it(
		`never shows a row that memory denies, over ${CASE_INDICES.length} policies of seed ${SEED}`,
		async () => {
			const statistics: IRunStatistics = { gapRows: 0, grammarRefused: 0, listRefused: 0, partialLists: 0, policies: 0, readsAllowed: 0, readsWithheld: 0, rowsHidden: 0, rowsShown: 0 };
			const hard: Array<{ disagreement: IDisagreement; testCase: IE2eIamParityCase }> = [];
			const soft: Map<string, Array<{ disagreement: IDisagreement; testCase: IE2eIamParityCase }>> = new Map<string, Array<{ disagreement: IDisagreement; testCase: IE2eIamParityCase }>>();

			for (const index of CASE_INDICES) {
				const testCase: IE2eIamParityCase = generateE2eIamParityCase(SEED, index, database);
				const answers: IViewAnswers = await readViews(testCase.definition, testCase.statements);
				const disagreements: Array<IDisagreement> = compareViews(answers, testCase.definition.hasRead);

				statistics.policies++;
				statistics.grammarRefused += answers.list.statusCode === HttpStatus.INTERNAL_SERVER_ERROR ? 1 : 0;
				statistics.listRefused += answers.list.statusCode === HttpStatus.FORBIDDEN ? 1 : 0;
				statistics.rowsShown += answers.list.ids.length;
				statistics.rowsHidden += answers.list.statusCode === HttpStatus.OK ? ROW_IDS.length - answers.list.ids.length : 0;
				statistics.partialLists += answers.list.ids.length > 0 && answers.list.ids.length < ROW_IDS.length ? 1 : 0;
				statistics.readsAllowed += [...answers.reads.values()].filter((statusCode: number): boolean => statusCode === HttpStatus.OK).length;
				statistics.readsWithheld += [...answers.reads.values()].filter((statusCode: number): boolean => statusCode === HttpStatus.FORBIDDEN || statusCode === HttpStatus.NOT_FOUND).length;

				for (const disagreement of disagreements) {
					if (disagreement.isHard) {
						hard.push({ disagreement, testCase });
					} else {
						soft.set(disagreement.rule, [...(soft.get(disagreement.rule) ?? []), { disagreement, testCase }]);
					}

					if (REPORT_PATH !== undefined) {
						appendFileSync(REPORT_PATH, `${JSON.stringify({ answers: disagreement.answers, database, definition: testCase.definition.name, index, isHard: disagreement.isHard, row: disagreement.row, rule: disagreement.rule, seed: SEED, statements: testCase.statements })}\n`);
					}
				}

				statistics.gapRows += disagreements.filter((disagreement: IDisagreement): boolean => !disagreement.isHard).length;
			}

			const softLines: Array<string> = [];

			for (const [rule, found] of soft) {
				softLines.push(`${rule}: ${found.length}`);

				for (const { disagreement, testCase } of found.slice(0, MAX_REPORTED_SOFT_SAMPLES)) {
					softLines.push(await writeDisagreement(testCase, disagreement));
				}
			}

			process.stdout.write(`\nIAM parity on ${database}, seed ${SEED}: ${JSON.stringify(statistics)}; ${hard.length} hard\n${softLines.join("\n")}\n`);

			const hardLines: Array<string> = [];

			for (const { disagreement, testCase } of hard.slice(0, MAX_REPORTED_HARD)) {
				hardLines.push(await writeDisagreement(testCase, disagreement));
			}

			expect(hardLines.length === 0 ? `${hard.length} hard` : `${hard.length} hard\n${hardLines.join("\n")}`).toBe("0 hard");

			if (CASE_INDICES.length >= MIN_COUNT_FOR_COVERAGE) {
				// A run must reach every outcome, or it proves nothing about the views.
				expect(statistics.rowsShown).toBeGreaterThan(0);
				expect(statistics.rowsHidden).toBeGreaterThan(0);
				expect(statistics.partialLists).toBeGreaterThan(0);
				expect(statistics.listRefused).toBeGreaterThan(0);
				expect(statistics.readsAllowed).toBeGreaterThan(0);
				expect(statistics.readsWithheld).toBeGreaterThan(0);
			}
		},
		BASE_TIMEOUT_MS + MS_PER_POLICY * CASE_INDICES.length,
	);
});
