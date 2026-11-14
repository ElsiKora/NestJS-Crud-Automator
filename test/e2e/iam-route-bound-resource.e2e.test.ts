import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import type { IApiAuthorizationPrincipal } from "../../src/index";

import { HttpStatus } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, AuthorizationResolveDefaultPrincipal, EApiAuthorizationPrincipalType, EApiPolicySourceType } from "../../src/index";
import { E2E_ROUTE_BOUND_NAMED_ID, E2E_ROUTE_BOUND_NAMESPACE, E2E_ROUTE_BOUND_OTHER_ID, E2E_ROUTE_BOUND_POLICIES, E2eRouteBoundAnchorEntity, E2eRouteBoundAnchorService, E2eRouteBoundBuildController, E2eRouteBoundGuard } from "./route-bound-resource/fixture";

interface IAnswer {
	body: { ids?: Array<string> };
	status: number;
}

/**
 * Builds an application that serves the given settings controllers under the policies of the fixture.
 * @param {Array<new () => unknown>} controllers - Controllers to serve.
 * @param {StartedPostgreSqlContainer} [container] - PostgreSQL container, or SQLite when absent.
 * @returns {Promise<INestApplication>} The application, not yet initialized.
 */
async function buildApplication(controllers: Array<new () => unknown>, container?: StartedPostgreSqlContainer): Promise<INestApplication> {
	const entities: Array<new () => unknown> = [E2eRouteBoundAnchorEntity];
	const database: Record<string, unknown> = container ? { type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", type: "better-sqlite3" };
	const module = await Test.createTestingModule({
		controllers,
		imports: [
			TypeOrmModule.forRoot({ ...database, dropSchema: true, entities, synchronize: true } as never),
			TypeOrmModule.forFeature(entities),
			ApiAuthorizationModule.forRoot({
				iam: {
					attachmentSources: [{ getAttachments: async (principal: IApiAuthorizationPrincipal) => await Promise.resolve({ attachments: [{ policyId: principal.id, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
					documentSources: [
						{
							getDocumentsByIds: async (ids: ReadonlyArray<string>) =>
								await Promise.resolve(
									Object.entries(E2E_ROUTE_BOUND_POLICIES)
										.filter(([id]: [string, ReadonlyArray<unknown>]): boolean => ids.includes(id))
										.map(([id, statements]: [string, ReadonlyArray<unknown>]) => ({ document: { Statement: statements, Version: "2012-10-17" }, id, namespace: E2E_ROUTE_BOUND_NAMESPACE, sourceType: EApiPolicySourceType.DATABASE, version: "1" })),
								),
						},
					],
				},
				principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
			} as never),
		],
		providers: [E2eRouteBoundAnchorService, E2eRouteBoundGuard],
	}).compile();

	return module.createNestApplication(new FastifyAdapter(), { logger: false });
}

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("an IAM resource whose placeholder binds to a route parameter on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;
	let app: INestApplication;
	let fastify: { inject: (options: { body?: unknown; headers: Record<string, string>; method: string; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };

	/**
	 * Sends a request as the principal that holds one policy.
	 * @param {string} policy - Policy of the principal.
	 * @param {string} method - HTTP method.
	 * @param {string} [id] - Setting id, or the list when absent.
	 * @returns {Promise<IAnswer>} Status and body.
	 */
	const send = async (policy: string, method: string, id?: string): Promise<IAnswer> => {
		const response = await fastify.inject({ ...(method === "PATCH" ? { body: { value: "30" } } : {}), headers: { "x-policy": policy }, method, url: `/route-bound/config-data${id === undefined ? "" : `/${id}`}` });

		return { body: response.json() as IAnswer["body"], status: response.statusCode };
	};

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		app = await buildApplication([E2eRouteBoundBuildController({ name: "E2eRouteBoundSettingController", routeParameters: ["id"] })], container);
		await app.init();
		fastify = app.getHttpAdapter().getInstance() as typeof fastify;
		await (fastify as unknown as { ready: () => Promise<void> }).ready();
	}, 120_000);

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	describe("an Allow of one id", () => {
		it("admits exactly that id on read and update", async () => {
			expect(await send("allow-one", "GET", E2E_ROUTE_BOUND_NAMED_ID)).toEqual({ body: { ids: [E2E_ROUTE_BOUND_NAMED_ID] }, status: HttpStatus.OK });
			expect((await send("allow-one", "PATCH", E2E_ROUTE_BOUND_NAMED_ID)).status).toBe(HttpStatus.OK);
		});

		it("refuses every other id", async () => {
			expect((await send("allow-one", "GET", E2E_ROUTE_BOUND_OTHER_ID)).status).toBe(HttpStatus.FORBIDDEN);
			expect((await send("allow-one", "PATCH", E2E_ROUTE_BOUND_OTHER_ID)).status).toBe(HttpStatus.FORBIDDEN);
		});

		it("does not apply to the list, which no column narrows to one id", async () => {
			expect((await send("allow-one", "GET")).status).toBe(HttpStatus.FORBIDDEN);
		});

		it("leaves an Allow of every row to admit the list", async () => {
			expect(await send("allow-one-and-every-row", "GET")).toEqual({ body: { ids: [E2E_ROUTE_BOUND_NAMED_ID, E2E_ROUTE_BOUND_OTHER_ID] }, status: HttpStatus.OK });
		});
	});

	describe("a Deny of one id beside an Allow of every row", () => {
		it("refuses exactly that id on read and update", async () => {
			expect((await send("deny-one", "GET", E2E_ROUTE_BOUND_NAMED_ID)).status).toBe(HttpStatus.FORBIDDEN);
			expect((await send("deny-one", "PATCH", E2E_ROUTE_BOUND_NAMED_ID)).status).toBe(HttpStatus.FORBIDDEN);
		});

		it("admits every other id", async () => {
			expect(await send("deny-one", "GET", E2E_ROUTE_BOUND_OTHER_ID)).toEqual({ body: { ids: [E2E_ROUTE_BOUND_OTHER_ID] }, status: HttpStatus.OK });
			expect((await send("deny-one", "PATCH", E2E_ROUTE_BOUND_OTHER_ID)).status).toBe(HttpStatus.OK);
		});

		it("refuses the whole list, since no column can exclude the named row", async () => {
			expect((await send("deny-one", "GET")).status).toBe(HttpStatus.FORBIDDEN);
		});
	});

	describe("an Allow of every row only", () => {
		it("admits every id and the list", async () => {
			expect(await send("wildcard", "GET", E2E_ROUTE_BOUND_NAMED_ID)).toEqual({ body: { ids: [E2E_ROUTE_BOUND_NAMED_ID] }, status: HttpStatus.OK });
			expect(await send("wildcard", "GET", E2E_ROUTE_BOUND_OTHER_ID)).toEqual({ body: { ids: [E2E_ROUTE_BOUND_OTHER_ID] }, status: HttpStatus.OK });
			expect((await send("wildcard", "PATCH", E2E_ROUTE_BOUND_OTHER_ID)).status).toBe(HttpStatus.OK);
			expect(await send("wildcard", "GET")).toEqual({ body: { ids: [E2E_ROUTE_BOUND_NAMED_ID, E2E_ROUTE_BOUND_OTHER_ID] }, status: HttpStatus.OK });
		});

		it("refuses a path value that is not canonical before IAM, so it cannot name the denied id in another spelling", async () => {
			expect((await send("deny-one", "GET", E2E_ROUTE_BOUND_NAMED_ID.toUpperCase())).status).toBe(HttpStatus.BAD_REQUEST);
		});
	});

	describe("a section condition on the anchor's column", () => {
		it("still scopes the list and the rows by section", async () => {
			expect(await send("section", "GET")).toEqual({ body: { ids: [E2E_ROUTE_BOUND_NAMED_ID] }, status: HttpStatus.OK });
			expect(await send("section", "GET", E2E_ROUTE_BOUND_OTHER_ID)).toEqual({ body: { ids: [] }, status: HttpStatus.OK });
		});
	});
});

describe("startup of an IAM resource whose placeholder binds to neither a column nor a route parameter (E2E)", () => {
	const startupError = async (controller: new () => unknown): Promise<string> => {
		const app: INestApplication = await buildApplication([controller]);

		try {
			await app.init();

			return "";
		} catch (error: unknown) {
			return (error as Error).message;
		} finally {
			await app.close().catch(() => undefined);
		}
	};

	it("fails for a placeholder that reads no column of the anchor and is not in routeParameters", async () => {
		expect(await startupError(E2eRouteBoundBuildController({ name: "E2eRouteBoundColumnlessController" }))).toContain(
			`Controller "E2eRouteBoundColumnlessController" resource "${E2E_ROUTE_BOUND_NAMESPACE}" path placeholder "{id}" of "${E2E_ROUTE_BOUND_NAMESPACE}/{id}" reads no column of entity "E2eRouteBoundAnchorEntity" through "id", so every statement that names one resource would fail closed: map it to a column with a field "resource.id", bind the path parameter "id" to a column in pathScope, or list "id" in resourceDefinition.routeParameters to compare the text of the route parameter`,
		);
	});

	it("fails for a routeParameters entry that is not a placeholder of the resource path", async () => {
		expect(await startupError(E2eRouteBoundBuildController({ name: "E2eRouteBoundUnknownController", routeParameters: ["id", "settingId"] }))).toContain(`resourceDefinition.routeParameters names "settingId", which is not a placeholder of "${E2E_ROUTE_BOUND_NAMESPACE}/{id}"`);
	});
});
