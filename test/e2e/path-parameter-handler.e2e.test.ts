import "reflect-metadata";

import type { INestApplication, PipeTransform } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger } from "typeorm";

import type { IApiAuthorizationPrincipal } from "../../src/index";
import type { IE2ePathParameterHandlerRefusedCase } from "./path-parameter/handler";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, AuthorizationResolveDefaultPrincipal, EApiAuthorizationMode, EApiAuthorizationPrincipalType } from "../../src/index";
import {
	E2E_PATH_PARAMETER_HANDLER_ALLOWED_CODE,
	E2E_PATH_PARAMETER_HANDLER_ALLOWED_ID,
	E2E_PATH_PARAMETER_HANDLER_DENIED_CODE,
	E2E_PATH_PARAMETER_HANDLER_DENIED_ID,
	E2E_PATH_PARAMETER_HANDLER_DOCUMENTS,
	E2E_PATH_PARAMETER_HANDLER_POLICY_TRACE,
	E2E_PATH_PARAMETER_HANDLER_REFUSED,
	E2ePathParameterHandlerGuard,
	E2ePathParameterHandlerHooksController,
	E2ePathParameterHandlerIamController,
	E2ePathParameterHandlerItemEntity,
	E2ePathParameterHandlerItemService,
	E2ePathParameterHandlerPolicy,
} from "./path-parameter/handler";

type TAdapterName = "Express" | "Fastify";
type THostPipe = "none" | "transform" | "validate";

// Spellings a database reads as the denied row 16, while a policy compares their text.
const DENIED_ID_ALIASES: Array<string> = ["016", "0x10", "1e1", "16.0", "%2016"];
const MODES: Array<{ mode: EApiAuthorizationMode; segment: string }> = [
	{ mode: EApiAuthorizationMode.IAM, segment: "iam" },
	{ mode: EApiAuthorizationMode.HOOKS, segment: "hooks" },
];

class HandlerQueryLogger implements Logger {
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

/**
 * Builds an application with the handler controllers.
 * @param {object} options - Application options.
 * @param {TAdapterName} options.adapterName - HTTP adapter.
 * @param {Array<new () => unknown>} options.controllers - Controllers to serve.
 * @param {StartedPostgreSqlContainer} [options.container] - PostgreSQL container, or SQLite when absent.
 * @param {THostPipe} options.hostPipe - Host pipe.
 * @param {HandlerQueryLogger} [options.logger] - Query logger.
 * @returns {Promise<INestApplication>} The application, not yet initialized.
 */
async function buildApplication(options: { adapterName: TAdapterName; container?: StartedPostgreSqlContainer; controllers: Array<new () => unknown>; hostPipe: THostPipe; logger?: HandlerQueryLogger }): Promise<INestApplication> {
	const entities: Array<new () => unknown> = [E2ePathParameterHandlerItemEntity];
	const database: Record<string, unknown> = options.container ? { type: "postgres", url: options.container.getConnectionUri() } : { database: ":memory:", type: "better-sqlite3" };
	const moduleReference = await Test.createTestingModule({
		controllers: options.controllers,
		imports: [
			TypeOrmModule.forRoot({ ...database, dropSchema: true, entities, logger: options.logger, logging: options.logger ? ["query", "error"] : false, synchronize: true } as never),
			TypeOrmModule.forFeature(entities),
			ApiAuthorizationModule.forRoot({
				iam: {
					attachmentSources: [{ getAttachments: async (principal: IApiAuthorizationPrincipal) => await Promise.resolve({ attachments: [{ policyId: principal.id, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
					documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(E2E_PATH_PARAMETER_HANDLER_DOCUMENTS.filter((document: Record<string, unknown>): boolean => ids.includes(document.id as string))) }],
				},
				principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
			} as never),
		],
		providers: [E2ePathParameterHandlerItemService, E2ePathParameterHandlerGuard, E2ePathParameterHandlerPolicy],
	}).compile();
	const app: INestApplication = moduleReference.createNestApplication(options.adapterName === "Express" ? new ExpressAdapter() : new FastifyAdapter(), { logger: false });
	const pipes: Record<THostPipe, Array<PipeTransform>> = { none: [], transform: [new ValidationPipe({ transform: true })], validate: [new ValidationPipe()] };

	app.useGlobalPipes(...pipes[options.hostPipe]);

	return app;
}

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("a handler reads the path value authorization saw on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<{ adapterName: TAdapterName; hostPipe: THostPipe }>([
		{ adapterName: "Fastify", hostPipe: "none" },
		{ adapterName: "Fastify", hostPipe: "validate" },
		{ adapterName: "Fastify", hostPipe: "transform" },
		{ adapterName: "Express", hostPipe: "none" },
		{ adapterName: "Express", hostPipe: "validate" },
		{ adapterName: "Express", hostPipe: "transform" },
	])("through $adapterName, host pipe: $hostPipe", ({ adapterName, hostPipe }: { adapterName: TAdapterName; hostPipe: THostPipe }) => {
		const logger: HandlerQueryLogger = new HandlerQueryLogger();
		let app: INestApplication;
		let base: string;

		/**
		 * Sends a GET and reads the answer.
		 * @param {string} path - Path below the handler routes.
		 * @returns {Promise<{ body: Record<string, unknown>; queries: Array<string>; status: number; trace: Array<Record<string, string> | undefined> }>} Status, body, the SQL the request sent, and the path values each HOOKS policy call saw.
		 */
		const read = async (path: string): Promise<{ body: Record<string, unknown>; queries: Array<string>; status: number; trace: Array<Record<string, string> | undefined> }> => {
			const queryCount: number = logger.queries.length;
			const traceCount: number = E2E_PATH_PARAMETER_HANDLER_POLICY_TRACE.length;
			const response: Response = await fetch(`${base}/path-parameter/handler/${path}`);
			const body: Record<string, unknown> = (await response.json()) as Record<string, unknown>;

			return { body, queries: logger.queries.slice(queryCount), status: response.status, trace: E2E_PATH_PARAMETER_HANDLER_POLICY_TRACE.slice(traceCount) };
		};

		beforeAll(async () => {
			app = await buildApplication({ adapterName, container, controllers: [E2ePathParameterHandlerIamController, E2ePathParameterHandlerHooksController], hostPipe, logger });
			await app.listen(0, "127.0.0.1");
			base = (await app.getUrl()).replace("[::1]", "127.0.0.1");
		}, 120_000);

		beforeEach(async () => {
			const repository = app.get(E2ePathParameterHandlerItemService).repository;

			await repository.clear();
			await repository.save([
				{ code: E2E_PATH_PARAMETER_HANDLER_ALLOWED_CODE, id: E2E_PATH_PARAMETER_HANDLER_ALLOWED_ID, label: "one" },
				{ code: E2E_PATH_PARAMETER_HANDLER_DENIED_CODE, id: E2E_PATH_PARAMETER_HANDLER_DENIED_ID, label: "sixteen" },
			]);
		});

		afterAll(async () => {
			await app.close();
		});

		describe.each(MODES)("on a securable $mode custom route", ({ mode, segment }: { mode: EApiAuthorizationMode; segment: string }) => {
			it("denies the row the policy names and gives the handler the text it checked", async () => {
				const denied = await read(`${segment}/${String(E2E_PATH_PARAMETER_HANDLER_DENIED_ID)}`);
				const allowed = await read(`${segment}/${String(E2E_PATH_PARAMETER_HANDLER_ALLOWED_ID)}`);

				expect(denied.status).toBe(HttpStatus.FORBIDDEN);
				expect(allowed.status).toBe(HttpStatus.OK);
				expect(allowed.body).toEqual({ id: "1", label: "one", type: "string" });

				if (mode === EApiAuthorizationMode.HOOKS) {
					expect(denied.trace).not.toHaveLength(0);
					expect(allowed.trace).not.toHaveLength(0);
					expect(new Set(denied.trace.map((parameters: Record<string, string> | undefined): unknown => parameters?.id))).toEqual(new Set(["16"]));
					expect(new Set(allowed.trace.map((parameters: Record<string, string> | undefined): unknown => parameters?.id))).toEqual(new Set(["1"]));
				}
			});

			it.each(DENIED_ID_ALIASES)("refuses %s, a spelling of the denied row, before the policy and without SQL", async (alias: string) => {
				const refused = await read(`${segment}/${alias}`);

				expect(refused.status).toBe(HttpStatus.BAD_REQUEST);
				expect(refused.queries).toEqual([]);
				expect(refused.trace).toEqual([]);
			});

			it("refuses an upper-case UUID before the policy and without SQL, and denies the lower-case one", async () => {
				const denied = await read(`${segment}/code/${E2E_PATH_PARAMETER_HANDLER_DENIED_CODE}`);
				const allowed = await read(`${segment}/code/${E2E_PATH_PARAMETER_HANDLER_ALLOWED_CODE}`);

				for (const code of [E2E_PATH_PARAMETER_HANDLER_DENIED_CODE.toUpperCase(), E2E_PATH_PARAMETER_HANDLER_ALLOWED_CODE.toUpperCase(), "not-a-uuid"]) {
					const refused = await read(`${segment}/code/${code}`);

					expect(refused.status).toBe(HttpStatus.BAD_REQUEST);
					expect(refused.queries).toEqual([]);
					expect(refused.trace).toEqual([]);
				}

				expect(allowed).toMatchObject({ body: { code: E2E_PATH_PARAMETER_HANDLER_ALLOWED_CODE, label: "one" }, status: HttpStatus.OK });

				if (mode === EApiAuthorizationMode.HOOKS) {
					expect(denied.status).toBe(HttpStatus.FORBIDDEN);
				}
			});

			it("gives a @Param() typed as the PARAMETERS DTO the value it checked", async () => {
				const allowed = await read(`${segment}/whole/${String(E2E_PATH_PARAMETER_HANDLER_ALLOWED_ID)}`);
				const refused = await read(`${segment}/whole/016`);

				expect(allowed.status).toBe(HttpStatus.OK);
				expect(allowed.body).toEqual(hostPipe === "transform" ? { id: 1, type: "number" } : { id: "1", type: "string" });
				expect(refused.status).toBe(HttpStatus.BAD_REQUEST);
			});
		});
	});
});

describe.each(MODES)("a securable $mode route that could give a handler or a policy another path value (E2E)", ({ mode }: { mode: EApiAuthorizationMode; segment: string }) => {
	it.each(E2E_PATH_PARAMETER_HANDLER_REFUSED)("does not start with $name", async (refusedCase: IE2ePathParameterHandlerRefusedCase) => {
		const controller: new () => unknown = refusedCase.build(mode);
		const app: INestApplication = await buildApplication({ adapterName: "Fastify", controllers: [controller], hostPipe: "none" });

		await expect(app.init()).rejects.toThrow(`Controller "${controller.name}" ${refusedCase.message}`);
		// The HTTP server never listened, so closing it can only fail; the module is closed by the failed start.
		await app.close().catch((): undefined => undefined);
	});
});
