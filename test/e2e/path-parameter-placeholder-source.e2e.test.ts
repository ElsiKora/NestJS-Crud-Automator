import "reflect-metadata";

import type { ArgumentsHost, INestApplication, PipeTransform } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { ValidationError } from "class-validator";
import type { Logger } from "typeorm";

import type { IApiAuthorizationPrincipal } from "../../src/index";

import { BadRequestException, Catch, HttpStatus, ValidationPipe } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiRequestValidationGetErrors, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType } from "../../src/index";
import {
	E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_ALLOWED_UUID,
	E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_DENIED_UUID,
	E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_DOCUMENTS,
	E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_HANDLER_TRACE,
	E2ePathParameterPlaceholderSourceBuildDateController,
	E2ePathParameterPlaceholderSourceGuard,
	E2ePathParameterPlaceholderSourceIntegerController,
	E2ePathParameterPlaceholderSourceItemEntity,
	E2ePathParameterPlaceholderSourceItemService,
	E2ePathParameterPlaceholderSourceStringController,
	E2ePathParameterPlaceholderSourceUuidController,
} from "./path-parameter/placeholder-source";

type TAdapterName = "Express" | "Fastify";
type THostPipe = "none" | "transform";

interface IPlaceholderSourceAnswer {
	body: Record<string, unknown>;
	handlerTrace: Array<string>;
	iamCalls: number;
	queries: Array<string>;
	status: number;
}

// Counts the requests that reached IAM, through its attachment source.
let iamCalls: number = 0;

class PlaceholderSourceQueryLogger implements Logger {
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
class PlaceholderSourceRuleFilter extends BaseExceptionFilter {
	public override catch(exception: unknown, host: ArgumentsHost): void {
		const errors: Array<ValidationError> | undefined = ApiRequestValidationGetErrors(exception);

		super.catch(errors ? new BadRequestException({ errors: errors.flatMap((error: ValidationError): Array<{ path: string; rule: string }> => Object.keys(error.constraints ?? {}).map((rule: string): { path: string; rule: string } => ({ path: error.property, rule }))) }) : exception, host);
	}
}

/**
 * Builds an application with the placeholder source controllers.
 * @param {object} options - Application options.
 * @param {TAdapterName} options.adapterName - HTTP adapter.
 * @param {StartedPostgreSqlContainer} [options.container] - PostgreSQL container, or SQLite when absent.
 * @param {Array<new () => unknown>} options.controllers - Controllers to serve.
 * @param {THostPipe} options.hostPipe - Host pipe.
 * @param {PlaceholderSourceQueryLogger} [options.logger] - Query logger.
 * @returns {Promise<INestApplication>} The application, not yet initialized.
 */
async function buildApplication(options: { adapterName: TAdapterName; container?: StartedPostgreSqlContainer; controllers: Array<new () => unknown>; hostPipe: THostPipe; logger?: PlaceholderSourceQueryLogger }): Promise<INestApplication> {
	const entities: Array<new () => unknown> = [E2ePathParameterPlaceholderSourceItemEntity];
	const database: Record<string, unknown> = options.container ? { type: "postgres", url: options.container.getConnectionUri() } : { database: ":memory:", type: "better-sqlite3" };
	const module = await Test.createTestingModule({
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
					documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_DOCUMENTS.filter((document: Record<string, unknown>): boolean => ids.includes(document.id as string))) }],
				},
				principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
			} as never),
		],
		providers: [E2ePathParameterPlaceholderSourceItemService, E2ePathParameterPlaceholderSourceGuard],
	}).compile();
	const app: INestApplication = module.createNestApplication(options.adapterName === "Express" ? new ExpressAdapter() : new FastifyAdapter(), { logger: false });
	const pipes: Record<THostPipe, Array<PipeTransform>> = { none: [], transform: [new ValidationPipe({ transform: true })] };

	app.useGlobalPipes(...pipes[options.hostPipe]);
	app.useGlobalFilters(new PlaceholderSourceRuleFilter(app.get(HttpAdapterHost).httpAdapter));

	return app;
}

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("an IAM resource path placeholder described without a column copy on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
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
		{ adapterName: "Fastify", hostPipe: "transform" },
		{ adapterName: "Express", hostPipe: "none" },
		{ adapterName: "Express", hostPipe: "transform" },
	])("through $adapterName, host pipe: $hostPipe", ({ adapterName, hostPipe }: { adapterName: TAdapterName; hostPipe: THostPipe }) => {
		const logger: PlaceholderSourceQueryLogger = new PlaceholderSourceQueryLogger();
		let app: INestApplication;
		let base: string;

		/**
		 * Sends a GET and reads the answer.
		 * @param {string} path - Path below the placeholder source controllers.
		 * @returns {Promise<IPlaceholderSourceAnswer>} Status, body, the SQL the request sent, the IAM calls it made, and the path values a handler read.
		 */
		const read = async (path: string): Promise<IPlaceholderSourceAnswer> => {
			const queryCount: number = logger.queries.length;
			const iamCount: number = iamCalls;
			const traceCount: number = E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_HANDLER_TRACE.length;
			const response: Response = await fetch(`${base}/path-parameter/placeholder-source/${path}/policy`);
			const body: Record<string, unknown> = (await response.json()) as Record<string, unknown>;

			return { body, handlerTrace: E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_HANDLER_TRACE.slice(traceCount), iamCalls: iamCalls - iamCount, queries: logger.queries.slice(queryCount), status: response.status };
		};

		/**
		 * Expects a path value to be refused before IAM, the handler and SQL.
		 * @param {string} path - Path below the placeholder source controllers.
		 * @param {string} rule - A rule the refusal names.
		 * @returns {Promise<void>}
		 */
		const expectRefused = async (path: string, rule: string): Promise<void> => {
			const refused: IPlaceholderSourceAnswer = await read(path);

			expect(refused).toMatchObject({ handlerTrace: [], iamCalls: 0, queries: [], status: HttpStatus.BAD_REQUEST });
			expect(refused.body.errors).toContainEqual({ path: "id", rule });
		};

		beforeAll(async () => {
			app = await buildApplication({ adapterName, container, controllers: [E2ePathParameterPlaceholderSourceUuidController, E2ePathParameterPlaceholderSourceIntegerController, E2ePathParameterPlaceholderSourceStringController], hostPipe, logger });
			await app.listen(0, "127.0.0.1");
			base = (await app.getUrl()).replace("[::1]", "127.0.0.1");
		}, 120_000);

		afterAll(async () => {
			await app.close();
		});

		describe("described by ApiPropertyUUID", () => {
			it("lets the policy allow the lower-case UUID and gives the handler that text", async () => {
				const allowed: IPlaceholderSourceAnswer = await read(`pps-uuid/${E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_ALLOWED_UUID}`);

				expect(allowed).toMatchObject({ body: { id: E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_ALLOWED_UUID }, handlerTrace: [E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_ALLOWED_UUID], iamCalls: 1, status: HttpStatus.OK });
				expect(allowed.queries).not.toHaveLength(0);
			});

			it("lets the policy deny the lower-case UUID it names", async () => {
				expect(await read(`pps-uuid/${E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_DENIED_UUID}`)).toMatchObject({ handlerTrace: [], iamCalls: 1, queries: [], status: HttpStatus.FORBIDDEN });
			});

			it.each([E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_DENIED_UUID.toUpperCase(), E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_ALLOWED_UUID.toUpperCase(), `B${E2E_PATH_PARAMETER_PLACEHOLDER_SOURCE_ALLOWED_UUID.slice(1)}`])("refuses %s as not canonical before IAM, the handler and SQL", async (id: string) => {
				const refused: IPlaceholderSourceAnswer = await read(`pps-uuid/${id}`);

				expect(refused).toEqual({ body: { errors: [{ path: "id", rule: "pathParameterNotCanonical" }] }, handlerTrace: [], iamCalls: 0, queries: [], status: HttpStatus.BAD_REQUEST });
			});
		});

		describe("described by an integer ApiPropertyNumber", () => {
			it("lets the policy allow and deny the canonical integer", async () => {
				expect(await read("pps-int/1")).toMatchObject({ handlerTrace: ["1"], iamCalls: 1, status: HttpStatus.OK });
				expect(await read("pps-int/16")).toMatchObject({ handlerTrace: [], iamCalls: 1, queries: [], status: HttpStatus.FORBIDDEN });
			});

			it.each(["016", "+16", "1.6e1", "0x10"])("refuses %s, which names the denied key in another spelling, before IAM, the handler and SQL", async (id: string) => {
				await expectRefused(`pps-int/${id}`, "isInt");
			});
		});

		describe("described by ApiPropertyString", () => {
			it("lets the policy allow and deny the text as sent", async () => {
				expect(await read("pps-string/General")).toMatchObject({ body: { id: "General" }, handlerTrace: ["General"], iamCalls: 1, status: HttpStatus.OK });
				expect(await read("pps-string/Denied")).toMatchObject({ handlerTrace: [], iamCalls: 1, queries: [], status: HttpStatus.FORBIDDEN });
			});

			it("refuses a text its pattern does not match before IAM, the handler and SQL", async () => {
				await expectRefused("pps-string/General1", "matches");
			});
		});
	});
});

describe("an IAM resource path placeholder described by ApiPropertyDate (E2E)", () => {
	it("fails startup, naming both sources a placeholder accepts", async () => {
		const app: INestApplication = await buildApplication({ adapterName: "Fastify", controllers: [E2ePathParameterPlaceholderSourceBuildDateController()], hostPipe: "none" });

		await expect(app.init()).rejects.toThrow('Controller "E2ePathParameterPlaceholderSourcePpsDate" method "read" names the path parameter "id" in its IAM resourcePath, so its PARAMETERS DTO must either copy that value from a scalar entity column with ApiPropertyCopy, or describe it with ApiPropertyUUID, an integer ApiPropertyNumber or ApiPropertyString, and it does neither');
		// The HTTP server never listened, so closing it can only fail; the module is closed by the failed start.
		await app.close().catch((): undefined => undefined);
	});
});
