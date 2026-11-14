import "reflect-metadata";

import type { ExecutionContext, INestApplication, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { IApiAuthorizationPolicySubscriberContext, IApiAuthorizationRuleContext, IApiPolicyAttachmentSource, IApiPolicyDocumentRecord, IApiPolicyDocumentSource } from "../../src/index";
import type { HttpException } from "@nestjs/common";
import type { Relation, Repository } from "typeorm";

import { BadRequestException, Inject, Injectable, Module } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, Entity, Equal, In, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
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
const TENANT_OWN: string = "tenant-own";
const TENANT_FOREIGN: string = "tenant-foreign";
const OPERATOR_FIRST: string = "operator-first";
const OPERATOR_SECOND: string = "operator-second";
const POLICY_ID: string = "patch-persistence-policy";
const POLICY_NAMESPACE: string = "patch-persistence:user";
const SCOPE_FORM_HEADER: string = "x-patch-scope-form";

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

@Entity("patch_persistence_operators")
class PatchPersistenceOperatorEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString("id", OPERATOR_FIRST)
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString("name", "Operator")
	public name!: string;
}

@Entity("patch_persistence_users")
class PatchPersistenceUserEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString("id", OWN_ID)
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString("name", "User")
	public name!: string;

	@ApiPropertyDescribe({ description: "operator", type: EApiPropertyDescribeType.RELATION })
	@JoinColumn({ name: "operatorId" })
	@ManyToOne(() => PatchPersistenceOperatorEntity, { nullable: true })
	public operator?: null | Relation<PatchPersistenceOperatorEntity>;

	@Column({ length: 64, name: "operatorId", nullable: true, type: "varchar" })
	public operatorId?: null | string;

	@ApiPropertyDescribe({ description: "reviewer", type: EApiPropertyDescribeType.RELATION })
	@JoinColumn({ name: "reviewer_ref" })
	@ManyToOne(() => PatchPersistenceOperatorEntity, { nullable: true })
	public reviewer?: null | Relation<PatchPersistenceOperatorEntity>;

	// The database column name differs from the property name a null relation is written through.
	@Column({ length: 64, name: "reviewer_ref", nullable: true, type: "varchar" })
	public reviewerId?: null | string;

	@Column({ default: TENANT_OWN, length: 64, type: "varchar" })
	public tenantId!: string;
}

@Injectable()
@ApiServiceObservable()
@ApiService({
	entity: PatchPersistenceUserEntity,
	functions: { [EApiFunctionType.UPDATE]: { persistenceMode: EApiFunctionUpdatePersistenceMode.PATCH, transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } },
})
class PatchPersistenceUserPatchService extends ApiServiceBase<PatchPersistenceUserEntity> {
	@InjectRepository(PatchPersistenceUserEntity)
	public readonly repository!: Repository<PatchPersistenceUserEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({ entity: PatchPersistenceUserEntity })
class PatchPersistenceUserSaveService extends ApiServiceBase<PatchPersistenceUserEntity> {
	@InjectRepository(PatchPersistenceUserEntity)
	public readonly repository!: Repository<PatchPersistenceUserEntity>;
}

@Injectable()
@ApiFunctionSubscriber({ entity: PatchPersistenceUserEntity })
class PatchPersistenceUserFunctionSubscriber extends ApiFunctionSubscriberBase<PatchPersistenceUserEntity> {
	public static readonly updateErrors: Array<{ message: string; status: number | undefined }> = [];

	public async onAfterErrorUpdate(_context: object, error: Error): Promise<void> {
		PatchPersistenceUserFunctionSubscriber.updateErrors.push({ message: error.message, status: (error as Partial<HttpException>).getStatus?.() });

		return Promise.resolve();
	}
}

@Injectable()
class PatchPersistenceAuthGuard implements IAuthGuard {
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
@ApiAuthorizationPolicy({ entity: PatchPersistenceUserEntity })
class PatchPersistenceUserPolicy extends ApiAuthorizationPolicyBase<PatchPersistenceUserEntity> {
	public onBeforePartialUpdate(context: IApiAuthorizationPolicySubscriberContext<PatchPersistenceUserEntity>) {
		return this.allowScope(context.headers?.[SCOPE_FORM_HEADER]);
	}

	public onBeforeUpdate(context: IApiAuthorizationPolicySubscriberContext<PatchPersistenceUserEntity>) {
		return this.allowScope(context.headers?.[SCOPE_FORM_HEADER]);
	}

	// The request picks the form the scope is written in: a plain own-row value (default), an own-row operator, or an OR of the own row and the own tenant.
	private allowScope(form: string | undefined) {
		return this.allow({
			scope: (ruleContext: IApiAuthorizationRuleContext<PatchPersistenceUserEntity>) => {
				const principalId: string = String(ruleContext.principal.id);

				switch (form) {
					case "equal": {
						return { where: { id: Equal(principalId) } };
					}

					case "in": {
						return { where: { id: In([principalId]) } };
					}

					case "tenant": {
						return { where: [{ id: principalId }, { tenantId: TENANT_OWN }] };
					}

					default: {
						return { where: { id: principalId } };
					}
				}
			},
		});
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
							// eslint-disable-next-line no-template-curly-in-string
							Statement: [{ Action: [`${POLICY_NAMESPACE}:update`], Condition: { StringEquals: { "resource.id": "${principal.id}" } }, Effect: EApiPolicyEffect.ALLOW, Resource: ["patch-persistence:user/*"] }],
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

interface IPatchPersistenceRoute {
	mode: EApiAuthorizationMode;
	path: string;
	service: Type<ApiServiceBase<PatchPersistenceUserEntity>>;
}

const ROUTES: Array<IPatchPersistenceRoute> = [
	{ mode: EApiAuthorizationMode.HOOKS, path: "patch-persistence-hooks", service: PatchPersistenceUserPatchService },
	{ mode: EApiAuthorizationMode.IAM, path: "patch-persistence-iam", service: PatchPersistenceUserPatchService },
	{ mode: EApiAuthorizationMode.HOOKS, path: "save-persistence-hooks", service: PatchPersistenceUserSaveService },
	{ mode: EApiAuthorizationMode.IAM, path: "save-persistence-iam", service: PatchPersistenceUserSaveService },
];

/**
 * Builds a securable controller with generated update routes over one service.
 * @param {IPatchPersistenceRoute} route - Route path, authorization mode, and service.
 * @returns {Type<unknown>} The controller.
 */
function createController({ mode, path, service }: IPatchPersistenceRoute): Type<unknown> {
	const routeConfig = { security: { authentication: { guard: PatchPersistenceAuthGuard, type: EApiAuthenticationType.USER } } };

	class PatchPersistenceController {
		@Inject(service)
		public readonly service!: ApiServiceBase<PatchPersistenceUserEntity>;
	}

	// Every controller of one application needs its own class name, because the name starts its generated DTO names.
	Object.defineProperty(PatchPersistenceController, "name", { value: `${path.replaceAll(/-(\w)/gu, (_match: string, letter: string) => letter.toUpperCase())}Controller` });

	const controller = ApiController<PatchPersistenceUserEntity>({
		authorization: {
			defaultMode: mode,
			policyNamespace: POLICY_NAMESPACE,
			resourceDefinition: {
				entity: PatchPersistenceUserEntity,
				fields: [{ isFilterable: true, path: "resource.id", queryPath: "id" }],
				namespace: POLICY_NAMESPACE,
				resourcePath: "patch-persistence:user/{id}",
				resourceType: "patch-persistence:user",
			},
		},
		entity: PatchPersistenceUserEntity,
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
	} as never)(PatchPersistenceController);
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

describe.each(DATABASES)("Generated update in PATCH persistence on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let app: INestApplication;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; payload?: unknown; url: string }) => Promise<{ json: () => unknown; statusCode: number }> };
	let repository: Repository<PatchPersistenceUserEntity>;
	let stop: () => Promise<void> = async () => {};

	beforeAll(async () => {
		const started: { options: TypeOrmModuleOptions; stop: () => Promise<void> } = await startDatabase(database);
		stop = started.stop;

		@Module({
			controllers: ROUTES.map((route: IPatchPersistenceRoute) => createController(route)),
			imports: [
				TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [PatchPersistenceOperatorEntity, PatchPersistenceUserEntity], logging: false, synchronize: true } as TypeOrmModuleOptions),
				TypeOrmModule.forFeature([PatchPersistenceOperatorEntity, PatchPersistenceUserEntity]),
				ApiAuthorizationModule.forRoot({
					iam: { attachmentSources: [attachmentSource], documentSources: [documentSource] },
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user) },
				}),
				ApiSubscriberModule,
			],
			providers: [PatchPersistenceAuthGuard, PatchPersistenceUserFunctionSubscriber, PatchPersistenceUserPatchService, PatchPersistenceUserPolicy, PatchPersistenceUserSaveService],
		})
		class PatchPersistenceAppModule {}

		const moduleRef = await Test.createTestingModule({ imports: [PatchPersistenceAppModule] }).compile();

		app = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		repository = app.get(getRepositoryToken(PatchPersistenceUserEntity));

		await app.get<Repository<PatchPersistenceOperatorEntity>>(getRepositoryToken(PatchPersistenceOperatorEntity)).save([
			{ id: OPERATOR_FIRST, name: "First" },
			{ id: OPERATOR_SECOND, name: "Second" },
		]);
	}, 180_000);

	beforeEach(async () => {
		await repository.createQueryBuilder().delete().execute();
		await repository.save([
			{ id: OWN_ID, name: "Original", operatorId: OPERATOR_FIRST, reviewerId: OPERATOR_SECOND, tenantId: TENANT_OWN },
			{ id: OTHER_ID, name: "Original", operatorId: OPERATOR_FIRST, reviewerId: OPERATOR_SECOND, tenantId: TENANT_OWN },
			{ id: FOREIGN_ID, name: "Original", operatorId: OPERATOR_FIRST, reviewerId: OPERATOR_SECOND, tenantId: TENANT_FOREIGN },
		]);
		PatchPersistenceUserFunctionSubscriber.updateErrors.length = 0;
	});

	afterAll(async () => {
		await app?.close();
		await stop();
	}, 60_000);

	async function readStored(id: string): Promise<{ name?: string; operatorId?: null | string }> {
		const stored: null | PatchPersistenceUserEntity = await repository.findOneBy({ id });

		return { name: stored?.name, operatorId: stored?.operatorId };
	}

	describe.each(ROUTES.filter((route: IPatchPersistenceRoute) => route.service === PatchPersistenceUserPatchService))("$mode route $path", ({ mode, path }: IPatchPersistenceRoute) => {
		const savePath: string = mode === EApiAuthorizationMode.HOOKS ? "save-persistence-hooks" : "save-persistence-iam";

		it.each([
			["PATCH", { name: "Changed" }],
			["PUT", { name: "Changed" }],
		])("answers %s on a row outside the own-row scope with the not found SAVE answers, and leaves it unchanged", async (method: string, payload: Record<string, unknown>) => {
			const patchResponse = await fastify.inject({ method, payload, url: `/${path}/${OTHER_ID}` });
			const saveResponse = await fastify.inject({ method, payload, url: `/${savePath}/${OTHER_ID}` });

			expect(patchResponse.statusCode).toBe(404);
			expect(saveResponse.statusCode).toBe(404);
			expect(patchResponse.json()).toEqual(expect.objectContaining({ message: "PATCHPERSISTENCEUSERENTITY_NOT_FOUND", statusCode: 404 }));
			expect(saveResponse.json()).toEqual(expect.objectContaining({ message: "PATCHPERSISTENCEUSERENTITY_NOT_FOUND", statusCode: 404 }));
			expect(await readStored(OTHER_ID)).toEqual({ name: "Original", operatorId: OPERATOR_FIRST });
		});

		it("updates the own row", async () => {
			const response = await fastify.inject({ method: "PATCH", payload: { name: "Changed" }, url: `/${path}/${OWN_ID}` });

			expect(response.statusCode).toBe(200);
			expect(await readStored(OWN_ID)).toEqual({ name: "Changed", operatorId: OPERATOR_FIRST });
		});

		it("clears a nullable single-column relation sent as null and keeps the other columns", async () => {
			const response = await fastify.inject({ method: "PATCH", payload: { operator: null }, url: `/${path}/${OWN_ID}` });

			expect(response.statusCode).toBe(200);
			expect(await readStored(OWN_ID)).toEqual({ name: "Original", operatorId: null });
		});

		it("clears the relation together with another column, through PUT too", async () => {
			const response = await fastify.inject({ method: "PUT", payload: { name: "Changed", operator: null }, url: `/${path}/${OWN_ID}` });

			expect(response.statusCode).toBe(200);
			expect(await readStored(OWN_ID)).toEqual({ name: "Changed", operatorId: null });
		});

		it("still moves the relation to another row by its key", async () => {
			const response = await fastify.inject({ method: "PATCH", payload: { operator: OPERATOR_SECOND }, url: `/${path}/${OWN_ID}` });

			expect(response.statusCode).toBe(200);
			expect(await readStored(OWN_ID)).toEqual({ name: "Original", operatorId: OPERATOR_SECOND });
		});

		it("does not clear the relation of a row outside the scope", async () => {
			const response = await fastify.inject({ method: "PATCH", payload: { operator: null }, url: `/${path}/${OTHER_ID}` });

			expect(response.statusCode).toBe(404);
			expect(await readStored(OTHER_ID)).toEqual({ name: "Original", operatorId: OPERATOR_FIRST });
		});

		it("clears a relation whose join column has another database name than its property", async () => {
			const response = await fastify.inject({ method: "PATCH", payload: { reviewer: null }, url: `/${path}/${OWN_ID}` });

			expect(response.statusCode).toBe(200);
			expect((await repository.findOneBy({ id: OWN_ID }))?.reviewerId).toBeNull();
			expect(await readStored(OWN_ID)).toEqual({ name: "Original", operatorId: OPERATOR_FIRST });
		});

		it("runs the UPDATE after-error subscribers on the not found of a row outside the scope, as SAVE does", async () => {
			await fastify.inject({ method: "PATCH", payload: { name: "Changed" }, url: `/${path}/${OTHER_ID}` });
			const patchErrors: Array<{ message: string; status: number | undefined }> = PatchPersistenceUserFunctionSubscriber.updateErrors.splice(0);
			await fastify.inject({ method: "PATCH", payload: { name: "Changed" }, url: `/${savePath}/${OTHER_ID}` });
			const saveErrors: Array<{ message: string; status: number | undefined }> = PatchPersistenceUserFunctionSubscriber.updateErrors.splice(0);

			expect(patchErrors).toEqual([{ message: "PATCHPERSISTENCEUSERENTITY_NOT_FOUND", status: 404 }]);
			expect(patchErrors).toEqual(saveErrors);
		});
	});

	it.each([["equal"], ["in"]])("answers PATCH outside an own-row HOOKS scope written with the %s operator with not found, and updates the own row", async (form: string) => {
		const outsideResponse = await fastify.inject({ headers: { [SCOPE_FORM_HEADER]: form }, method: "PATCH", payload: { name: "Changed" }, url: `/patch-persistence-hooks/${OTHER_ID}` });

		expect(outsideResponse.statusCode).toBe(404);
		expect(outsideResponse.json()).toEqual(expect.objectContaining({ message: "PATCHPERSISTENCEUSERENTITY_NOT_FOUND", statusCode: 404 }));
		expect(await readStored(OTHER_ID)).toEqual({ name: "Original", operatorId: OPERATOR_FIRST });

		const ownResponse = await fastify.inject({ headers: { [SCOPE_FORM_HEADER]: form }, method: "PATCH", payload: { name: "Changed" }, url: `/patch-persistence-hooks/${OWN_ID}` });

		expect(ownResponse.statusCode).toBe(200);
		expect(await readStored(OWN_ID)).toEqual({ name: "Changed", operatorId: OPERATOR_FIRST });
	});

	it("updates a row the own-tenant branch of an OR scope reaches, and answers not found for a row of another tenant", async () => {
		const inTenantResponse = await fastify.inject({ headers: { [SCOPE_FORM_HEADER]: "tenant" }, method: "PATCH", payload: { name: "Changed" }, url: `/patch-persistence-hooks/${OTHER_ID}` });

		expect(inTenantResponse.statusCode).toBe(200);
		expect(await readStored(OTHER_ID)).toEqual({ name: "Changed", operatorId: OPERATOR_FIRST });

		const outOfTenantResponse = await fastify.inject({ headers: { [SCOPE_FORM_HEADER]: "tenant" }, method: "PATCH", payload: { name: "Changed" }, url: `/patch-persistence-hooks/${FOREIGN_ID}` });

		expect(outOfTenantResponse.statusCode).toBe(404);
		expect(outOfTenantResponse.json()).toEqual(expect.objectContaining({ message: "PATCHPERSISTENCEUSERENTITY_NOT_FOUND", statusCode: 404 }));
		expect(await readStored(FOREIGN_ID)).toEqual({ name: "Original", operatorId: OPERATOR_FIRST });
	});

	it("clears the relation in SAVE persistence as before", async () => {
		const response = await fastify.inject({ method: "PATCH", payload: { operator: null }, url: `/save-persistence-hooks/${OWN_ID}` });

		expect(response.statusCode).toBe(200);
		expect(await readStored(OWN_ID)).toEqual({ name: "Original", operatorId: null });
	});

	it("still refuses direct PATCH criteria without a complete primary equality", async () => {
		const service: PatchPersistenceUserPatchService = app.get(PatchPersistenceUserPatchService);

		await expect(service.update({ name: "Original" } as never, { name: "Changed" })).rejects.toThrow(new BadRequestException("PATCH requires a complete primary equality in every branch"));
		expect(await readStored(OWN_ID)).toEqual({ name: "Original", operatorId: OPERATOR_FIRST });
	});
});
