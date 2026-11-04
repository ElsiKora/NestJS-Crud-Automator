import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { IApiAuthorizationPrincipal, IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";

import { HttpStatus, Inject, Injectable } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiControllerSecurable, ApiPropertyDescribe, ApiService, ApiServiceBase, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

const NAMESPACE: string = "failopen:item";
const PAGE: string = "limit=50&page=1";
const URL: string = "/iam-deny-fail-open/items";
const USER: Record<string, unknown> = { id: "user-1", profile: { tier: "gold" }, roles: ["admin", "banned"] };
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(USER);

const describeString = (description: string, exampleValue: string): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue, format: EApiPropertyStringType.STRING, maxLength: 36, minLength: 1, pattern: "/^[A-Za-z0-9-]+$/", type: EApiPropertyDescribeType.STRING });

@Entity("e2e_iam_deny_fail_open_items")
class E2eIamDenyFailOpenItemEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	@describeString("id", "own")
	public id!: string;

	@Column({ length: 36, type: "varchar" })
	@describeString("name", "Own")
	public name!: string;
}

const ROWS: Array<E2eIamDenyFailOpenItemEntity> = [
	{ id: "own", name: "Own" },
	{ id: "secret-1", name: "Secret" },
];

@Injectable()
@ApiService({ entity: E2eIamDenyFailOpenItemEntity })
class E2eIamDenyFailOpenItemService extends ApiServiceBase<E2eIamDenyFailOpenItemEntity> {
	@InjectRepository(E2eIamDenyFailOpenItemEntity)
	public readonly repository!: Repository<E2eIamDenyFailOpenItemEntity>;
}

/**
 * Authenticates every request as the one test user, whose roles are a list and whose profile is an object.
 */
@Injectable()
class E2eIamDenyFailOpenGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = USER;

		return true;
	}
}

const authentication = { guard: E2eIamDenyFailOpenGuard, type: EApiAuthenticationType.USER } as never;

const AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: NAMESPACE,
	resourceDefinition: {
		entity: E2eIamDenyFailOpenItemEntity,
		fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }],
		namespace: NAMESPACE,
		resourcePath: `${NAMESPACE}/{id}`,
		resourceType: NAMESPACE,
	},
};

@ApiControllerSecurable()
@ApiController<E2eIamDenyFailOpenItemEntity>({
	authorization: AUTHORIZATION as never,
	entity: E2eIamDenyFailOpenItemEntity,
	name: "E2eIamDenyFailOpenItems",
	path: "iam-deny-fail-open/items",
	routes: {
		[EApiRouteType.CREATE]: { security: { authentication } },
		[EApiRouteType.DELETE]: { security: { authentication } },
		[EApiRouteType.GET]: { security: { authentication } },
		[EApiRouteType.GET_LIST]: { security: { authentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { security: { authentication } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	} as never,
})
class E2eIamDenyFailOpenItemController {
	@Inject(E2eIamDenyFailOpenItemService)
	public readonly service!: E2eIamDenyFailOpenItemService;
}

const ALLOW: IApiPolicyStatement = { Action: [`${NAMESPACE}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: [`${NAMESPACE}/*`] };

const deny = (statement: Partial<IApiPolicyStatement>): Array<IApiPolicyStatement> => [ALLOW, { Action: [`${NAMESPACE}:*`], Effect: EApiPolicyEffect.DENY, Resource: [`${NAMESPACE}/*`], ...statement }];

// Deny statements that refuse every route: a wildcard inside the Action or Resource, or a key on a list or object value.
const DENY_EVERY_ROUTE_CASES: Array<[string, Array<IApiPolicyStatement>]> = [
	["an Action with an interior wildcard", deny({ Action: ["failopen:*:*"] })],
	["a Resource with an interior wildcard over every row", deny({ Resource: ["failopen:*/*"] })],
	["StringEquals on a role of the principal role list", deny({ Condition: { StringEquals: { "principal.roles": "banned" } } })],
	["StringNotEquals on the principal role list", deny({ Condition: { StringNotEquals: { "principal.roles": "admin" } } })],
	["StringEqualsIfExists on the principal role list", deny({ Condition: { StringEqualsIfExists: { "principal.roles": "banned" } } })],
	["StringNotEqualsIfExists on the principal role list", deny({ Condition: { StringNotEqualsIfExists: { "principal.roles": "admin" } } })],
	["StringEquals on an object attribute", deny({ Condition: { StringEquals: { "principal.attributes.profile": "gold" } } })],
];

// Allow statements whose key reads a list or an object, or whose Resource cannot cover every row, which must not grant anything.
const ALLOW_NOTHING_CASES: Array<[string, Array<IApiPolicyStatement>]> = [
	["StringEquals on the principal role list", [{ ...ALLOW, Condition: { StringEquals: { "principal.roles": "admin" } } }]],
	["StringNotEquals on the principal role list", [{ ...ALLOW, Condition: { StringNotEquals: { "principal.roles": "guest" } } }]],
	["StringNotEqualsIfExists on an object attribute", [{ ...ALLOW, Condition: { StringNotEqualsIfExists: { "principal.attributes.profile": "silver" } } }]],
	["a Resource with ? over one character of an unresolved row", [{ ...ALLOW, Resource: [`${NAMESPACE}/?`] }]],
];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("IAM Deny with interior wildcards and list values on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let fastify: { inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let statements: Array<IApiPolicyStatement> = [];

	const repository = (): Repository<E2eIamDenyFailOpenItemEntity> => app!.get(E2eIamDenyFailOpenItemService).repository;

	const storedIds = async (): Promise<Array<string>> => (await repository().find()).map((row: E2eIamDenyFailOpenItemEntity): string => row.id).sort();

	// Each route answers once; the update body writes the name the row already holds, and DELETE runs last.
	const routeStatuses = async (row: E2eIamDenyFailOpenItemEntity): Promise<Record<string, number>> => {
		const list: number = (await fastify.inject({ method: "GET", url: `${URL}?${PAGE}` })).statusCode;
		const create: number = (await fastify.inject({ method: "POST", payload: { id: `new-${row.id}`, name: "New" }, url: URL })).statusCode;
		const get: number = (await fastify.inject({ method: "GET", url: `${URL}/${row.id}` })).statusCode;
		const patch: number = (await fastify.inject({ method: "PATCH", payload: { name: row.name }, url: `${URL}/${row.id}` })).statusCode;
		const remove: number = (await fastify.inject({ method: "DELETE", url: `${URL}/${row.id}` })).statusCode;

		return { CREATE: create, DELETE: remove, GET: get, LIST: list, PATCH: patch };
	};

	const FORBIDDEN_EVERYWHERE: Record<string, number> = { CREATE: HttpStatus.FORBIDDEN, DELETE: HttpStatus.FORBIDDEN, GET: HttpStatus.FORBIDDEN, LIST: HttpStatus.FORBIDDEN, PATCH: HttpStatus.FORBIDDEN };

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		const connection: TypeOrmModuleOptions = container ? { dropSchema: true, entities: [E2eIamDenyFailOpenItemEntity], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities: [E2eIamDenyFailOpenItemEntity], synchronize: true, type: "better-sqlite3" };

		const moduleReference = await Test.createTestingModule({
			controllers: [E2eIamDenyFailOpenItemController],
			imports: [
				TypeOrmModule.forRoot(connection),
				TypeOrmModule.forFeature([E2eIamDenyFailOpenItemEntity]),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "deny-fail-open-policy", principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("deny-fail-open-policy") ? [{ document: { Statement: statements, Version: "2012-10-17" }, id: "deny-fail-open-policy", namespace: NAMESPACE, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [E2eIamDenyFailOpenItemService, E2eIamDenyFailOpenGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
	}, 300_000);

	beforeEach(async () => {
		await repository().clear();
		await repository().save(ROWS);
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it("serves every route under the Allow alone", async () => {
		statements = [ALLOW];

		expect(await routeStatuses(ROWS[0]!)).toEqual({ CREATE: HttpStatus.CREATED, DELETE: HttpStatus.NO_CONTENT, GET: HttpStatus.OK, LIST: HttpStatus.OK, PATCH: HttpStatus.OK });
	});

	it.each(DENY_EVERY_ROUTE_CASES)("refuses every route for a Deny with %s", async (_name: string, policyStatements: Array<IApiPolicyStatement>) => {
		statements = policyStatements;

		for (const row of ROWS) {
			expect({ row: row.id, statuses: await routeStatuses(row) }).toEqual({ row: row.id, statuses: FORBIDDEN_EVERYWHERE });
		}

		expect(await storedIds()).toEqual(["own", "secret-1"]);
	});

	it.each(ALLOW_NOTHING_CASES)("grants no route for an Allow with %s", async (_name: string, policyStatements: Array<IApiPolicyStatement>) => {
		statements = policyStatements;

		expect(await routeStatuses(ROWS[0]!)).toEqual(FORBIDDEN_EVERYWHERE);
		expect(await storedIds()).toEqual(["own", "secret-1"]);
	});

	it.each([
		["an Action with an interior wildcard", [{ ...ALLOW, Action: ["failopen:*:*"] }]],
		["a Resource with an interior wildcard", [{ ...ALLOW, Resource: ["failopen:*/*"] }]],
		["an Action with ?", [{ ...ALLOW, Action: ["failopen:ite?:*"] }]],
	])("serves every route for an Allow with %s", async (_name: string, policyStatements: Array<IApiPolicyStatement>) => {
		statements = policyStatements;

		expect(await routeStatuses(ROWS[0]!)).toEqual({ CREATE: HttpStatus.CREATED, DELETE: HttpStatus.NO_CONTENT, GET: HttpStatus.OK, LIST: HttpStatus.OK, PATCH: HttpStatus.OK });
	});

	it("refuses the matching row and the whole collection for a Deny Resource with ?", async () => {
		statements = deny({ Resource: [`${NAMESPACE}/secret-?`] });

		expect(await routeStatuses(ROWS[1]!)).toEqual(FORBIDDEN_EVERYWHERE);
		expect((await fastify.inject({ method: "GET", url: `${URL}/own` })).statusCode).toBe(HttpStatus.OK);
		expect(await storedIds()).toEqual(["own", "secret-1"]);
	});

	it("refuses only the delete for a Deny Action with an interior wildcard", async () => {
		statements = deny({ Action: ["failopen:*:delete"] });

		expect(await routeStatuses(ROWS[0]!)).toEqual({ CREATE: HttpStatus.CREATED, DELETE: HttpStatus.FORBIDDEN, GET: HttpStatus.OK, LIST: HttpStatus.OK, PATCH: HttpStatus.OK });
		expect(await storedIds()).toEqual(["new-own", "own", "secret-1"]);
	});

	it("refuses the named rows and the whole collection for a Deny Resource with an interior wildcard", async () => {
		statements = deny({ Resource: ["failopen:*/secret-*"] });

		expect(await routeStatuses(ROWS[1]!)).toEqual(FORBIDDEN_EVERYWHERE);
		expect((await fastify.inject({ method: "GET", url: `${URL}/own` })).statusCode).toBe(HttpStatus.OK);
		expect((await fastify.inject({ method: "PATCH", payload: { name: "Own" }, url: `${URL}/own` })).statusCode).toBe(HttpStatus.OK);
		expect((await fastify.inject({ method: "DELETE", url: `${URL}/own` })).statusCode).toBe(HttpStatus.NO_CONTENT);
		expect(await storedIds()).toEqual(["secret-1"]);
	});
});
