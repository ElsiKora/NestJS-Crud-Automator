import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { IApiAuthorizationPrincipal } from "../../src/index";
import type { IE2ePathParameterKeySpellingCase, IE2ePathParameterKeySpellingRoute } from "./path-parameter/key-spelling";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiSubscriberModule, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType } from "../../src/index";
import { buildE2ePathParameterConsumerPipe } from "./path-parameter";
import { buildE2ePathParameterKeySpellingDecimalHooksRoute, buildE2ePathParameterKeySpellingDecimalRoute, E2E_PATH_PARAMETER_KEY_SPELLING_CASES, E2E_PATH_PARAMETER_KEY_SPELLING_DECIMAL_REFUSED, E2E_PATH_PARAMETER_KEY_SPELLING_DOCUMENTS, E2E_PATH_PARAMETER_KEY_SPELLING_ROUTES } from "./path-parameter/key-spelling";

type TKeySpellingFastify = { inject: (options: { method: string; url: string }) => Promise<{ json: () => Record<string, unknown>; statusCode: number }> };

const PIPES: Record<string, () => unknown> = {
	consumer: () => buildE2ePathParameterConsumerPipe(),
	groups: () => new ValidationPipe({ transform: true, transformOptions: { groups: ["g"] } }),
	implicit: () => new ValidationPipe({ transform: true, transformOptions: { enableImplicitConversion: true } }),
	none: () => undefined,
	transform: () => new ValidationPipe({ transform: true }),
	validate: () => new ValidationPipe(),
	version: () => new ValidationPipe({ transform: true, transformOptions: { version: 1 } }),
};
const DENY_KINDS: Array<string> = ["condition", "resource"];
const SPELLINGS = (read: (keyCase: IE2ePathParameterKeySpellingCase) => Array<string>): Array<[string, string]> => E2E_PATH_PARAMETER_KEY_SPELLING_CASES.flatMap((keyCase: IE2ePathParameterKeySpellingCase) => DENY_KINDS.flatMap((deny: string) => read(keyCase).map((spelling: string): [string, string] => [`${keyCase.name}-${deny}`, spelling])));

/**
 * Builds an application over the given routes, not yet started.
 * @param {StartedPostgreSqlContainer | undefined} container - PostgreSQL container, or undefined for SQLite.
 * @param {Array<Pick<IE2ePathParameterKeySpellingRoute, "controller" | "entity" | "service">>} routes - Routes to serve.
 * @param {Array<new () => unknown>} [providers] - Other providers.
 * @returns {Promise<INestApplication>} The application.
 */
const buildApplication = async (container: StartedPostgreSqlContainer | undefined, routes: Array<Pick<IE2ePathParameterKeySpellingRoute, "controller" | "entity" | "service">>, providers: Array<new () => unknown> = []): Promise<INestApplication> => {
	const entities: Array<new () => unknown> = [...new Set(routes.map((route: Pick<IE2ePathParameterKeySpellingRoute, "entity">) => route.entity))];
	const moduleReference = await Test.createTestingModule({
		controllers: routes.map((route: Pick<IE2ePathParameterKeySpellingRoute, "controller">) => route.controller),
		imports: [
			TypeOrmModule.forRoot(container ? { dropSchema: true, entities, synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities, synchronize: true, type: "better-sqlite3" }),
			TypeOrmModule.forFeature(entities),
			ApiAuthorizationModule.forRoot({
				iam: {
					attachmentSources: [{ getAttachments: async (principal: IApiAuthorizationPrincipal) => await Promise.resolve({ attachments: [{ policyId: principal.id, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
					documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(E2E_PATH_PARAMETER_KEY_SPELLING_DOCUMENTS.filter((document: unknown): boolean => ids.includes((document as { id: string }).id))) }],
				},
				principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
			} as never),
			ApiSubscriberModule,
		],
		providers: [...new Set(routes.map((route: Pick<IE2ePathParameterKeySpellingRoute, "service">) => route.service)), ...providers],
	}).compile();

	return moduleReference.createNestApplication(new FastifyAdapter());
};

describe.each(["sqlite", "postgres"])("a database reads a spelling of a generated key as the denied key: %s (E2E)", (engine: string) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		container = engine === "postgres" ? await new PostgreSqlContainer("postgres:17-alpine").start() : undefined;
	}, 280_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each(Object.keys(PIPES))("host pipe: %s", (pipe: string) => {
		let app: INestApplication;
		let fastify: TKeySpellingFastify;

		beforeAll(async () => {
			app = await buildApplication(container, E2E_PATH_PARAMETER_KEY_SPELLING_ROUTES);
			const hostPipe: unknown = PIPES[pipe]?.();

			if (hostPipe) {
				app.useGlobalPipes(hostPipe as never);
			}

			await app.init();
			fastify = app.getHttpAdapter().getInstance();
			await (fastify as unknown as { ready: () => Promise<void> }).ready();
			const entities: Array<new () => unknown> = [...new Set(E2E_PATH_PARAMETER_KEY_SPELLING_ROUTES.map((route: IE2ePathParameterKeySpellingRoute) => route.entity))];

			for (const entity of entities) {
				const route: IE2ePathParameterKeySpellingRoute | undefined = E2E_PATH_PARAMETER_KEY_SPELLING_ROUTES.find((candidate: IE2ePathParameterKeySpellingRoute) => candidate.entity === entity);
				const repository: { save: (row: unknown) => Promise<unknown> } = app.get(getRepositoryToken(entity));

				for (const row of route?.rows ?? []) {
					await repository.save({ key: row, label: `row-${String(row)}` });
				}
			}
		}, 120_000);

		afterAll(async () => {
			await app.close();
		});

		it.each(SPELLINGS((keyCase: IE2ePathParameterKeySpellingCase) => keyCase.denied))("denies %s/%s", async (namespace: string, spelling: string) => {
			const response = await fastify.inject({ method: "GET", url: `/key-spelling/${namespace}/${spelling}` });

			expect(response.statusCode).toBe(HttpStatus.FORBIDDEN);
		});

		it.each(SPELLINGS((keyCase: IE2ePathParameterKeySpellingCase) => keyCase.invalid))("refuses %s/%s before IAM and before any query", async (namespace: string, spelling: string) => {
			const response = await fastify.inject({ method: "GET", url: `/key-spelling/${namespace}/${spelling}` });

			expect(response.statusCode).toBe(HttpStatus.BAD_REQUEST);
		});

		it.each(SPELLINGS((keyCase: IE2ePathParameterKeySpellingCase) => keyCase.allowed))("serves %s/%s", async (namespace: string, spelling: string) => {
			const response = await fastify.inject({ method: "GET", url: `/key-spelling/${namespace}/${spelling}` });

			expect(response.statusCode).toBe(HttpStatus.OK);
			expect(response.json().label).toBe(`row-${spelling}`);
		});
	});

	it.each(E2E_PATH_PARAMETER_KEY_SPELLING_DECIMAL_REFUSED)("does not start an IAM route over the decimal key $name", async (keyCase: Pick<IE2ePathParameterKeySpellingCase, "column" | "describe" | "name">) => {
		const refused: INestApplication = await buildApplication(container, [buildE2ePathParameterKeySpellingDecimalRoute({ ...keyCase, name: `${engine}-${keyCase.name}` })]);

		await expect(refused.init()).rejects.toThrow(/method "\w+" holds the path parameter "key" in the \w+ column "key"/);
		await refused.close();
	});

	it("starts a HOOKS route over a decimal key, where no Deny compares its text", async () => {
		const hooks = buildE2ePathParameterKeySpellingDecimalHooksRoute();
		const started: INestApplication = await buildApplication(container, [hooks], [hooks.policy]);

		await expect(started.init()).resolves.toBeDefined();
		await started.close();
	});
});
