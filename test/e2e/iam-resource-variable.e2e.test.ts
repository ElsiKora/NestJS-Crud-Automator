import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { IApiAuthorizationPrincipal, IApiPolicyDocumentRecord, IApiPolicyStatement } from "../../src/index";

import { HttpStatus, Inject, Injectable, RequestMethod } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, Entity, PrimaryColumn, Repository } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiController, ApiControllerSecurable, ApiPropertyCopy, ApiPropertyDescribe, ApiRouteCustom, ApiService, ApiServiceBase, AuthorizationResolveDefaultPrincipal, EApiAuthenticationType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiDtoType, EApiPolicyEffect, EApiPolicySourceType, EApiPropertyDescribeType, EApiPropertyStringType, EApiRouteType } from "../../src/index";

type TCondition = Record<string, Record<string, unknown>>;

const NAMESPACE: string = "resvar:item";
const PAGE: string = "limit=50&page=1";
const URL: string = "/iam-resource-variable/items";
const USER: Record<string, unknown> = { id: "user-1", tenantId: "t-1" };
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(USER);

const describeString = (description: string, exampleValue: string): PropertyDecorator => ApiPropertyDescribe({ description, exampleValue, format: EApiPropertyStringType.STRING, maxLength: 36, minLength: 1, pattern: "/^[A-Za-z0-9-]+$/", type: EApiPropertyDescribeType.STRING });

@Entity("e2e_iam_resource_variable_items")
class E2eIamResourceVariableItemEntity {
	@PrimaryColumn({ length: 36, type: "varchar" })
	@describeString("id", "own")
	public id!: string;

	@Column({ length: 36, type: "varchar" })
	@describeString("name", "Own")
	public name!: string;

	@Column({ length: 36, type: "varchar" })
	@describeString("tenantId", "t-1")
	public tenantId!: string;
}

const ROWS: Array<E2eIamResourceVariableItemEntity> = [
	{ id: "own", name: "Own", tenantId: "t-1" },
	{ id: "other", name: "Other", tenantId: "t-2" },
];

@Injectable()
@ApiService({ entity: E2eIamResourceVariableItemEntity })
class E2eIamResourceVariableItemService extends ApiServiceBase<E2eIamResourceVariableItemEntity> {
	@InjectRepository(E2eIamResourceVariableItemEntity)
	public readonly repository!: Repository<E2eIamResourceVariableItemEntity>;
}

/**
 * Authenticates every request as the one test user of tenant t-1.
 */
@Injectable()
class E2eIamResourceVariableGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = USER;

		return true;
	}
}

const authentication = { guard: E2eIamResourceVariableGuard, type: EApiAuthenticationType.USER } as never;

const AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: NAMESPACE,
	resourceDefinition: {
		entity: E2eIamResourceVariableItemEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.tenantId", queryPath: "tenantId" },
		],
		namespace: NAMESPACE,
		resourcePath: `${NAMESPACE}/{id}`,
		resourceType: NAMESPACE,
	},
};

/**
 * Path parameters of the custom report route, copied from the entity column so the resource path renders the row id.
 */
class E2eIamResourceVariableReportParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof E2eIamResourceVariableItemEntity => E2eIamResourceVariableItemEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: string;
}

@ApiControllerSecurable()
@ApiController<E2eIamResourceVariableItemEntity>({
	authorization: AUTHORIZATION as never,
	entity: E2eIamResourceVariableItemEntity,
	name: "E2eIamResourceVariableItems",
	path: "iam-resource-variable/items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { security: { authentication } },
		[EApiRouteType.GET]: { security: { authentication } },
		[EApiRouteType.GET_LIST]: { security: { authentication } },
		[EApiRouteType.PARTIAL_UPDATE]: { security: { authentication } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	} as never,
})
class E2eIamResourceVariableItemController {
	@Inject(E2eIamResourceVariableItemService)
	public readonly service!: E2eIamResourceVariableItemService;

	@ApiRouteCustom<E2eIamResourceVariableItemEntity>({ dto: { [EApiDtoType.PARAMETERS]: E2eIamResourceVariableReportParametersDto }, resource: { action: "custom.report", entity: E2eIamResourceVariableItemEntity }, response: { status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.POST, path: "report/:id" }, security: { authentication } } as never)
	public report(): { isReached: boolean } {
		return { isReached: true };
	}
}

const statement = (effect: EApiPolicyEffect, condition?: TCondition): IApiPolicyStatement => ({
	Action: [`${NAMESPACE}:*`],
	...(condition ? { Condition: condition } : {}),
	Effect: effect,
	Resource: [`${NAMESPACE}/*`],
});

const allow = (condition?: TCondition): Array<IApiPolicyStatement> => [statement(EApiPolicyEffect.ALLOW, condition)];
const deny = (condition: TCondition): Array<IApiPolicyStatement> => [statement(EApiPolicyEffect.ALLOW), statement(EApiPolicyEffect.DENY, condition)];

// Conditions that compare a principal or request key with a resource variable, which the guard has no loaded resource to read.
const RESOURCE_VARIABLE_CASES: Array<[string, Array<IApiPolicyStatement>]> = [
	["Allow StringEquals principal.attributes.tenantId", allow({ StringEquals: { "principal.attributes.tenantId": "${resource.tenantId}" } })],
	["Allow StringEquals on a missing principal attribute", allow({ StringEquals: { "principal.attributes.missing": "${resource.tenantId}" } })],
	["Allow StringNotEquals principal.attributes.tenantId", allow({ StringNotEquals: { "principal.attributes.tenantId": "${resource.tenantId}" } })],
	["Allow StringNotEqualsIfExists principal.attributes.tenantId", allow({ StringNotEqualsIfExists: { "principal.attributes.tenantId": "${resource.tenantId}" } })],
	["Allow StringEquals on a missing request header", allow({ StringEquals: { "request.headers.x-tenant-id": "${resource.tenantId}" } })],
	["Deny StringEquals principal.attributes.tenantId", deny({ StringEquals: { "principal.attributes.tenantId": "${resource.tenantId}" } })],
	["Deny StringNotEquals principal.attributes.tenantId", deny({ StringNotEquals: { "principal.attributes.tenantId": "${resource.tenantId}" } })],
	["Deny StringEquals on a missing request header", deny({ StringEquals: { "request.headers.x-tenant-id": "${resource.tenantId}" } })],
];

describe.each([
	{ databaseName: "SQLite", isPostgres: false },
	{ databaseName: "PostgreSQL", isPostgres: true },
])("IAM resource variables without a loaded resource on $databaseName (E2E)", ({ isPostgres }: { databaseName: string; isPostgres: boolean }) => {
	let app: INestApplication | undefined;
	let container: StartedPostgreSqlContainer | undefined;
	let fastify: { inject: (options: { method: string; payload?: Record<string, unknown>; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let statements: Array<IApiPolicyStatement> = [];

	const repository = (): Repository<E2eIamResourceVariableItemEntity> => app!.get(E2eIamResourceVariableItemService).repository;

	const listIds = async (): Promise<{ ids: Array<string>; statusCode: number }> => {
		const response = await fastify.inject({ method: "GET", url: `${URL}?${PAGE}` });

		return { ids: response.statusCode === HttpStatus.OK ? (response.json() as { items: Array<{ id: string }> }).items.map((item: { id: string }): string => item.id).sort() : [], statusCode: response.statusCode };
	};

	// Each route answers once; the update body writes the name the row already holds, and DELETE runs last.
	const routeStatuses = async (row: E2eIamResourceVariableItemEntity): Promise<Record<string, number>> => {
		const get: number = (await fastify.inject({ method: "GET", url: `${URL}/${row.id}` })).statusCode;
		const patch: number = (await fastify.inject({ method: "PATCH", payload: { name: row.name }, url: `${URL}/${row.id}` })).statusCode;
		const custom: number = (await fastify.inject({ method: "POST", url: `${URL}/report/${row.id}` })).statusCode;
		const remove: number = (await fastify.inject({ method: "DELETE", url: `${URL}/${row.id}` })).statusCode;

		return { CUSTOM: custom, DELETE: remove, GET: get, PATCH: patch };
	};

	beforeAll(async () => {
		if (isPostgres) {
			container = await new PostgreSqlContainer("postgres:17-alpine").start();
		}

		const connection: TypeOrmModuleOptions = container ? { dropSchema: true, entities: [E2eIamResourceVariableItemEntity], synchronize: true, type: "postgres", url: container.getConnectionUri() } : { database: ":memory:", dropSchema: true, entities: [E2eIamResourceVariableItemEntity], synchronize: true, type: "better-sqlite3" };

		const moduleReference = await Test.createTestingModule({
			controllers: [E2eIamResourceVariableItemController],
			imports: [
				TypeOrmModule.forRoot(connection),
				TypeOrmModule.forFeature([E2eIamResourceVariableItemEntity]),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [{ policyId: "resource-variable-policy", principalId: PRINCIPAL.id, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes("resource-variable-policy") ? [{ document: { Statement: statements, Version: "2012-10-17" }, id: "resource-variable-policy", namespace: NAMESPACE, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
			],
			providers: [E2eIamResourceVariableItemService, E2eIamResourceVariableGuard],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
	}, 300_000);

	beforeEach(async () => {
		await repository().delete(ROWS.map((row: E2eIamResourceVariableItemEntity): string => row.id));
		await repository().save(ROWS);
	});

	afterAll(async () => {
		await app?.close();
		await container?.stop();
	});

	it.each(RESOURCE_VARIABLE_CASES)("refuses every route for %s", async (_name: string, policyStatements: Array<IApiPolicyStatement>) => {
		statements = policyStatements;

		expect(await listIds()).toEqual({ ids: [], statusCode: HttpStatus.FORBIDDEN });

		for (const row of ROWS) {
			expect({ row: row.id, statuses: await routeStatuses(row) }).toEqual({ row: row.id, statuses: { CUSTOM: HttpStatus.FORBIDDEN, DELETE: HttpStatus.FORBIDDEN, GET: HttpStatus.FORBIDDEN, PATCH: HttpStatus.FORBIDDEN } });
		}

		expect((await repository().find()).map((row: E2eIamResourceVariableItemEntity): string => row.id).sort()).toEqual(["other", "own"]);
	});

	it("serves every route under an Allow without a condition", async () => {
		statements = allow();

		expect(await listIds()).toEqual({ ids: ["other", "own"], statusCode: HttpStatus.OK });
		expect(await routeStatuses(ROWS[0]!)).toEqual({ CUSTOM: HttpStatus.OK, DELETE: HttpStatus.NO_CONTENT, GET: HttpStatus.OK, PATCH: HttpStatus.OK });
	});

	it("scopes rows by a resource key compared with a principal variable", async () => {
		statements = allow({ StringEquals: { "resource.tenantId": "${principal.attributes.tenantId}" } });

		expect(await listIds()).toEqual({ ids: ["own"], statusCode: HttpStatus.OK });
		expect((await fastify.inject({ method: "GET", url: `${URL}/other` })).statusCode).toBe(HttpStatus.NOT_FOUND);
		expect((await routeStatuses(ROWS[0]!)).GET).toBe(HttpStatus.OK);
	});

	it("excludes rows by a Deny on a resource key compared with a literal", async () => {
		statements = deny({ StringEquals: { "resource.tenantId": "t-2" } });

		expect(await listIds()).toEqual({ ids: ["own"], statusCode: HttpStatus.OK });
		expect((await fastify.inject({ method: "GET", url: `${URL}/other` })).statusCode).toBe(HttpStatus.NOT_FOUND);
		expect((await fastify.inject({ method: "GET", url: `${URL}/own` })).statusCode).toBe(HttpStatus.OK);
	});

	it("serves a principal key compared with a principal variable", async () => {
		statements = deny({ StringNotEquals: { "principal.attributes.tenantId": "${principal.attributes.tenantId}" } });

		expect(await listIds()).toEqual({ ids: ["other", "own"], statusCode: HttpStatus.OK });
		expect(await routeStatuses(ROWS[0]!)).toEqual({ CUSTOM: HttpStatus.OK, DELETE: HttpStatus.NO_CONTENT, GET: HttpStatus.OK, PATCH: HttpStatus.OK });
	});
});
