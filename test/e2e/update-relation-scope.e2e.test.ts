import "reflect-metadata";

import type { ExecutionContext, INestApplication, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { IApiAuthorizationPolicySubscriberContext, IApiAuthorizationRuleContext, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource, TApiFunctionUpdateProperties, TApiSubscriberFunctionBeforeUpdateContext } from "../../src/index";
import type { Relation, Repository } from "typeorm";

import { Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
	ApiAuthorizationModule,
	ApiAuthorizationPolicy,
	ApiAuthorizationPolicyBase,
	ApiController,
	ApiControllerSecurable,
	ApiFunctionSubscriber,
	ApiFunctionSubscriberBase,
	ApiPropertyDescribe,
	ApiService,
	ApiServiceBase,
	ApiServiceObservable,
	ApiSubscriberModule,
	AuthorizationResolveDefaultPrincipal,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	EApiFunctionTransactionMode,
	EApiFunctionType,
	EApiFunctionUpdatePersistenceMode,
	EApiPolicyEffect,
	EApiPolicySourceType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
} from "../../src/index";

const OWN_ID: string = "user-own";
const OTHER_ID: string = "user-other";
const FOREIGN_ID: string = "user-foreign";
const UNASSIGNED_ID: string = "user-unassigned";
const OPERATOR_FIRST: string = "operator-first";
const OPERATOR_SECOND: string = "operator-second";
const POLICY_ID: string = "relation-scope-policy";
const POLICY_NAMESPACE: string = "relation-scope:user";
const SCOPE_FORM_HEADER: string = "x-relation-scope-form";
const CONCURRENT_MOVE_NAME: string = "concurrent-move";
// The machine running the containers may be loaded, so a request gets more time than the default.
const TEST_TIMEOUT: number = 60_000;

type TDatabase = "mysql" | "postgres" | "sqlite";

const DATABASES: Array<{ database: TDatabase; databaseName: string }> = [
	{ database: "sqlite", databaseName: "SQLite" },
	{ database: "postgres", databaseName: "PostgreSQL" },
	{ database: "mysql", databaseName: "MySQL" },
];

const describeString: (description: string, exampleValue: string) => PropertyDecorator = (description: string, exampleValue: string): PropertyDecorator =>
	ApiPropertyDescribe({
		description,
		exampleValue,
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		type: EApiPropertyDescribeType.STRING,
	});

@Entity("relation_scope_operators")
class RelationScopeOperatorEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString("id", OPERATOR_FIRST)
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString("name", "Operator")
	public name!: string;
}

@Entity("relation_scope_users")
class RelationScopeUserEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString("id", OWN_ID)
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString("name", "User")
	public name!: string;

	@ApiPropertyDescribe({ description: "operator", type: EApiPropertyDescribeType.RELATION })
	@JoinColumn({ name: "operatorId" })
	@ManyToOne(() => RelationScopeOperatorEntity, { nullable: true })
	public operator?: null | Relation<RelationScopeOperatorEntity>;

	@Column({ length: 64, name: "operatorId", nullable: true, type: "varchar" })
	public operatorId?: null | string;
}

@Injectable()
@ApiServiceObservable()
@ApiService({
	entity: RelationScopeUserEntity,
	functions: { [EApiFunctionType.UPDATE]: { persistenceMode: EApiFunctionUpdatePersistenceMode.PATCH, transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } },
})
class RelationScopeUserPatchService extends ApiServiceBase<RelationScopeUserEntity> {
	@InjectRepository(RelationScopeUserEntity)
	public readonly repository!: Repository<RelationScopeUserEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: RelationScopeUserEntity })
class RelationScopeUserSaveService extends ApiServiceBase<RelationScopeUserEntity> {
	@InjectRepository(RelationScopeUserEntity)
	public readonly repository!: Repository<RelationScopeUserEntity>;
}

@Injectable()
@ApiFunctionSubscriber({ entity: RelationScopeUserEntity })
class RelationScopeUserFunctionSubscriber extends ApiFunctionSubscriberBase<RelationScopeUserEntity> {
	// A repository of the DataSource, outside the transaction of the update.
	public static outsideRepository: Repository<RelationScopeUserEntity> | undefined;

	// After the read and before the write, another writer moves the row out of the scope and commits.
	public async onBeforeUpdate(context: TApiSubscriberFunctionBeforeUpdateContext<RelationScopeUserEntity>): Promise<TApiFunctionUpdateProperties<RelationScopeUserEntity> | undefined> {
		if (context.result.name === CONCURRENT_MOVE_NAME) {
			await RelationScopeUserFunctionSubscriber.outsideRepository?.update({ id: context.DATA.currentEntity.id }, { operatorId: OPERATOR_SECOND });
		}

		return undefined;
	}
}

@Injectable()
class RelationScopeAuthGuard implements IAuthGuard {
	public canActivate(context: ExecutionContext): boolean {
		context.switchToHttp().getRequest<{ user?: unknown }>().user = { id: OWN_ID };

		return true;
	}

	public getAuthenticateOptions(): undefined {
		return undefined;
	}

	public getRequest<TRequest = any>(context: ExecutionContext): TRequest {
		return context.switchToHttp().getRequest();
	}

	public handleRequest<TUser = any>(_error: any, user: any): TUser {
		return user;
	}

	public async logIn(): Promise<void> {
		return Promise.resolve();
	}
}

@Injectable()
@ApiAuthorizationPolicy({ entity: RelationScopeUserEntity })
class RelationScopeUserPolicy extends ApiAuthorizationPolicyBase<RelationScopeUserEntity> {
	public onBeforePartialUpdate(context: IApiAuthorizationPolicySubscriberContext<RelationScopeUserEntity>) {
		return this.allowScope(context.headers?.[SCOPE_FORM_HEADER]);
	}

	public onBeforeUpdate(context: IApiAuthorizationPolicySubscriberContext<RelationScopeUserEntity>) {
		return this.allowScope(context.headers?.[SCOPE_FORM_HEADER]);
	}

	// The request picks the scope: rows whose operator is named "First" (default), or an OR of the own row and those rows.
	private allowScope(form: string | undefined) {
		return this.allow({
			scope: (ruleContext: IApiAuthorizationRuleContext<RelationScopeUserEntity>) => {
				const relationBranch = { operator: { name: "First" } };

				return form === "or" ? { where: [{ id: String(ruleContext.principal.id) }, relationBranch] } : { where: relationBranch };
			},
		} as never);
	}
}

const attachmentSource: IApiPolicyAttachmentSource = {
	async getAttachments() {
		return { attachments: [{ policyId: POLICY_ID, principalId: OWN_ID, principalType: EApiAuthorizationPrincipalType.USER }], boundaries: [] };
	},
};

const documentSource: IApiPolicyDocumentSource = {
	async getDocumentsByIds(ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> {
		return ids.includes(POLICY_ID)
			? [
					{
						document: {
							Statement: [{ Action: [`${POLICY_NAMESPACE}:update`], Condition: { StringEquals: { "resource.operatorName": "First" } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["relation-scope:user/*"] }],
							Version: "2026-03-14",
						},
						id: POLICY_ID,
						namespace: POLICY_NAMESPACE,
						sourceType: EApiPolicySourceType.MANAGED,
						version: "1",
					},
				]
			: [];
	},
};

interface IRelationScopeRoute {
	mode: EApiAuthorizationMode;
	path: string;
	persistence: EApiFunctionUpdatePersistenceMode;
	service: Type<ApiServiceBase<RelationScopeUserEntity>>;
}

const ROUTES: Array<IRelationScopeRoute> = [
	{ mode: EApiAuthorizationMode.HOOKS, path: "relation-scope-patch-hooks", persistence: EApiFunctionUpdatePersistenceMode.PATCH, service: RelationScopeUserPatchService },
	{ mode: EApiAuthorizationMode.HOOKS, path: "relation-scope-save-hooks", persistence: EApiFunctionUpdatePersistenceMode.SAVE, service: RelationScopeUserSaveService },
	{ mode: EApiAuthorizationMode.IAM, path: "relation-scope-patch-iam", persistence: EApiFunctionUpdatePersistenceMode.PATCH, service: RelationScopeUserPatchService },
	{ mode: EApiAuthorizationMode.IAM, path: "relation-scope-save-iam", persistence: EApiFunctionUpdatePersistenceMode.SAVE, service: RelationScopeUserSaveService },
];

/**
 * Builds a securable controller with generated update routes over one service.
 * @param {IRelationScopeRoute} route - Route path, authorization mode, and service.
 * @returns {Type<unknown>} The controller.
 */
function createController({ mode, path, service }: IRelationScopeRoute): Type<unknown> {
	const routeConfig = { security: { authentication: { guard: RelationScopeAuthGuard, type: EApiAuthenticationType.USER } } };

	class RelationScopeController {
		@Inject(service)
		public readonly service!: ApiServiceBase<RelationScopeUserEntity>;
	}

	// Every controller of one application needs its own class name, because the name starts its generated DTO names.
	Object.defineProperty(RelationScopeController, "name", { value: `${path.replaceAll(/-(\w)/gu, (_match: string, letter: string) => letter.toUpperCase())}Controller` });

	const controller = ApiController<RelationScopeUserEntity>({
		authorization: {
			defaultMode: mode,
			policyNamespace: POLICY_NAMESPACE,
			resourceDefinition: {
				entity: RelationScopeUserEntity,
				fields: [
					{ isFilterable: true, path: "resource.id", queryPath: "id" },
					{ isFilterable: true, path: "resource.operatorName", queryPath: "operator.name" },
				],
				namespace: POLICY_NAMESPACE,
				resourcePath: "relation-scope:user/{id}",
				resourceType: "relation-scope:user",
			},
		},
		entity: RelationScopeUserEntity,
		name: path,
		path,
		routes: {
			[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
			[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
			[EApiRouteType.GET]: { generation: { isEnabled: false } },
			[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
			[EApiRouteType.PARTIAL_UPDATE]: routeConfig,
			[EApiRouteType.UPDATE]: routeConfig,
		},
	} as never)(RelationScopeController);
	ApiControllerSecurable()(controller);

	return controller as Type<unknown>;
}

/**
 * Starts the database a describe block runs on.
 * @param {TDatabase} database - Database kind.
 * @returns {Promise<{ options: TypeOrmModuleOptions; stop: () => Promise<void> }>} Connection options and a stop function.
 */
async function startDatabase(database: TDatabase): Promise<{ options: TypeOrmModuleOptions; stop: () => Promise<void> }> {
	if (database === "postgres") {
		const container: StartedPostgreSqlContainer = await new PostgreSqlContainer("postgres:17-alpine").start();

		return { options: { type: "postgres", url: container.getConnectionUri() }, stop: async () => void (await container.stop()) };
	}

	if (database === "mysql") {
		const container: StartedMySqlContainer = await new MySqlContainer("mysql:8.4").start();

		return { options: { database: container.getDatabase(), host: container.getHost(), password: container.getUserPassword(), port: container.getPort(), type: "mysql", username: container.getUsername() }, stop: async () => void (await container.stop()) };
	}

	return { options: { database: ":memory:", type: "better-sqlite3" }, stop: async () => {} };
}

describe.each(DATABASES)("Generated update under a scope through a relation on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let app: INestApplication;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; payload?: unknown; url: string }) => Promise<{ body: string; json: () => unknown; statusCode: number }> };
	let repository: Repository<RelationScopeUserEntity>;
	let stop: () => Promise<void> = async () => {};

	beforeAll(async () => {
		const started: { options: TypeOrmModuleOptions; stop: () => Promise<void> } = await startDatabase(database);
		stop = started.stop;

		@Module({
			controllers: ROUTES.map((route: IRelationScopeRoute) => createController(route)),
			imports: [
				TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [RelationScopeOperatorEntity, RelationScopeUserEntity], logging: false, synchronize: true } as TypeOrmModuleOptions),
				TypeOrmModule.forFeature([RelationScopeOperatorEntity, RelationScopeUserEntity]),
				ApiAuthorizationModule.forRoot({
					iam: { attachmentSources: [attachmentSource], documentSources: [documentSource] },
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) },
				}),
				ApiSubscriberModule,
			],
			providers: [RelationScopeAuthGuard, RelationScopeUserFunctionSubscriber, RelationScopeUserPatchService, RelationScopeUserPolicy, RelationScopeUserSaveService],
		})
		class RelationScopeAppModule {}

		const moduleRef = await Test.createTestingModule({ imports: [RelationScopeAppModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		repository = app.get(getRepositoryToken(RelationScopeUserEntity));
		RelationScopeUserFunctionSubscriber.outsideRepository = repository;

		await app.get<Repository<RelationScopeOperatorEntity>>(getRepositoryToken(RelationScopeOperatorEntity)).save([
			{ id: OPERATOR_FIRST, name: "First" },
			{ id: OPERATOR_SECOND, name: "Second" },
		]);
	}, 600_000);

	beforeEach(async () => {
		await repository.createQueryBuilder().delete().execute();
		await repository.save([
			{ id: OWN_ID, name: "Original", operatorId: OPERATOR_SECOND },
			{ id: OTHER_ID, name: "Original", operatorId: OPERATOR_FIRST },
			{ id: FOREIGN_ID, name: "Original", operatorId: OPERATOR_SECOND },
			{ id: UNASSIGNED_ID, name: "Original", operatorId: null },
		]);
	}, TEST_TIMEOUT);

	afterAll(async () => {
		RelationScopeUserFunctionSubscriber.outsideRepository = undefined;
		await app?.close();
		await stop();
	}, 120_000);

	async function readStored(id: string): Promise<{ name?: string; operatorId?: null | string }> {
		const stored: null | RelationScopeUserEntity = await repository.findOneBy({ id });

		return { name: stored?.name, operatorId: stored?.operatorId };
	}

	describe.each(ROUTES)("$mode route in $persistence persistence ($path)", ({ path }: IRelationScopeRoute) => {
		it.each([["PATCH"], ["PUT"]])(
			"updates a row inside the scope through %s",
			async (method: string) => {
				const response = await fastify.inject({ method, payload: { name: "Changed" }, url: `/${path}/${OTHER_ID}` });

				expect(response.statusCode, response.body).toBe(200);
				expect(await readStored(OTHER_ID)).toEqual({ name: "Changed", operatorId: OPERATOR_FIRST });
			},
			TEST_TIMEOUT,
		);

		it.each([
			["whose relation names another row", FOREIGN_ID, OPERATOR_SECOND],
			["whose relation is null", UNASSIGNED_ID, null],
		])(
			"answers not found for a row %s, and leaves it unchanged",
			async (_case: string, id: string, operatorId: null | string) => {
				const response = await fastify.inject({ method: "PATCH", payload: { name: "Changed" }, url: `/${path}/${id}` });

				expect(response.statusCode, response.body).toBe(404);
				expect(response.json()).toEqual(expect.objectContaining({ message: "RELATIONSCOPEUSERENTITY_NOT_FOUND", statusCode: 404 }));
				expect(await readStored(id)).toEqual({ name: "Original", operatorId });
			},
			TEST_TIMEOUT,
		);

		it.each([
			["moves the relation to a row outside the scope", { name: "Changed", operator: OPERATOR_SECOND }],
			["clears the relation", { name: "Changed", operator: null }],
		])(
			"answers forbidden and rolls back a body that %s",
			async (_case: string, payload: Record<string, unknown>) => {
				const response = await fastify.inject({ method: "PATCH", payload, url: `/${path}/${OTHER_ID}` });

				expect(response.statusCode, response.body).toBe(403);
				expect(await readStored(OTHER_ID)).toEqual({ name: "Original", operatorId: OPERATOR_FIRST });
			},
			TEST_TIMEOUT,
		);

		it(
			"answers the reference error for a relation key that names no row, and leaves the row unchanged",
			async () => {
				const response = await fastify.inject({ method: "PATCH", payload: { operator: "missing" }, url: `/${path}/${OTHER_ID}` });

				expect(response.statusCode, response.body).toBe(400);
				expect(response.json()).toEqual(expect.objectContaining({ details: { type: "FOREIGN_KEY_VIOLATION" }, message: "RELATIONSCOPEUSERENTITY_REFERENCE_NOT_VALID", statusCode: 400 }));
				expect(await readStored(OTHER_ID)).toEqual({ name: "Original", operatorId: OPERATOR_FIRST });
			},
			TEST_TIMEOUT,
		);
	});

	describe.each(ROUTES.filter((route: IRelationScopeRoute) => route.mode === EApiAuthorizationMode.HOOKS))("HOOKS route with an OR of the own row and a relation in $persistence persistence ($path)", ({ path }: IRelationScopeRoute) => {
		const headers: Record<string, string> = { [SCOPE_FORM_HEADER]: "or" };

		it(
			"updates the own row through its own branch, clearing its relation too",
			async () => {
				const response = await fastify.inject({ headers, method: "PATCH", payload: { name: "Changed", operator: null }, url: `/${path}/${OWN_ID}` });

				expect(response.statusCode, response.body).toBe(200);
				expect(await readStored(OWN_ID)).toEqual({ name: "Changed", operatorId: null });
			},
			TEST_TIMEOUT,
		);

		it(
			"updates a row the relation branch reaches",
			async () => {
				const response = await fastify.inject({ headers, method: "PATCH", payload: { name: "Changed" }, url: `/${path}/${OTHER_ID}` });

				expect(response.statusCode, response.body).toBe(200);
				expect(await readStored(OTHER_ID)).toEqual({ name: "Changed", operatorId: OPERATOR_FIRST });
			},
			TEST_TIMEOUT,
		);

		it(
			"answers forbidden for a row the relation branch reaches when the body clears its relation",
			async () => {
				const response = await fastify.inject({ headers, method: "PATCH", payload: { operator: null }, url: `/${path}/${OTHER_ID}` });

				expect(response.statusCode, response.body).toBe(403);
				expect(await readStored(OTHER_ID)).toEqual({ name: "Original", operatorId: OPERATOR_FIRST });
			},
			TEST_TIMEOUT,
		);

		it(
			"answers not found for a row no branch reaches",
			async () => {
				const response = await fastify.inject({ headers, method: "PATCH", payload: { name: "Changed" }, url: `/${path}/${FOREIGN_ID}` });

				expect(response.statusCode, response.body).toBe(404);
				expect(await readStored(FOREIGN_ID)).toEqual({ name: "Original", operatorId: OPERATOR_SECOND });
			},
			TEST_TIMEOUT,
		);
	});

	it.each(ROUTES.filter((route: IRelationScopeRoute) => route.persistence === EApiFunctionUpdatePersistenceMode.PATCH).map((route: IRelationScopeRoute) => [route.path]))(
		"checks the scope again at the write in PATCH persistence: %s answers not found for a row another writer moved out of the scope after the read",
		async (path: string) => {
			const response = await fastify.inject({ method: "PATCH", payload: { name: CONCURRENT_MOVE_NAME }, url: `/${path}/${OTHER_ID}` });

			expect(response.statusCode, response.body).toBe(404);
			expect((await readStored(OTHER_ID)).name).toBe("Original");
		},
		TEST_TIMEOUT,
	);
});
