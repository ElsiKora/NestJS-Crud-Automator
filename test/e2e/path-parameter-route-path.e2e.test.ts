import "reflect-metadata";

import type { DynamicModule, INestApplication, PipeTransform } from "@nestjs/common";
import type { GlobalPrefixOptions } from "@nestjs/common/internal";
import type { Routes } from "@nestjs/core";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { Logger } from "typeorm";

import type { IApiAuthorizationPrincipal } from "../../src/index";

import { HttpStatus, ValidationPipe } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Type } from "class-transformer";
import { IsInt } from "class-validator";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { ApiAuthorizationModule, ApiPropertyCopy, AuthorizationResolveDefaultPrincipal, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiDtoType, EApiRouteType } from "../../src/index";
import {
	E2E_ROUTE_PATH_ALLOWED_TENANT,
	E2E_ROUTE_PATH_DENIED_TENANT,
	E2E_ROUTE_PATH_DOCUMENTS,
	E2E_ROUTE_PATH_ITEM,
	E2E_ROUTE_PATH_PIPES,
	E2E_ROUTE_PATH_POLICY_TRACE,
	E2E_ROUTE_PATH_UNIT,
	E2eRoutePathBuildController,
	E2eRoutePathBuildCreateController,
	E2eRoutePathBuildGeneratedController,
	E2eRoutePathBuildListController,
	E2eRoutePathBuildModule,
	E2eRoutePathBuildPipesController,
	E2eRoutePathBuildTenantPipeController,
	E2eRoutePathGuard,
	E2eRoutePathIdDto,
	E2eRoutePathItemIdDto,
	E2eRoutePathInjectingGuard,
	E2eRoutePathItemEntity,
	E2eRoutePathItemService,
	E2eRoutePathOrgDto,
	E2eRoutePathPolicy,
	E2eRoutePathTenantDto,
	E2eRoutePathUnitDto,
	E2eRoutePathValidatorDto,
} from "./path-parameter/route-path";

type TAdapterName = "Express" | "Fastify";
type THostPipe = "none" | "transform" | "validate";

// Spellings a database reads as the denied tenant 16, while a policy compares their text.
const DENIED_TENANT_ALIASES: Array<string> = ["016", "0x10", "1e1", "16.0", "%2016"];
const MODES: Array<{ mode: EApiAuthorizationMode; segment: string }> = [
	{ mode: EApiAuthorizationMode.IAM, segment: "iam" },
	{ mode: EApiAuthorizationMode.HOOKS, segment: "hooks" },
];
const DENIED: string = String(E2E_ROUTE_PATH_DENIED_TENANT);
const ALLOWED: string = String(E2E_ROUTE_PATH_ALLOWED_TENANT);
const UNIT: string = String(E2E_ROUTE_PATH_UNIT);
const ITEM: string = String(E2E_ROUTE_PATH_ITEM);

class RoutePathQueryLogger implements Logger {
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

// The tenant of the RouterModule path is a placeholder of the IAM resource path, so a Deny names it.
class E2eRoutePathTenantValidatorDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof E2eRoutePathItemEntity => E2eRoutePathItemEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: number;

	@IsInt()
	@Type(() => Number)
	public tenant!: number;
}

/**
 * Builds an application.
 * @param {object} options - Application options.
 * @param {TAdapterName} options.adapterName - HTTP adapter.
 * @param {StartedPostgreSqlContainer} [options.container] - PostgreSQL container, or SQLite when absent.
 * @param {Array<new () => unknown>} [options.controllers] - Controllers of the root module.
 * @param {[string, GlobalPrefixOptions] | string} [options.globalPrefix] - Global prefix, with its options.
 * @param {THostPipe} options.hostPipe - Host pipe.
 * @param {Array<new () => unknown>} [options.modules] - Feature modules.
 * @param {RoutePathQueryLogger} [options.logger] - Query logger.
 * @param {Routes} [options.routes] - `RouterModule` routes.
 * @returns {Promise<INestApplication>} The application, not yet initialized.
 */
async function buildApplication(options: { adapterName: TAdapterName; container?: StartedPostgreSqlContainer; controllers?: Array<new () => unknown>; globalPrefix?: [string, GlobalPrefixOptions] | string; hostPipe: THostPipe; logger?: RoutePathQueryLogger; modules?: Array<new () => unknown>; routes?: Routes }): Promise<INestApplication> {
	const entities: Array<new () => unknown> = [E2eRoutePathItemEntity];
	const database: Record<string, unknown> = options.container ? { type: "postgres", url: options.container.getConnectionUri() } : { database: ":memory:", type: "better-sqlite3" };
	const routerModules: Array<DynamicModule> = options.routes ? [RouterModule.register(options.routes)] : [];
	const moduleReference = await Test.createTestingModule({
		controllers: options.controllers ?? [],
		imports: [
			TypeOrmModule.forRoot({ ...database, dropSchema: true, entities, logger: options.logger, logging: options.logger ? ["query", "error"] : false, synchronize: true } as never),
			TypeOrmModule.forFeature(entities),
			ApiAuthorizationModule.forRoot({
				iam: {
					attachmentSources: [{ getAttachments: async (principal: IApiAuthorizationPrincipal) => await Promise.resolve({ attachments: [{ policyId: principal.id, principalId: principal.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
					documentSources: [{ getDocumentsByIds: async (ids: ReadonlyArray<string>) => await Promise.resolve(E2E_ROUTE_PATH_DOCUMENTS.filter((document: Record<string, unknown>): boolean => ids.includes(document.id as string))) }],
				},
				principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
			} as never),
			...(options.modules ?? []),
			...routerModules,
		],
		providers: [E2eRoutePathItemService, E2eRoutePathGuard, E2eRoutePathInjectingGuard, E2eRoutePathPolicy],
	}).compile();
	const app: INestApplication = moduleReference.createNestApplication(options.adapterName === "Express" ? new ExpressAdapter() : new FastifyAdapter(), { logger: false });
	// Each pipe is created only when used: creating a ValidationPipe resets the class-transformer and class-validator Nest shares among every ValidationPipe.
	const pipes: Record<THostPipe, () => Array<PipeTransform>> = { none: () => [], transform: () => [new ValidationPipe({ transform: true })], validate: () => [new ValidationPipe()] };

	app.useGlobalPipes(...pipes[options.hostPipe]());

	if (options.globalPrefix) {
		const [prefix, prefixOptions]: [string, GlobalPrefixOptions | undefined] = typeof options.globalPrefix === "string" ? [options.globalPrefix, undefined] : options.globalPrefix;

		app.setGlobalPrefix(prefix, prefixOptions);
	}

	return app;
}

// The served routes: a RouterModule tree with a nested child, and a global prefix in an application of its own.
const tenantControllers: Array<new () => unknown> = MODES.flatMap(({ mode, segment }: { mode: EApiAuthorizationMode; segment: string }): Array<new () => unknown> => [
	E2eRoutePathBuildController({ dto: E2eRoutePathTenantDto, mode, name: `E2eRoutePathTenant${segment}`, path: segment, resourcePath: "route-path/t{tenant}/{id}" }),
	E2eRoutePathBuildController({ dto: E2eRoutePathTenantDto, guard: E2eRoutePathInjectingGuard, mode, name: `E2eRoutePathInject${segment}`, path: segment, resourcePath: "route-path/t{tenant}/{id}", routePath: "inject/:id" }),
]);
const unitControllers: Array<new () => unknown> = MODES.map(({ mode, segment }: { mode: EApiAuthorizationMode; segment: string }): new () => unknown => E2eRoutePathBuildController({ dto: E2eRoutePathUnitDto, mode, name: `E2eRoutePathUnit${segment}`, path: segment, resourcePath: "route-path/t{tenant}/u{unit}/{id}" }));
const orgControllers: Array<new () => unknown> = MODES.map(({ mode, segment }: { mode: EApiAuthorizationMode; segment: string }): new () => unknown => E2eRoutePathBuildController({ dto: E2eRoutePathOrgDto, mode, name: `E2eRoutePathOrg${segment}`, path: segment, resourcePath: "route-path/o{org}/{id}" }));
const TenantModule: new () => unknown = E2eRoutePathBuildModule("E2eRoutePathTenantModule", tenantControllers);
const UnitModule: new () => unknown = E2eRoutePathBuildModule("E2eRoutePathUnitModule", unitControllers);
const TENANT_ROUTES: Routes = [{ children: [{ module: UnitModule as never, path: "units/:unit" }], module: TenantModule as never, path: "tenants/:tenant" }];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("a policy and a handler read the path value of the whole route path on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
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
		const logger: RoutePathQueryLogger = new RoutePathQueryLogger();
		const applications: Array<INestApplication> = [];
		let tenantBase: string;
		let orgBase: string;

		/**
		 * Sends a GET and reads the answer.
		 * @param {string} url - Full URL.
		 * @returns {Promise<{ body: Record<string, unknown>; queries: Array<string>; status: number; trace: Array<Record<string, string> | undefined> }>} Status, body, the SQL the request sent, and the path values each HOOKS policy call saw.
		 */
		const read = async (url: string): Promise<{ body: Record<string, unknown>; queries: Array<string>; status: number; trace: Array<Record<string, string> | undefined> }> => {
			const queryCount: number = logger.queries.length;
			const traceCount: number = E2E_ROUTE_PATH_POLICY_TRACE.length;
			const response: Response = await fetch(url);
			const body: Record<string, unknown> = (await response.json()) as Record<string, unknown>;

			return { body, queries: logger.queries.slice(queryCount), status: response.status, trace: E2E_ROUTE_PATH_POLICY_TRACE.slice(traceCount) };
		};

		/**
		 * Starts an application on a free port.
		 * @param {INestApplication} app - Application.
		 * @returns {Promise<string>} Its base URL.
		 */
		const listen = async (app: INestApplication): Promise<string> => {
			applications.push(app);
			await app.listen(0, "127.0.0.1");

			return (await app.getUrl()).replace("[::1]", "127.0.0.1");
		};

		beforeAll(async () => {
			tenantBase = await listen(await buildApplication({ adapterName, container, hostPipe, logger, modules: [TenantModule, UnitModule], routes: TENANT_ROUTES }));
			orgBase = await listen(await buildApplication({ adapterName, container, controllers: orgControllers, globalPrefix: "orgs/:org", hostPipe, logger }));
		}, 120_000);

		beforeEach(async () => {
			for (const app of applications) {
				const repository = app.get(E2eRoutePathItemService).repository;

				await repository.clear();
				await repository.save([{ id: E2E_ROUTE_PATH_ITEM, label: "one", tenant: E2E_ROUTE_PATH_ALLOWED_TENANT, unit: E2E_ROUTE_PATH_UNIT }]);
			}
		});

		afterAll(async () => {
			for (const app of applications) {
				await app.close();
			}
		});

		describe.each(MODES)("on a securable $mode custom route", ({ mode, segment }: { mode: EApiAuthorizationMode; segment: string }) => {
			/**
			 * Expects the denied value to reach the policy as its canonical text and to be refused.
			 * @param {string} url - URL that names the denied tenant or organization.
			 * @param {string} key - Path parameter that holds it.
			 * @returns {Promise<void>}
			 */
			const expectDenied = async (url: string, key: string): Promise<void> => {
				const denied = await read(url);

				expect(denied.status).toBe(HttpStatus.FORBIDDEN);
				expect(denied.queries).toEqual([]);

				if (mode === EApiAuthorizationMode.HOOKS) {
					expect(denied.trace.length).toBeGreaterThan(0);
					expect(denied.trace.every((parameters: Record<string, string> | undefined): boolean => parameters?.[key] === DENIED)).toBe(true);
				}
			};

			/**
			 * Expects a spelling of a value to be refused before the policy and without SQL.
			 * @param {string} url - URL with the spelling.
			 * @returns {Promise<void>}
			 */
			const expectRefused = async (url: string): Promise<void> => {
				const refused = await read(url);

				expect(refused.status).toBe(HttpStatus.BAD_REQUEST);
				expect(refused.queries).toEqual([]);
				expect(refused.trace).toEqual([]);
			};

			/**
			 * Expects an allowed request to reach the handler with the value the policy saw.
			 * @param {string} url - URL that names allowed values.
			 * @param {Record<string, string>} expected - Path values the handler reads, as text.
			 * @returns {Promise<void>}
			 */
			const expectAllowed = async (url: string, expected: Record<string, string>): Promise<void> => {
				const allowed = await read(url);
				const parameters: Record<string, unknown> = allowed.body.parameters as Record<string, unknown>;

				expect(allowed.status).toBe(HttpStatus.OK);
				expect(allowed.body.label).toBe("one");
				expect(Object.fromEntries(Object.entries(parameters).map(([key, value]: [string, unknown]): [string, string] => [key, String(value)]))).toEqual(expected);

				if (mode === EApiAuthorizationMode.HOOKS) {
					expect(allowed.trace.every((trace: Record<string, string> | undefined): boolean => JSON.stringify(trace) === JSON.stringify(Object.fromEntries(Object.keys(trace ?? {}).map((key: string): [string, string] => [key, expected[key] ?? ""]))))).toBe(true);
				}
			};

			it("refuses the tenant of a RouterModule path that a policy denies", async () => {
				await expectDenied(`${tenantBase}/tenants/${DENIED}/${segment}/items/${ITEM}`, "tenant");
				await expectAllowed(`${tenantBase}/tenants/${ALLOWED}/${segment}/items/${ITEM}`, { id: ITEM, tenant: ALLOWED });
			});

			it.each(DENIED_TENANT_ALIASES)("refuses the tenant spelled %s before the policy and without SQL", async (alias: string) => {
				await expectRefused(`${tenantBase}/tenants/${alias}/${segment}/items/${ITEM}`);
			});

			it("checks each parameter of a nested RouterModule path", async () => {
				await expectDenied(`${tenantBase}/tenants/${DENIED}/units/${UNIT}/${segment}/items/${ITEM}`, "tenant");
				await expectRefused(`${tenantBase}/tenants/0${DENIED}/units/${UNIT}/${segment}/items/${ITEM}`);
				await expectRefused(`${tenantBase}/tenants/${ALLOWED}/units/0${UNIT}/${segment}/items/${ITEM}`);
				await expectAllowed(`${tenantBase}/tenants/${ALLOWED}/units/${UNIT}/${segment}/items/${ITEM}`, { id: ITEM, tenant: ALLOWED, unit: UNIT });
			});

			it("checks the parameter of the global prefix", async () => {
				await expectDenied(`${orgBase}/orgs/${DENIED}/${segment}/items/${ITEM}`, "org");
				await expectRefused(`${orgBase}/orgs/0${DENIED}/${segment}/items/${ITEM}`);
				await expectAllowed(`${orgBase}/orgs/${ALLOWED}/${segment}/items/${ITEM}`, { id: ITEM, org: ALLOWED });
			});

			it("fails closed on a path parameter startup did not check, before the policy and without SQL", async () => {
				const refused = await read(`${tenantBase}/tenants/${ALLOWED}/${segment}/inject/${ITEM}`);

				expect(refused.status).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
				expect(refused.queries).toEqual([]);
				expect(refused.trace).toEqual([]);
			});
		});
	});
});

interface IRefusedCase {
	adapters?: Array<TAdapterName>;
	build: (mode: EApiAuthorizationMode, adapterName: TAdapterName, name: string) => { controllers?: Array<new () => unknown>; globalPrefix?: [string, GlobalPrefixOptions] | string; modules?: Array<new () => unknown>; routes?: Routes };
	message: (name: string) => string;
	modes?: Array<EApiAuthorizationMode>;
	name: string;
}

/**
 * Mounts one controller in a module under a `RouterModule` path.
 * @param {string} name - Unique name.
 * @param {string} path - `RouterModule` path.
 * @param {new () => unknown} controller - Controller.
 * @returns {{ modules: Array<new () => unknown>; routes: Routes }} The module and its route.
 */
function mounted(name: string, path: string, controller: new () => unknown): { modules: Array<new () => unknown>; routes: Routes } {
	const module: new () => unknown = E2eRoutePathBuildModule(`${name}Module`, [controller]);

	return { modules: [module], routes: [{ module: module as never, path }] };
}

// Each application could give a policy or a handler a path value no rule checked, so it must not start.
const REFUSED: Array<IRefusedCase> = [
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => mounted(name, "tenants/:tenant", E2eRoutePathBuildController({ dto: E2eRoutePathIdDto, mode, name, resourcePath: "route-path/{id}" })),
		message: (name: string): string => `Controller "${name}" method "read" has the path parameter "tenant", which its PARAMETERS DTO "E2eRoutePathIdDto" does not describe`,
		name: "a RouterModule parameter the PARAMETERS DTO does not describe",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => {
			const parent: new () => unknown = E2eRoutePathBuildModule(`${name}ParentModule`, []);
			const child: new () => unknown = E2eRoutePathBuildModule(`${name}ChildModule`, [E2eRoutePathBuildController({ dto: E2eRoutePathTenantDto, mode, name, resourcePath: "route-path/t{tenant}/{id}" })]);

			return { modules: [parent, child], routes: [{ children: [{ module: child as never, path: "units/:unit" }], module: parent as never, path: "tenants/:tenant" }] };
		},
		message: (name: string): string => `Controller "${name}" method "read" has the path parameter "unit", which its PARAMETERS DTO "E2eRoutePathTenantDto" does not describe`,
		name: "a nested RouterModule parameter the PARAMETERS DTO does not describe",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildController({ dto: E2eRoutePathIdDto, mode, name, path: "items-root", resourcePath: "route-path/{id}" })], globalPrefix: "orgs/:org" }),
		message: (name: string): string => `Controller "${name}" method "read" has the path parameter "org", which its PARAMETERS DTO "E2eRoutePathIdDto" does not describe`,
		name: "a global prefix parameter the PARAMETERS DTO does not describe",
	},
	{
		build: (mode: EApiAuthorizationMode, adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildController({ dto: E2eRoutePathIdDto, mode, name, path: `route-path/${name}`, routePath: adapterName === "Fastify" ? "items/:id/*" : "items/:id/*rest" })] }),
		message: (name: string): string => `Controller "${name}" method "read" is served under the wildcard path`,
		name: "a wildcard in the route path",
	},
	{
		adapters: ["Express"],
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildController({ dto: E2eRoutePathIdDto, mode, name, path: `route-path/${name}`, routePath: "items/:id/{*rest}" })] }),
		message: (name: string): string => `Controller "${name}" method "read" is served under the wildcard path "items/:id/{*rest}"`,
		name: "an optional wildcard in the route path",
	},
	{
		// Fastify itself refuses a wildcard that is not the last character of the route.
		adapters: ["Express"],
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => mounted(name, "files/*rest", E2eRoutePathBuildController({ dto: E2eRoutePathIdDto, mode, name, resourcePath: "route-path/{id}" })),
		message: (name: string): string => `Controller "${name}" method "read" is served under the wildcard path "/files/*rest"`,
		name: "a wildcard in the RouterModule path",
	},
	{
		// find-my-way reads no escape, so "\:x" serves the parameter "x", which Express reads as literal text.
		adapters: ["Fastify"],
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildController({ dto: E2eRoutePathIdDto, mode, name, path: `route-path/${name}`, routePath: "items/\\:x/:id" })] }),
		message: (name: string): string => `Controller "${name}" method "read" has the path parameter "x", which its PARAMETERS DTO "E2eRoutePathIdDto" does not describe`,
		name: "a backslash before a colon, which Fastify reads as a parameter",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildPipesController(mode, name, "method", E2E_ROUTE_PATH_PIPES["a ParseIntPipe class"] ?? [])] }),
		message: (name: string): string => `Controller "${name}" method "read" runs ParseIntPipe from @UsePipes on the method`,
		name: "a ParseIntPipe in @UsePipes on the method",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildPipesController(mode, name, "controller", E2E_ROUTE_PATH_PIPES["an own pipe instance"] ?? [])] }),
		message: (name: string): string => `Controller "${name}" method "read" runs E2eRoutePathNumberPipe from @UsePipes on the controller`,
		name: "an own pipe in @UsePipes on the controller",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => mounted(name, "tenants/:tenant", E2eRoutePathBuildTenantPipeController(mode, name)),
		message: (name: string): string => `Controller "${name}" method "list" converts the path parameter "tenant" with a pipe on @Param`,
		name: "a ParseIntPipe on the RouterModule parameter of a route without its own parameter",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => mounted(name, "tenants/:tenant", E2eRoutePathBuildGeneratedController(mode, name)),
		message: (name: string): string => `Controller "${name}" method "get" has the path parameter "tenant", which its generated PARAMETERS DTO does not describe`,
		name: "a RouterModule parameter of a generated route",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildController({ dto: E2eRoutePathValidatorDto, mode, name, path: `route-path/${name}` })] }),
		message: (name: string): string => `Controller "${name}" method "read" has the path parameter "id", which its PARAMETERS DTO "E2eRoutePathValidatorDto" holds without a column type`,
		modes: [EApiAuthorizationMode.HOOKS],
		name: "a HOOKS PARAMETERS DTO with a bare validator",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => mounted(name, "tenants/:tenant", E2eRoutePathBuildController({ dto: E2eRoutePathTenantValidatorDto, mode, name, resourcePath: "route-path/t{tenant}/{id}" })),
		message: (name: string): string => `Controller "${name}" method "read" names the path parameter "tenant" in its IAM resourcePath`,
		modes: [EApiAuthorizationMode.IAM],
		name: "an IAM resourcePath placeholder from a RouterModule path that is not copied from a column",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildController({ dto: E2eRoutePathItemIdDto, mode, name, path: `route-path/${name}`, resourcePath: "route-path/{id}", routePath: "items/:itemId" })] }),
		message: (name: string): string => `Controller "${name}" method "read" names "{id}" in its IAM resourcePath, which is not a path parameter of the route, and a route that neither lists nor creates renders it as "*"`,
		modes: [EApiAuthorizationMode.IAM],
		name: "an IAM route that neither lists nor creates and reads the row under another parameter than its resourcePath placeholder",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildController({ dto: E2eRoutePathIdDto, mode, name, path: `route-path/${name}`, resourcePath: "route-path/t{tenant}/{id}" })] }),
		message: (name: string): string => `Controller "${name}" method "read" names "{tenant}" in its IAM resourcePath, which is not a path parameter of the route`,
		modes: [EApiAuthorizationMode.IAM],
		name: "an IAM route that neither lists nor creates and lacks a resourcePath placeholder in its path",
	},
	{
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildPipesController(mode, name, "method", [new ValidationPipe({ expectedType: E2eRoutePathValidatorDto, transform: true })])] }),
		message: (name: string): string => `Controller "${name}" method "read" runs ValidationPipe from @UsePipes on the method with expectedType`,
		name: "a ValidationPipe with expectedType in @UsePipes",
	},
	{
		// The fake class-transformer skips every @Transform; Nest keeps it for every ValidationPipe until another one is created.
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildPipesController(mode, name, "method", [new ValidationPipe({ transform: true, transformerPackage: { classToPlain: (value: unknown): unknown => value, plainToInstance: (type: new () => object, plain: object): object => Object.assign(new type(), plain) } as never })])] }),
		message: (name: string): string => `Controller "${name}" method "read" runs ValidationPipe from @UsePipes on the method with another class-transformer or class-validator`,
		name: "a ValidationPipe with another class-transformer in @UsePipes",
	},
	{
		// The fake class-validator accepts every value.
		build: (mode: EApiAuthorizationMode, _adapterName: TAdapterName, name: string) => ({ controllers: [E2eRoutePathBuildPipesController(mode, name, "controller", [new ValidationPipe({ validatorPackage: { validate: async (): Promise<Array<never>> => await Promise.resolve([]) } as never })])] }),
		message: (name: string): string => `Controller "${name}" method "read" runs ValidationPipe from @UsePipes on the controller with another class-transformer or class-validator`,
		name: "a ValidationPipe with another class-validator in @UsePipes",
	},
];

describe.each<TAdapterName>(["Fastify", "Express"])("a securable route that could give a policy a path value no rule checked, through %s (E2E)", (adapterName: TAdapterName) => {
	describe.each(MODES)("on $mode", ({ mode, segment }: { mode: EApiAuthorizationMode; segment: string }) => {
		const cases: Array<IRefusedCase> = REFUSED.filter((refusedCase: IRefusedCase): boolean => (refusedCase.adapters ?? [adapterName]).includes(adapterName) && (refusedCase.modes ?? [mode]).includes(mode));

		it.each(cases.map((refusedCase: IRefusedCase, index: number): [string, IRefusedCase, number] => [refusedCase.name, refusedCase, index]))("does not start with %s", async (_name: string, refusedCase: IRefusedCase, index: number) => {
			const name: string = `E2eRoutePathRefused${adapterName}${segment}${String(index)}`;
			const app: INestApplication = await buildApplication({ adapterName, hostPipe: "none", ...refusedCase.build(mode, adapterName, name) });

			await expect(app.init()).rejects.toThrow(refusedCase.message(name));
			// The HTTP server never listened, so closing it can only fail; the module is closed by the failed start.
			await app.close().catch((): undefined => undefined);
			// A ValidationPipe created without packages puts the real class-transformer and class-validator back for every ValidationPipe of the process.
			expect(new ValidationPipe()).toBeInstanceOf(ValidationPipe);
		});

		it("starts without calling the exceptionFactory of a ValidationPipe in @UsePipes, which is code of the application", async () => {
			const name: string = `E2eRoutePathFactory${adapterName}${segment}`;
			const exceptionFactory: ReturnType<typeof vi.fn<(errors: Array<unknown>) => Error>> = vi.fn<(errors: Array<unknown>) => Error>((): Error => new Error("user code"));
			const app: INestApplication = await buildApplication({ adapterName, controllers: [E2eRoutePathBuildPipesController(mode, name, "method", [new ValidationPipe({ exceptionFactory, transform: true })])], hostPipe: "none" });

			await expect(app.init()).resolves.toBe(app);
			expect(exceptionFactory).not.toHaveBeenCalled();
			await app.close();
		});

		it.each(["a ValidationPipe class", "a ValidationPipe instance"])("starts with %s in @UsePipes", async (pipeName: string) => {
			const name: string = `E2eRoutePathAllowed${adapterName}${segment}${pipeName.replaceAll(" ", "")}`;
			const app: INestApplication = await buildApplication({ adapterName, controllers: [E2eRoutePathBuildPipesController(mode, name, "method", E2E_ROUTE_PATH_PIPES[pipeName] ?? [])], hostPipe: "none" });

			await expect(app.init()).resolves.toBe(app);
			await app.close();
		});
	});
});

// The generated routes that name one row, whose resourcePath placeholder the guard fills only from the path.
const GENERATED_ROW_ROUTES: Array<EApiRouteType> = [EApiRouteType.GET, EApiRouteType.UPDATE, EApiRouteType.PARTIAL_UPDATE, EApiRouteType.DELETE];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("an IAM resourcePath placeholder that a route path does not carry, on $databaseName (E2E)", ({ databaseName, isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let container: StartedPostgreSqlContainer | undefined;

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}
	}, 120_000);

	afterAll(async () => {
		await container?.stop();
	});

	describe.each<TAdapterName>(["Fastify", "Express"])("through %s", (adapterName: TAdapterName) => {
		it.each(GENERATED_ROW_ROUTES)("does not start with the generated %s route, whose Deny on the placeholder would match no request", async (routeType: EApiRouteType) => {
			const name: string = `E2eRoutePathGeneratedPlaceholder${databaseName}${adapterName}${routeType}`;
			const app: INestApplication = await buildApplication({ adapterName, container, controllers: [E2eRoutePathBuildGeneratedController(EApiAuthorizationMode.IAM, name, [routeType], "route-path/t{tenant}/{id}")], hostPipe: "none" });

			await expect(app.init()).rejects.toThrow(`Controller "${name}" method "${routeType}" names "{tenant}" in its IAM resourcePath, which is not a path parameter of the route, and a route that neither lists nor creates renders it as "*"`);
			// The HTTP server never listened, so closing it can only fail; the module is closed by the failed start.
			await app.close().catch((): undefined => undefined);
		});

		it("starts with every generated route under a resourcePath whose placeholder each row route carries", async () => {
			const name: string = `E2eRoutePathGeneratedCarried${databaseName}${adapterName}`;
			const app: INestApplication = await buildApplication({ adapterName, container, controllers: [E2eRoutePathBuildGeneratedController(EApiAuthorizationMode.IAM, name, [...GENERATED_ROW_ROUTES, EApiRouteType.CREATE, EApiRouteType.GET_LIST], "route-path/{id}")], hostPipe: "none" });

			await expect(app.init()).resolves.toBe(app);
			await app.close();
		});

		it("starts with the generated CREATE and GET_LIST routes, which IAM evaluates as a create and a list", async () => {
			const name: string = `E2eRoutePathGeneratedCreateList${databaseName}${adapterName}`;
			const app: INestApplication = await buildApplication({ adapterName, container, controllers: [E2eRoutePathBuildGeneratedController(EApiAuthorizationMode.IAM, name, [EApiRouteType.CREATE, EApiRouteType.GET_LIST], "route-path/t{tenant}/{id}")], hostPipe: "none" });

			await expect(app.init()).resolves.toBe(app);
			await app.close();
		});

		it.each(["type", "action"] as const)("starts a custom create route declared by its %s under a resourcePath placeholder it does not carry, and answers it", async (declaredBy: "action" | "type") => {
			const name: string = `E2eRoutePathCustomCreate${databaseName}${adapterName}${declaredBy}`;
			const app: INestApplication = await buildApplication({ adapterName, container, controllers: [E2eRoutePathBuildCreateController(name, declaredBy)], hostPipe: "none" });

			await app.listen(0, "127.0.0.1");

			const base: string = (await app.getUrl()).replace("[::1]", "127.0.0.1");
			const response: Response = await fetch(`${base}/route-path/${name}`, { body: "{}", headers: { "content-type": "application/json" }, method: "POST" });

			expect(response.status).toBe(HttpStatus.OK);
			expect(await response.json()).toEqual({ value: "created" });
			await app.close();
		});
	});
});

describe.each<TAdapterName>(["Fastify", "Express"])("a securable route whose path parameters are read from the paths Nest serves, through %s (E2E)", (adapterName: TAdapterName) => {
	const logger: RoutePathQueryLogger = new RoutePathQueryLogger();
	const applications: Array<INestApplication> = [];

	/**
	 * Starts an application on a free port.
	 * @param {INestApplication} app - Application.
	 * @returns {Promise<string>} Its base URL.
	 */
	const listen = async (app: INestApplication): Promise<string> => {
		applications.push(app);
		await app.init();
		await app.get(E2eRoutePathItemService).repository.save([{ id: E2E_ROUTE_PATH_ITEM, label: "one", tenant: E2E_ROUTE_PATH_ALLOWED_TENANT, unit: E2E_ROUTE_PATH_UNIT }]);
		await app.listen(0, "127.0.0.1");

		return (await app.getUrl()).replace("[::1]", "127.0.0.1");
	};

	/**
	 * Sends a GET and reads the status and the SQL it sent.
	 * @param {string} url - Full URL.
	 * @returns {Promise<{ queries: Array<string>; status: number }>} Status and SQL.
	 */
	const read = async (url: string): Promise<{ queries: Array<string>; status: number }> => {
		const queryCount: number = logger.queries.length;
		const response: Response = await fetch(url);
		await response.text();

		return { queries: logger.queries.slice(queryCount), status: response.status };
	};

	afterAll(async () => {
		for (const app of applications) {
			await app.close();
		}
	});

	describe.each(MODES)("on $mode", ({ mode, segment }: { mode: EApiAuthorizationMode; segment: string }) => {
		it("reads no parameter from escaped text in the route path", async () => {
			const name: string = `E2eRoutePathEscaped${adapterName}${segment}`;
			const [routePath, sentPath]: [string, string] = adapterName === "Fastify" ? ["items/a::b/:id", "items/a:b"] : ["items/\\:x/:id", "items/:x"];
			const base: string = await listen(await buildApplication({ adapterName, controllers: [E2eRoutePathBuildController({ dto: E2eRoutePathIdDto, mode, name, path: `route-path/${name}`, routePath })], hostPipe: "none", logger }));

			expect((await read(`${base}/route-path/${name}/${sentPath}/${ITEM}`)).status).toBe(HttpStatus.OK);
			expect(await read(`${base}/route-path/${name}/${sentPath}/0${ITEM}`)).toEqual({ queries: [], status: HttpStatus.BAD_REQUEST });
		});

		it("reads no global prefix parameter on a route setGlobalPrefix excludes", async () => {
			const name: string = `E2eRoutePathExcluded${adapterName}${segment}`;
			const controllers: Array<new () => unknown> = [E2eRoutePathBuildController({ dto: E2eRoutePathIdDto, mode, name, path: `route-path/${name}` }), E2eRoutePathBuildController({ dto: E2eRoutePathIdDto, mode, name: `${name}Health`, path: `route-path/${name}-health`, resourcePath: "route-path/health", routePath: "health" })];
			const base: string = await listen(await buildApplication({ adapterName, controllers, globalPrefix: ["orgs/:org", { exclude: [`route-path/${name}/{*rest}`, `route-path/${name}-health/health`] }], hostPipe: "none", logger }));

			expect((await read(`${base}/route-path/${name}/items/${ITEM}`)).status).toBe(HttpStatus.OK);
			expect(await read(`${base}/route-path/${name}/items/0${ITEM}`)).toEqual({ queries: [], status: HttpStatus.BAD_REQUEST });
		});
	});

	it("keeps a resourcePath placeholder a list route does not carry, and maps a Deny on it to the rows of the list", async () => {
		const name: string = `E2eRoutePathList${adapterName}`;
		const base: string = await listen(await buildApplication({ adapterName, controllers: [E2eRoutePathBuildListController(name)], hostPipe: "none", logger }));

		// The Deny names tenant 16, which the resource definition has no field for, so the whole list is denied.
		expect(await read(`${base}/route-path/${name}/list/all`)).toEqual({ queries: [], status: HttpStatus.FORBIDDEN });
	});
});
