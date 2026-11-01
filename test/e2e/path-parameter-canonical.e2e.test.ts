import "reflect-metadata";

import type { INestApplication, PipeTransform } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { ValidationError } from "class-validator";
import type { IApiAuthorizationPrincipal } from "../../src/index";

import { BadRequestException, HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, CorrelationIDResponseBodyInterceptor, EApiAuthorizationPrincipalType } from "../../src/index";
import {
	buildE2ePathParameterCanonicalUndescribedCustomController,
	E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID,
	E2E_PATH_PARAMETER_CANONICAL_AT,
	E2E_PATH_PARAMETER_CANONICAL_CONTROLLERS,
	E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID,
	E2E_PATH_PARAMETER_CANONICAL_DOCUMENTS,
	E2E_PATH_PARAMETER_CANONICAL_DTO_KINDS,
	E2E_PATH_PARAMETER_CANONICAL_NARROW_MAXIMUM,
	E2ePathParameterCanonicalGuard,
	E2ePathParameterCanonicalIntItemEntity,
	E2ePathParameterCanonicalIntItemService,
	E2ePathParameterCanonicalMomentItemEntity,
	E2ePathParameterCanonicalMomentItemService,
	E2ePathParameterCanonicalTextUuidItemEntity,
	E2ePathParameterCanonicalTextUuidItemService,
	E2ePathParameterCanonicalUuidItemEntity,
	E2ePathParameterCanonicalUuidItemService,
} from "./path-parameter";

type TCanonicalFastify = { inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

const ENTITIES: Array<new () => unknown> = [E2ePathParameterCanonicalIntItemEntity, E2ePathParameterCanonicalMomentItemEntity, E2ePathParameterCanonicalUuidItemEntity, E2ePathParameterCanonicalTextUuidItemEntity];
const PROVIDERS: Array<new () => unknown> = [E2ePathParameterCanonicalIntItemService, E2ePathParameterCanonicalMomentItemService, E2ePathParameterCanonicalUuidItemService, E2ePathParameterCanonicalTextUuidItemService, E2ePathParameterCanonicalGuard];
const AT_WITHOUT_MILLISECONDS: string = "2024-03-10T12:00:00Z";
const OTHER_AT: string = "2024-03-11T12:00:00.000Z";
const UPPER_TEXT_UUID: string = "DDDDDDDD-DDDD-4DDD-8DDD-DDDDDDDDDDDD";
const NON_CANONICAL_INTEGERS: Array<string> = ["016", "1.6e1", "0x10", "abc"];
const NON_CANONICAL_BOOLEANS: Array<string> = ["1", "no", "TRUE", "garbage"];

/**
 * Builds a host pipe like the one a consumer service registers: implicit conversion, whitelisting and its own error body.
 * @returns {PipeTransform} Host validation pipe.
 */
const buildConsumerPipe = (): PipeTransform =>
	new ValidationPipe({
		exceptionFactory: (errors: Array<ValidationError>) => new BadRequestException({ code: "VALIDATION_FAILED", errors: errors.flatMap((error: ValidationError) => Object.keys(error.constraints ?? {}).map((rule: string) => ({ path: error.property, rule }))) }),
		forbidNonWhitelisted: true,
		forbidUnknownValues: true,
		transform: true,
		transformOptions: { enableImplicitConversion: true },
		whitelist: true,
	});

/**
 * Builds the testing module of the canonical path value suite.
 * @param {StartedPostgreSqlContainer | undefined} container - PostgreSQL container, or undefined for SQLite.
 * @param {Array<new () => unknown>} controllers - Controllers to register.
 * @returns {Promise<INestApplication>} Application that is not initialized yet.
 */
const createCanonicalApplication = async (container: StartedPostgreSqlContainer | undefined, controllers: Array<new () => unknown>): Promise<INestApplication> => {
	const moduleReference = await Test.createTestingModule({
		controllers,
		imports: [
			TypeOrmModule.forRoot(container ? { dropSchema: true, entities: ENTITIES, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities: ENTITIES, synchronize: true, type: "better-sqlite3" }),
			TypeOrmModule.forFeature(ENTITIES),
			ApiAuthorizationModule.forRoot({
				iam: {
					attachmentSources: [{ getAttachments: async (principal: IApiAuthorizationPrincipal) => await Promise.resolve({ attachments: [{ policyId: principal.id, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
					documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(E2E_PATH_PARAMETER_CANONICAL_DOCUMENTS.filter((document: Record<string, unknown>): boolean => ids.includes(document.id as string))) }],
				},
				principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
			} as never),
			ApiSubscriberModule,
		],
		providers: PROVIDERS,
	}).compile();

	return moduleReference.createNestApplication(new FastifyAdapter());
};

describe.each([
	{ databaseName: "SQLite", isPostgres: false, pipe: "none" },
	{ databaseName: "SQLite", isPostgres: false, pipe: "transform" },
	{ databaseName: "SQLite", isPostgres: false, pipe: "consumer" },
	{ databaseName: "PostgreSQL", isPostgres: true, pipe: "none" },
	{ databaseName: "PostgreSQL", isPostgres: true, pipe: "transform" },
	{ databaseName: "PostgreSQL", isPostgres: true, pipe: "consumer" },
])("canonical path values on $databaseName, host pipe: $pipe (E2E)", ({ isPostgres, pipe }: { databaseName: string; isPostgres: boolean; pipe: string }) => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let fastify: TCanonicalFastify;

	const expectStatus = async (url: string, status: HttpStatus, method: string = "GET", payload?: Record<string, unknown>): Promise<unknown> => {
		const response = await fastify.inject({ method, payload, url });

		expect({ status: response.statusCode, url }).toEqual({ status, url, ...(response.statusCode === status ? {} : { body: response.json() }) });

		return response.json();
	};

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		app = await createCanonicalApplication(container, E2E_PATH_PARAMETER_CANONICAL_CONTROLLERS);
		app.useGlobalInterceptors(new CorrelationIDResponseBodyInterceptor());

		if (pipe === "transform") {
			app.useGlobalPipes(new ValidationPipe({ transform: true }));
		}

		if (pipe === "consumer") {
			app.useGlobalPipes(buildConsumerPipe());
		}

		await app.init();
		fastify = app.getHttpAdapter().getInstance();

		await app.get(E2ePathParameterCanonicalIntItemService).repository.save([
			{ active: true, id: 1, label: "one" },
			{ active: false, id: 16, label: "sixteen" },
		]);
		await app.get(E2ePathParameterCanonicalMomentItemService).repository.save([
			{ at: new Date(E2E_PATH_PARAMETER_CANONICAL_AT), id: 1, label: "first" },
			{ at: new Date(OTHER_AT), id: 2, label: "second" },
		]);
		await app.get(E2ePathParameterCanonicalUuidItemService).repository.save([
			{ id: E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID, label: "denied" },
			{ id: E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID, label: "allowed" },
		]);
	}, 240_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it("gives IAM the ISO 8601 UTC text of a DATE_TIME path value", async () => {
		await expectStatus(`/path-parameter/canonical/dt-deny/${E2E_PATH_PARAMETER_CANONICAL_AT}/items/1`, HttpStatus.FORBIDDEN);
		await expectStatus(`/path-parameter/canonical/dt-deny/${AT_WITHOUT_MILLISECONDS}/items/1`, HttpStatus.FORBIDDEN);
		await expectStatus(`/path-parameter/canonical/dt-deny/${OTHER_AT}/items/2`, HttpStatus.OK);
		await expectStatus(`/path-parameter/canonical/dt-res/${E2E_PATH_PARAMETER_CANONICAL_AT}/items/1`, HttpStatus.FORBIDDEN);
		await expectStatus(`/path-parameter/canonical/dt-res/${AT_WITHOUT_MILLISECONDS}/items/1`, HttpStatus.FORBIDDEN);
		await expectStatus(`/path-parameter/canonical/dt-res/${OTHER_AT}/items/2`, HttpStatus.OK);
	});

	it("matches the resource recipe on a DATE_TIME path value", async () => {
		expect(await expectStatus(`/path-parameter/canonical/dt-recipe/${E2E_PATH_PARAMETER_CANONICAL_AT}/items/1`, HttpStatus.OK)).toMatchObject({ id: 1, label: "first" });
		expect(await expectStatus(`/path-parameter/canonical/dt-recipe/${AT_WITHOUT_MILLISECONDS}/items/1`, HttpStatus.OK)).toMatchObject({ id: 1 });
		await expectStatus(`/path-parameter/canonical/dt-recipe/${OTHER_AT}/items/1`, HttpStatus.NOT_FOUND);
	});

	it("renders a BOOLEAN path value into the resource string a Deny names", async () => {
		await expectStatus("/path-parameter/canonical/bool-deny/true/items/1", HttpStatus.FORBIDDEN);
		expect(await expectStatus("/path-parameter/canonical/bool-deny/false/items/16", HttpStatus.OK)).toMatchObject({ id: 16 });
		await expectStatus("/path-parameter/canonical/bool-cond/true/items/1", HttpStatus.FORBIDDEN);
		expect(await expectStatus("/path-parameter/canonical/bool-cond/false/items/16", HttpStatus.OK)).toMatchObject({ id: 16 });
	});

	it.each(NON_CANONICAL_BOOLEANS)("rejects the BOOLEAN path text %s before authorization", async (value: string) => {
		await expectStatus(`/path-parameter/canonical/bool-deny/${value}/items/1`, HttpStatus.BAD_REQUEST);
		await expectStatus(`/path-parameter/canonical/bool-cond/${value}/items/1`, HttpStatus.BAD_REQUEST);
	});

	it.each(E2E_PATH_PARAMETER_CANONICAL_DTO_KINDS.map(({ kind }: { kind: string }) => kind))("converts the path value of a route with the configured %s PARAMETERS DTO by the column rule", async (kind: string) => {
		for (const access of ["open", "guard"]) {
			expect(await expectStatus(`/path-parameter/canonical/ppc-dto-${kind}-${access}/1`, HttpStatus.OK)).toMatchObject({ id: 1, label: "one" });

			for (const value of NON_CANONICAL_INTEGERS) {
				await expectStatus(`/path-parameter/canonical/ppc-dto-${kind}-${access}/${value}`, HttpStatus.BAD_REQUEST);
			}
		}
	});

	it("lets a configured PARAMETERS DTO narrow the column rule", async () => {
		await expectStatus("/path-parameter/canonical/narrow/1", HttpStatus.OK);
		await expectStatus(`/path-parameter/canonical/narrow/${String(E2E_PATH_PARAMETER_CANONICAL_NARROW_MAXIMUM + 6)}`, HttpStatus.BAD_REQUEST);
		await expectStatus("/path-parameter/canonical/narrow/016", HttpStatus.BAD_REQUEST);
	});

	it("stores a UUID body value lower-case, so a text column reads it back by either letter case", async () => {
		const created: { id: string } = (await expectStatus("/path-parameter/canonical/text-uuid", HttpStatus.CREATED, "POST", { label: "created", ownerId: UPPER_TEXT_UUID })) as { id: string };
		const repository = app!.get(E2ePathParameterCanonicalTextUuidItemService).repository;

		expect(await repository.findOneBy({ id: created.id })).toMatchObject({ ownerId: UPPER_TEXT_UUID.toLowerCase() });
		expect(await expectStatus(`/path-parameter/canonical/text-uuid/${created.id.toUpperCase()}`, HttpStatus.OK)).toMatchObject({ id: created.id, ownerId: UPPER_TEXT_UUID.toLowerCase() });
		await expectStatus(`/path-parameter/canonical/text-uuid/${created.id.toUpperCase()}`, HttpStatus.OK, "PATCH", { ownerId: E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID.toUpperCase() });

		expect(await repository.findOneBy({ id: created.id })).toMatchObject({ ownerId: E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID });
	});

	it("applies a Deny on a custom route to every spelling of its path value", async () => {
		await expectStatus("/path-parameter/canonical/ppc-custom-int/16", HttpStatus.FORBIDDEN);

		for (const value of NON_CANONICAL_INTEGERS) {
			await expectStatus(`/path-parameter/canonical/ppc-custom-int/${value}`, HttpStatus.BAD_REQUEST);
		}

		expect(await expectStatus("/path-parameter/canonical/ppc-custom-int/1", HttpStatus.OK)).toEqual({ value: "string:1" });
		await expectStatus(`/path-parameter/canonical/ppc-custom-uuid/${E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID}`, HttpStatus.FORBIDDEN);
		await expectStatus(`/path-parameter/canonical/ppc-custom-uuid/${E2E_PATH_PARAMETER_CANONICAL_DENIED_UUID.toUpperCase()}`, HttpStatus.FORBIDDEN);
		expect(await expectStatus(`/path-parameter/canonical/ppc-custom-uuid/${E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID.toUpperCase()}`, HttpStatus.OK)).toEqual({ value: `string:${E2E_PATH_PARAMETER_CANONICAL_ALLOWED_UUID}` });
	});

	it("leaves the raw path text to a guard that runs before authorization", async () => {
		E2ePathParameterCanonicalGuard.RAW_PARAMETERS.length = 0;
		await expectStatus("/path-parameter/canonical/ppc-custom-int/016", HttpStatus.BAD_REQUEST);

		expect(E2ePathParameterCanonicalGuard.RAW_PARAMETERS).toEqual([{ id: "016" }]);
	});
});

describe("custom route resource placeholders (E2E)", () => {
	it("fails at startup when the PARAMETERS DTO of a custom route does not describe a resource path placeholder", async () => {
		const app: INestApplication = await createCanonicalApplication(undefined, [buildE2ePathParameterCanonicalUndescribedCustomController()]);

		await expect(app.init()).rejects.toThrow(/path parameter "id"/);
		// A failed init leaves the Fastify server unbound, so its close fails; the application holds no database connection worth closing.
		await app.close().catch((): undefined => undefined);
	});
});
