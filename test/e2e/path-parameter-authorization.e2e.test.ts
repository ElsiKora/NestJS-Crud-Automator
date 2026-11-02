import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { IApiAuthorizationPrincipal } from "../../src/index";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { HttpAdapterHost } from "@nestjs/core";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, AuthorizationResolveDefaultPrincipal, CorrelationIDResponseBodyExceptionFilter, CorrelationIDResponseBodyInterceptor, EApiAuthorizationPrincipalType } from "../../src/index";
import {
	buildE2ePathParameterConsumerPipe,
	E2E_PATH_PARAMETER_IAM_ALLOWED_INT_ID,
	E2E_PATH_PARAMETER_IAM_ALLOWED_UUID_ID,
	E2E_PATH_PARAMETER_IAM_DENIED_INT_ID,
	E2E_PATH_PARAMETER_IAM_DENIED_UUID_ID,
	E2E_PATH_PARAMETER_IAM_DOCUMENTS,
	E2ePathParameterIamGuard,
	E2ePathParameterIamIntConditionController,
	E2ePathParameterIamIntDenyController,
	E2ePathParameterIamIntItemEntity,
	E2ePathParameterIamIntItemService,
	E2ePathParameterIamIntLiteralController,
	E2ePathParameterIamUuidConditionController,
	E2ePathParameterIamUuidDenyController,
	E2ePathParameterIamUuidItemEntity,
	E2ePathParameterIamUuidItemService,
} from "./path-parameter";

const DENIED_INT: string = String(E2E_PATH_PARAMETER_IAM_DENIED_INT_ID);
const ALLOWED_INT: string = String(E2E_PATH_PARAMETER_IAM_ALLOWED_INT_ID);
const NON_CANONICAL_DENIED_INT_ALIASES: Array<string> = ["016", "%2016", "0x10", "16.0", "1.6e1", "1e3", "007"];

describe.each([
	{ databaseName: "SQLite", hasExceptionFilter: false, hostPipe: "none", isPostgres: false },
	{ databaseName: "SQLite", hasExceptionFilter: false, hostPipe: "transform", isPostgres: false },
	{ databaseName: "SQLite", hasExceptionFilter: false, hostPipe: "consumer", isPostgres: false },
	{ databaseName: "SQLite", hasExceptionFilter: true, hostPipe: "none", isPostgres: false },
	{ databaseName: "PostgreSQL", hasExceptionFilter: false, hostPipe: "none", isPostgres: true },
	{ databaseName: "PostgreSQL", hasExceptionFilter: false, hostPipe: "transform", isPostgres: true },
	{ databaseName: "PostgreSQL", hasExceptionFilter: false, hostPipe: "consumer", isPostgres: true },
])("typed path values in IAM authorization on $databaseName, host pipe: $hostPipe, exception filter: $hasExceptionFilter (E2E)", ({ hasExceptionFilter, hostPipe, isPostgres }: { databaseName: string; hasExceptionFilter: boolean; hostPipe: string; isPostgres: boolean }) => {
	const VALIDATION_BODY = (message: string): Record<string, unknown> => ({
		error: "Bad Request",
		message: expect.arrayContaining([message]) as unknown,
		statusCode: HttpStatus.BAD_REQUEST,
		...(hasExceptionFilter ? { correlationID: expect.any(String) as unknown, timestamp: expect.any(Number) as unknown } : {}),
	});
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let fastify: {
		inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }>;
	};

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		const entities: Array<new () => unknown> = [E2ePathParameterIamIntItemEntity, E2ePathParameterIamUuidItemEntity];
		const moduleReference = await Test.createTestingModule({
			controllers: [E2ePathParameterIamIntDenyController, E2ePathParameterIamIntConditionController, E2ePathParameterIamIntLiteralController, E2ePathParameterIamUuidDenyController, E2ePathParameterIamUuidConditionController],
			imports: [
				TypeOrmModule.forRoot(container ? { dropSchema: true, entities, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" }),
				TypeOrmModule.forFeature(entities),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async (principal: IApiAuthorizationPrincipal) => await Promise.resolve({ attachments: [{ policyId: principal.id, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(E2E_PATH_PARAMETER_IAM_DOCUMENTS.filter((document: Record<string, unknown>): boolean => ids.includes(document.id as string))) }],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [E2ePathParameterIamIntItemService, E2ePathParameterIamUuidItemService, E2ePathParameterIamGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		// Guards run before interceptors, so a guard rejection keeps the bare ValidationPipe body with this interceptor alone.
		app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());

		if (hasExceptionFilter) {
			app.useGlobalFilters(new CorrelationIDResponseBodyExceptionFilter(app.get(HttpAdapterHost)));
		}

		if (hostPipe === "transform") {
			app.useGlobalPipes(new ValidationPipe({ transform: true }));
		}

		// The guard checks path values before any pipe runs, so a consumer pipe with its own error body leaves the guard answer unchanged.
		if (hostPipe === "consumer") {
			app.useGlobalPipes(buildE2ePathParameterConsumerPipe());
		}

		await app.init();
		fastify = app.getHttpAdapter().getInstance();
	}, 120_000);

	beforeEach(async () => {
		const intRepository = app!.get(E2ePathParameterIamIntItemService).repository;
		const uuidRepository = app!.get(E2ePathParameterIamUuidItemService).repository;

		await intRepository.clear();
		await uuidRepository.clear();
		await intRepository.save([
			{ id: E2E_PATH_PARAMETER_IAM_ALLOWED_INT_ID, label: "one" },
			{ id: E2E_PATH_PARAMETER_IAM_DENIED_INT_ID, label: "sixteen" },
		]);
		await uuidRepository.save([
			{ id: E2E_PATH_PARAMETER_IAM_ALLOWED_UUID_ID, label: "allowed" },
			{ id: E2E_PATH_PARAMETER_IAM_DENIED_UUID_ID, label: "denied" },
		]);
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it("renders a NUMBER path value into the resource string a Deny names", async () => {
		const denied = await fastify.inject({ method: "GET", url: `/path-parameter/iam/int-deny/${DENIED_INT}` });
		const allowed = await fastify.inject({ method: "GET", url: `/path-parameter/iam/int-deny/${ALLOWED_INT}` });

		expect(denied.statusCode).toBe(HttpStatus.FORBIDDEN);
		expect(allowed.statusCode).toBe(HttpStatus.OK);
		expect(allowed.json()).toMatchObject({ id: E2E_PATH_PARAMETER_IAM_ALLOWED_INT_ID, label: "one" });
	});

	it.each(NON_CANONICAL_DENIED_INT_ALIASES)("rejects the alias %s of the denied row before authorization", async (alias: string) => {
		const read = await fastify.inject({ method: "GET", url: `/path-parameter/iam/int-deny/${alias}` });
		const update = await fastify.inject({ method: "PATCH", payload: { label: "patched" }, url: `/path-parameter/iam/int-deny/${alias}` });
		const removal = await fastify.inject({ method: "DELETE", url: `/path-parameter/iam/int-deny/${alias}` });

		for (const response of [read, update, removal]) {
			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
			expect(response.json()).toEqual(VALIDATION_BODY("id must be an integer number"));
		}

		expect(await app!.get(E2ePathParameterIamIntItemService).repository.findOneBy({ id: E2E_PATH_PARAMETER_IAM_DENIED_INT_ID })).toMatchObject({ label: "sixteen" });
	});

	it("answers a malformed path value in the guard with the ValidationPipe body", async () => {
		const response = await fastify.inject({ method: "GET", url: "/path-parameter/iam/int-deny/abc" });

		expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(response.json()).toEqual(VALIDATION_BODY("id must be an integer number"));
	});

	it("matches the request.parameters condition recipe on a NUMBER key", async () => {
		const denied = await fastify.inject({ method: "GET", url: `/path-parameter/iam/int-cond/${DENIED_INT}` });
		const allowed = await fastify.inject({ method: "GET", url: `/path-parameter/iam/int-cond/${ALLOWED_INT}` });
		const missing = await fastify.inject({ method: "GET", url: "/path-parameter/iam/int-cond/99" });

		expect(denied.statusCode).toBe(HttpStatus.OK);
		expect(denied.json()).toMatchObject({ id: E2E_PATH_PARAMETER_IAM_DENIED_INT_ID, label: "sixteen" });
		expect(allowed.statusCode).toBe(HttpStatus.OK);
		expect(missing.statusCode).toBe(HttpStatus.NOT_FOUND);
	});

	it("normalizes a literal string condition to the NUMBER column before merging the scope", async () => {
		const matching = await fastify.inject({ method: "GET", url: `/path-parameter/iam/int-literal/${DENIED_INT}` });
		const otherRow = await fastify.inject({ method: "GET", url: `/path-parameter/iam/int-literal/${ALLOWED_INT}` });

		expect(matching.statusCode).toBe(HttpStatus.OK);
		expect(matching.json()).toMatchObject({ id: E2E_PATH_PARAMETER_IAM_DENIED_INT_ID });
		expect(otherRow.statusCode).toBe(HttpStatus.NOT_FOUND);
	});

	it("applies a Deny on a UUID key to every letter case of that UUID", async () => {
		const denied = await fastify.inject({ method: "GET", url: `/path-parameter/iam/uuid-deny/${E2E_PATH_PARAMETER_IAM_DENIED_UUID_ID}` });
		const deniedUpperCase = await fastify.inject({ method: "GET", url: `/path-parameter/iam/uuid-deny/${E2E_PATH_PARAMETER_IAM_DENIED_UUID_ID.toUpperCase()}` });
		const allowed = await fastify.inject({ method: "GET", url: `/path-parameter/iam/uuid-deny/${E2E_PATH_PARAMETER_IAM_ALLOWED_UUID_ID}` });
		const malformed = await fastify.inject({ method: "GET", url: "/path-parameter/iam/uuid-deny/not-a-uuid" });

		expect(denied.statusCode).toBe(HttpStatus.FORBIDDEN);
		expect(deniedUpperCase.statusCode).toBe(HttpStatus.FORBIDDEN);
		expect(allowed.statusCode).toBe(HttpStatus.OK);
		expect(malformed.statusCode).toBe(HttpStatus.BAD_REQUEST);
		expect(malformed.json()).toEqual(VALIDATION_BODY("id must be a UUID"));
	});

	it("matches the request.parameters condition recipe on a UUID key", async () => {
		const allowed = await fastify.inject({ method: "GET", url: `/path-parameter/iam/uuid-cond/${E2E_PATH_PARAMETER_IAM_ALLOWED_UUID_ID}` });
		const upperCase = await fastify.inject({ method: "GET", url: `/path-parameter/iam/uuid-cond/${E2E_PATH_PARAMETER_IAM_ALLOWED_UUID_ID.toUpperCase()}` });

		expect(allowed.statusCode).toBe(HttpStatus.OK);
		expect(allowed.json()).toMatchObject({ id: E2E_PATH_PARAMETER_IAM_ALLOWED_UUID_ID, label: "allowed" });
		expect(upperCase.statusCode).toBe(HttpStatus.OK);
		expect(upperCase.json()).toMatchObject({ id: E2E_PATH_PARAMETER_IAM_ALLOWED_UUID_ID });
	});
});
