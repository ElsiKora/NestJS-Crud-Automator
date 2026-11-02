import "reflect-metadata";

import type { ArgumentsHost, INestApplication } from "@nestjs/common";
import type { ValidationError } from "class-validator";

import type { IApiAuthorizationPrincipal } from "../../src/index";

import { BadRequestException, Catch, HttpStatus, ValidationPipe } from "@nestjs/common";
import { BaseExceptionFilter, HttpAdapterHost } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiRequestValidationGetErrors, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType } from "../../src/index";
import { E2E_PATH_PARAMETER_EXCEPTION_DOCUMENTS, E2E_PATH_PARAMETER_EXCEPTION_ID, E2ePathParameterExceptionGuard, E2ePathParameterExceptionItemEntity, E2ePathParameterExceptionItemService, E2ePathParameterExceptionOpenController, E2ePathParameterExceptionSecuredController } from "./path-parameter/validation-exception";

const CORE_BODY: Record<string, unknown> = { code: "VALIDATION_FAILED", errors: [{ path: "id", rule: "UUID" }] };
const CORE_RULES: Record<string, string> = { isUuid: "UUID" };
const GUARDED_ROUTES: Array<{ name: string; url: string }> = [
	{ name: "a generated route", url: "/path-parameter/exception/secured/not-a-uuid" },
	{ name: "a custom route", url: "/path-parameter/exception/secured/custom/not-a-uuid" },
];
const OPEN_URL: string = "/path-parameter/exception/open/not-a-uuid";

/**
 * The exception factory of a host with its own error contract, as Core has it on its ValidationPipe.
 * @param {Array<ValidationError>} errors - Validation failures.
 * @returns {BadRequestException} The host's answer.
 */
function coreExceptionFactory(errors: Array<ValidationError>): BadRequestException {
	return new BadRequestException({ code: "VALIDATION_FAILED", errors: errors.flatMap((error: ValidationError): Array<{ path: string; rule: string }> => Object.keys(error.constraints ?? {}).map((constraint: string): { path: string; rule: string } => ({ path: error.property, rule: CORE_RULES[constraint] ?? constraint }))) });
}

// Translates a refusal raised ahead of the pipe with the same factory the pipe uses.
@Catch()
class E2ePathParameterExceptionCoreFilter extends BaseExceptionFilter {
	public override catch(exception: unknown, host: ArgumentsHost): void {
		const errors: Array<ValidationError> | undefined = ApiRequestValidationGetErrors(exception);

		super.catch(errors ? coreExceptionFactory(errors) : exception, host);
	}
}

/**
 * Starts an application with Core's pipe and, when asked, its translating filter.
 * @param {string} adapterName - Fastify or Express.
 * @param {boolean} hasFilter - Whether the translating filter is registered.
 * @returns {Promise<INestApplication>} The listening application.
 */
async function startApplication(adapterName: string, hasFilter: boolean): Promise<INestApplication> {
	const entities: Array<new () => unknown> = [E2ePathParameterExceptionItemEntity];

	const moduleReference = await Test.createTestingModule({
		controllers: [E2ePathParameterExceptionSecuredController, E2ePathParameterExceptionOpenController],
		imports: [
			TypeOrmModule.forRoot({ database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" }),
			TypeOrmModule.forFeature(entities),
			ApiAuthorizationModule.forRoot({
				iam: {
					attachmentSources: [{ getAttachments: async (principal: IApiAuthorizationPrincipal) => await Promise.resolve({ attachments: [{ policyId: principal.id, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
					documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(E2E_PATH_PARAMETER_EXCEPTION_DOCUMENTS.filter((document: Record<string, unknown>): boolean => ids.includes(document.id as string))) }],
				},
				principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
			} as never),
		],
		providers: [E2ePathParameterExceptionItemService, E2ePathParameterExceptionGuard],
	}).compile();
	const app: INestApplication = moduleReference.createNestApplication(adapterName === "Express" ? new ExpressAdapter() : new FastifyAdapter(), { logger: false });

	app.useGlobalPipes(new ValidationPipe({ exceptionFactory: coreExceptionFactory, transform: true }));

	if (hasFilter) {
		app.useGlobalFilters(new E2ePathParameterExceptionCoreFilter(app.get(HttpAdapterHost).httpAdapter));
	}

	await app.listen(0, "127.0.0.1");
	await app.get(E2ePathParameterExceptionItemService).repository.save({ id: E2E_PATH_PARAMETER_EXCEPTION_ID, label: "one" });

	return app;
}

describe.each([{ adapterName: "Fastify" }, { adapterName: "Express" }])("a malformed path value through $adapterName (E2E)", ({ adapterName }: { adapterName: string }) => {
	describe("with a host filter that uses the pipe's exception factory", () => {
		let app: INestApplication;
		let base: string;

		beforeAll(async () => {
			app = await startApplication(adapterName, true);
			base = await app.getUrl();
		});

		afterAll(async () => {
			await app.close();
		});

		it.each([...GUARDED_ROUTES, { name: "a generated route without authorization", url: OPEN_URL }])("answers the host's own body on $name", async ({ url }: { url: string }) => {
			const response: Response = await fetch(`${base}${url}`);

			expect(response.status).toBe(HttpStatus.BAD_REQUEST);
			expect(await response.json()).toEqual(CORE_BODY);
		});

		it("still reads a valid path value", async () => {
			const response: Response = await fetch(`${base}/path-parameter/exception/secured/${E2E_PATH_PARAMETER_EXCEPTION_ID.toUpperCase()}`);

			expect(response.status).toBe(HttpStatus.OK);
			expect(await response.json()).toMatchObject({ id: E2E_PATH_PARAMETER_EXCEPTION_ID, label: "one" });
		});
	});

	describe("without a host filter", () => {
		let app: INestApplication;
		let base: string;

		beforeAll(async () => {
			app = await startApplication(adapterName, false);
			base = await app.getUrl();
		});

		afterAll(async () => {
			await app.close();
		});

		it.each(GUARDED_ROUTES)("keeps the default body on $name behind ApiAuthorizationGuard", async ({ url }: { url: string }) => {
			const response: Response = await fetch(`${base}${url}`);

			expect(response.status).toBe(HttpStatus.BAD_REQUEST);
			expect(await response.json()).toEqual({ error: "Bad Request", message: ["id must be a UUID"], statusCode: HttpStatus.BAD_REQUEST });
		});

		it("leaves a route without authorization to the host pipe, which answers first", async () => {
			const response: Response = await fetch(`${base}${OPEN_URL}`);

			expect(response.status).toBe(HttpStatus.BAD_REQUEST);
			expect(await response.json()).toEqual(CORE_BODY);
		});
	});
});
