import "reflect-metadata";

import type { ArgumentsHost, INestApplication, PipeTransform } from "@nestjs/common";
import type { TestingModuleBuilder } from "@nestjs/testing";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { ValidationError } from "class-validator";
import type { Logger } from "typeorm";

import type { IApiAuthorizationDecision, IApiAuthorizationPrincipal } from "../../src/index";

import { BadRequestException, Catch, HttpStatus, ValidationPipe } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationBootstrapValidationService, ApiAuthorizationModule, ApiAuthorizationRuntime, ApiRequestValidationGetErrors, AuthorizationResolveDefaultPrincipal, EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect } from "../../src/index";
import {
	E2E_PATH_PARAMETER_UUID_COPY_ALLOWED_ID,
	E2E_PATH_PARAMETER_UUID_COPY_DENIED_ID,
	E2E_PATH_PARAMETER_UUID_COPY_DOCUMENTS,
	E2E_PATH_PARAMETER_UUID_COPY_HANDLER_TRACE,
	E2E_PATH_PARAMETER_UUID_COPY_POLICY_TRACE,
	E2ePathParameterUuidCopyBuildSharedController,
	E2ePathParameterUuidCopyBuildUnresolvedController,
	E2ePathParameterUuidCopyController,
	E2ePathParameterUuidCopyGuard,
	E2ePathParameterUuidCopyHooksController,
	E2ePathParameterUuidCopyItemEntity,
	E2ePathParameterUuidCopyItemService,
	E2ePathParameterUuidCopyPolicy,
} from "./path-parameter/uuid-copy";

type TAdapterName = "Express" | "Fastify";
type THostPipe = "none" | "transform";
type TStartup = "checked" | "replaced";

interface IUuidCopyAnswer {
	body: Record<string, unknown>;
	handlerTrace: Array<string>;
	iamCalls: number;
	policyTrace: Array<Record<string, string> | undefined>;
	queries: Array<string>;
	status: number;
}

const COPIES: Array<{ name: string; segment: string }> = [
	{ name: "a copy with method and dtoType", segment: "explicit" },
	{ name: "a copy with shouldAutoResolveContext", segment: "auto" },
];
const MODES: Array<{ mode: EApiAuthorizationMode; segment: string }> = [
	{ mode: EApiAuthorizationMode.IAM, segment: "served" },
	{ mode: EApiAuthorizationMode.HOOKS, segment: "hooks" },
];
const NOT_CANONICAL_BODY: Record<string, unknown> = { errors: [{ path: "id", rule: "pathParameterNotCanonical" }] };

// Counts what reached authorization: the IAM attachment source when startup ran, the runtime double of the test harness when it was replaced.
let iamCalls: number = 0;

class UuidCopyQueryLogger implements Logger {
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

// Answers a path value refusal with the name of each failed rule, as a host with its own error contract does.
@Catch()
class UuidCopyRuleFilter extends BaseExceptionFilter {
	public override catch(exception: unknown, host: ArgumentsHost): void {
		const errors: Array<ValidationError> | undefined = ApiRequestValidationGetErrors(exception);

		super.catch(errors ? new BadRequestException({ errors: errors.flatMap((error: ValidationError): Array<{ path: string; rule: string }> => Object.keys(error.constraints ?? {}).map((rule: string): { path: string; rule: string } => ({ path: error.property, rule }))) }) : exception, host);
	}
}

/**
 * Builds the decision the runtime double of the documented test harness answers with.
 * @returns {IApiAuthorizationDecision<E2ePathParameterUuidCopyItemEntity>} An allow decision.
 */
function harnessDecision(): IApiAuthorizationDecision<E2ePathParameterUuidCopyItemEntity> {
	return {
		action: "test",
		appliedRules: [],
		effect: EApiPolicyEffect.ALLOW,
		mode: EApiAuthorizationMode.IAM,
		permissions: [],
		policyId: "test",
		policyIds: [],
		principal: { attributes: {}, id: "test", roles: [], type: EApiAuthorizationPrincipalType.USER },
		resourceType: "E2ePathParameterUuidCopyItemEntity",
		trace: { decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW, mode: EApiAuthorizationMode.IAM },
		transforms: [],
	};
}

/**
 * Builds an application with the UUID copy controllers, started as an application starts or as the documented test harness starts it.
 * @param {object} options - Application options.
 * @param {TAdapterName} options.adapterName - HTTP adapter.
 * @param {StartedPostgreSqlContainer} [options.container] - PostgreSQL container, or SQLite when absent.
 * @param {Array<new () => unknown>} options.controllers - Controllers to serve.
 * @param {THostPipe} options.hostPipe - Host pipe.
 * @param {UuidCopyQueryLogger} [options.logger] - Query logger.
 * @param {TStartup} options.startup - Whether startup checks run, or the validation service and the runtime are replaced.
 * @returns {Promise<INestApplication>} The application, not yet initialized.
 */
async function buildApplication(options: { adapterName: TAdapterName; container?: StartedPostgreSqlContainer; controllers: Array<new () => unknown>; hostPipe: THostPipe; logger?: UuidCopyQueryLogger; startup: TStartup }): Promise<INestApplication> {
	const entities: Array<new () => unknown> = [E2ePathParameterUuidCopyItemEntity];
	const database: Record<string, unknown> = options.container ? { type: "postgres", url: options.container.getConnectionUri() } : { database: ":memory:", type: "better-sqlite3" };
	let builder: TestingModuleBuilder = Test.createTestingModule({
		controllers: options.controllers,
		imports: [
			TypeOrmModule.forRoot({ ...database, dropSchema: true, entities, logger: options.logger, logging: options.logger ? ["query", "error"] : false, synchronize: true } as never),
			TypeOrmModule.forFeature(entities),
			ApiAuthorizationModule.forRoot({
				iam: {
					attachmentSources: [
						{
							getAttachments: async (principal: IApiAuthorizationPrincipal) => {
								iamCalls += 1;

								return await Promise.resolve({ attachments: [{ policyId: principal.id, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] });
							},
						},
					],
					documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(E2E_PATH_PARAMETER_UUID_COPY_DOCUMENTS.filter((document: Record<string, unknown>): boolean => ids.includes(document.id as string))) }],
				},
				principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
			} as never),
		],
		providers: [E2ePathParameterUuidCopyItemService, E2ePathParameterUuidCopyGuard, E2ePathParameterUuidCopyPolicy],
	});

	if (options.startup === "replaced") {
		builder = builder
			.overrideProvider(ApiAuthorizationBootstrapValidationService)
			.useValue({})
			.overrideProvider(ApiAuthorizationRuntime)
			.useValue({
				evaluate: async (): Promise<IApiAuthorizationDecision<E2ePathParameterUuidCopyItemEntity>> => {
					iamCalls += 1;

					return await Promise.resolve(harnessDecision());
				},
			});
	}

	const app: INestApplication = (await builder.compile()).createNestApplication(options.adapterName === "Express" ? new ExpressAdapter() : new FastifyAdapter(), { logger: false });
	const pipes: Record<THostPipe, Array<PipeTransform>> = { none: [], transform: [new ValidationPipe({ transform: true })] };

	app.useGlobalPipes(...pipes[options.hostPipe]);
	app.useGlobalFilters(new UuidCopyRuleFilter(app.get(HttpAdapterHost).httpAdapter));

	return app;
}

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("a custom route whose PARAMETERS DTO copies a UUID column on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<{ adapterName: TAdapterName; hostPipe: THostPipe; startup: TStartup }>([
		{ adapterName: "Fastify", hostPipe: "none", startup: "checked" },
		{ adapterName: "Fastify", hostPipe: "transform", startup: "checked" },
		{ adapterName: "Fastify", hostPipe: "transform", startup: "replaced" },
		{ adapterName: "Express", hostPipe: "none", startup: "checked" },
		{ adapterName: "Express", hostPipe: "transform", startup: "checked" },
		{ adapterName: "Express", hostPipe: "transform", startup: "replaced" },
	])("through $adapterName, host pipe: $hostPipe, startup checks: $startup", ({ adapterName, hostPipe, startup }: { adapterName: TAdapterName; hostPipe: THostPipe; startup: TStartup }) => {
		const logger: UuidCopyQueryLogger = new UuidCopyQueryLogger();
		let app: INestApplication;
		let base: string;

		/**
		 * Sends a GET and reads the answer.
		 * @param {string} path - Path below the UUID copy controllers.
		 * @returns {Promise<IUuidCopyAnswer>} Status, body, the SQL the request sent, the IAM or runtime calls it made, the path values the HOOKS policy saw, and the path values a handler read.
		 */
		const read = async (path: string): Promise<IUuidCopyAnswer> => {
			const queryCount: number = logger.queries.length;
			const iamCount: number = iamCalls;
			const traceCount: number = E2E_PATH_PARAMETER_UUID_COPY_HANDLER_TRACE.length;
			const policyCount: number = E2E_PATH_PARAMETER_UUID_COPY_POLICY_TRACE.length;
			const response: Response = await fetch(`${base}/path-parameter/uuid-copy/${path}`);
			const body: Record<string, unknown> = (await response.json()) as Record<string, unknown>;

			return { body, handlerTrace: E2E_PATH_PARAMETER_UUID_COPY_HANDLER_TRACE.slice(traceCount), iamCalls: iamCalls - iamCount, policyTrace: E2E_PATH_PARAMETER_UUID_COPY_POLICY_TRACE.slice(policyCount), queries: logger.queries.slice(queryCount), status: response.status };
		};

		beforeAll(async () => {
			app = await buildApplication({ adapterName, container, controllers: [E2ePathParameterUuidCopyController, E2ePathParameterUuidCopyHooksController], hostPipe, logger, startup });
			await app.listen(0, "127.0.0.1");
			base = (await app.getUrl()).replace("[::1]", "127.0.0.1");
		}, 120_000);

		beforeEach(async () => {
			const repository = app.get(E2ePathParameterUuidCopyItemService).repository;

			await repository.clear();
			await repository.save([
				{ id: E2E_PATH_PARAMETER_UUID_COPY_ALLOWED_ID, label: "one" },
				{ id: E2E_PATH_PARAMETER_UUID_COPY_DENIED_ID, label: "denied" },
			]);
		});

		afterAll(async () => {
			await app.close();
		});

		describe.each(MODES)("on a securable $mode custom route", ({ mode, segment: controllerSegment }: { mode: EApiAuthorizationMode; segment: string }) => {
			describe.each(COPIES)("with $name", ({ segment }: { name: string; segment: string }) => {
				it.each([E2E_PATH_PARAMETER_UUID_COPY_DENIED_ID.toUpperCase(), E2E_PATH_PARAMETER_UUID_COPY_ALLOWED_ID.toUpperCase(), `B${E2E_PATH_PARAMETER_UUID_COPY_ALLOWED_ID.slice(1)}`])("refuses %s before authorization, the handler and SQL", async (id: string) => {
					const refused: IUuidCopyAnswer = await read(`${controllerSegment}/${segment}/${id}/policy`);

					expect(refused).toEqual({ body: NOT_CANONICAL_BODY, handlerTrace: [], iamCalls: 0, policyTrace: [], queries: [], status: HttpStatus.BAD_REQUEST });
				});

				it("gives the handler the lower-case UUID authorization checked", async () => {
					const allowed: IUuidCopyAnswer = await read(`${controllerSegment}/${segment}/${E2E_PATH_PARAMETER_UUID_COPY_ALLOWED_ID}/policy`);

					expect(allowed).toMatchObject({ body: { id: E2E_PATH_PARAMETER_UUID_COPY_ALLOWED_ID, label: "one" }, handlerTrace: [E2E_PATH_PARAMETER_UUID_COPY_ALLOWED_ID], status: HttpStatus.OK });

					// The HOOKS policy runs only when the runtime is not replaced; then it reads the value the handler reads.
					if (mode === EApiAuthorizationMode.HOOKS && startup === "checked") {
						expect(allowed.iamCalls).toBe(0);
						expect(allowed.policyTrace).not.toHaveLength(0);
						expect(new Set(allowed.policyTrace.map((parameters: Record<string, string> | undefined): unknown => parameters?.id))).toEqual(new Set(allowed.handlerTrace));
					} else {
						expect(allowed.iamCalls).toBe(1);
						expect(allowed.policyTrace).toEqual([]);
					}
				});

				it.runIf(startup === "checked")("denies the lower-case UUID the policy names", async () => {
					const denied: IUuidCopyAnswer = await read(`${controllerSegment}/${segment}/${E2E_PATH_PARAMETER_UUID_COPY_DENIED_ID}/policy`);

					expect(denied).toMatchObject({ handlerTrace: [], status: HttpStatus.FORBIDDEN });
				});
			});
		});
	});
});

describe("a copy with shouldAutoResolveContext that no custom route gives a context (E2E)", () => {
	it("fails startup, because the path value has no rule to be checked by", async () => {
		const controller: new () => unknown = E2ePathParameterUuidCopyBuildUnresolvedController();
		const app: INestApplication = await buildApplication({ adapterName: "Fastify", controllers: [controller], hostPipe: "none", startup: "checked" });

		await expect(app.init()).rejects.toThrow('Controller "E2ePathParameterUuidCopyUnresolved" method "read" reads its path parameters with the PARAMETERS DTO "UnresolvedDto", whose property "id" copies an entity column with shouldAutoResolveContext and has no route context');
		// The HTTP server never listened, so closing it can only fail; the module is closed by the failed start.
		await app.close().catch((): undefined => undefined);
	});

	it.each<TAdapterName>(["Fastify", "Express"])("answers 500 through %s under the test harness, before authorization and the handler", async (adapterName: TAdapterName) => {
		const app: INestApplication = await buildApplication({ adapterName, controllers: [E2ePathParameterUuidCopyBuildUnresolvedController()], hostPipe: "transform", startup: "replaced" });

		await app.listen(0, "127.0.0.1");

		try {
			const iamCount: number = iamCalls;
			const traceCount: number = E2E_PATH_PARAMETER_UUID_COPY_HANDLER_TRACE.length;
			const response: Response = await fetch(`${(await app.getUrl()).replace("[::1]", "127.0.0.1")}/path-parameter/uuid-copy/unresolved/${E2E_PATH_PARAMETER_UUID_COPY_ALLOWED_ID}/policy`);

			expect(response.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
			expect(iamCalls - iamCount).toBe(0);
			expect(E2E_PATH_PARAMETER_UUID_COPY_HANDLER_TRACE.slice(traceCount)).toEqual([]);
		} finally {
			await app.close();
		}
	});
});

describe("a PARAMETERS DTO with a copy that follows the route context, served by custom routes of two route types (E2E)", () => {
	it("is refused when the second route is declared", () => {
		expect(() => E2ePathParameterUuidCopyBuildSharedController()).toThrow('The PARAMETERS DTO "SharedDto" copies an entity column with shouldAutoResolveContext and is served by custom routes of the route types "get" and "delete"');
	});
});
