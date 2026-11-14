import "reflect-metadata";

import type { ExecutionContext, INestApplication } from "@nestjs/common";
import type { TypeOrmModuleOptions } from "@nestjs/typeorm";
import type { StartedMySqlContainer } from "@testcontainers/mysql";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { IApiAuthorizationPrincipal, IApiPolicyDocumentRecord, IApiPolicyStatement, IApiSubscriberFunctionErrorExecutionContext, IApiSubscriberFunctionExecutionContext, IApiSubscriberFunctionExecutionContextData, TApiFunctionDeleteCriteria, TApiFunctionGetProperties, TApiFunctionUpdateProperties, TApiSubscriberFunctionBeforeDeleteContext, TApiSubscriberFunctionBeforeUpdateContext } from "../../src/index";
import type { FindOptionsWhere, Logger, Relation, Repository } from "typeorm";

import { HttpStatus, Inject, Injectable, Param, RequestMethod } from "@nestjs/common";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import { getRepositoryToken, InjectRepository, TypeOrmModule } from "@nestjs/typeorm";
import { MySqlContainer } from "@testcontainers/mysql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DeleteDateColumn, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";

import {
	ApiAuthorizationModule,
	ApiController,
	ApiControllerSecurable,
	ApiFunctionSubscriber,
	ApiFunctionSubscriberBase,
	ApiPropertyCopy,
	ApiPropertyDescribe,
	ApiRouteCustom,
	ApiService,
	ApiServiceBase,
	ApiServiceObservable,
	ApiSubscriberModule,
	AuthorizationResolveDefaultPrincipal,
	EApiAuthenticationType,
	EApiAuthorizationMode,
	EApiAuthorizationPrincipalType,
	EApiDtoType,
	EApiFunctionTransactionMode,
	EApiFunctionType,
	EApiFunctionUpdatePersistenceMode,
	EApiPolicyEffect,
	EApiPolicySourceType,
	EApiPropertyDescribeType,
	EApiPropertyStringType,
	EApiRouteType,
} from "../../src/index";

const NAMESPACE: string = "write-condition:document";
const POLICY_ID: string = "write-condition-policy";
const USER: Record<string, unknown> = { id: "user-1", roles: ["editor"] };
const PRINCIPAL: IApiAuthorizationPrincipal = AuthorizationResolveDefaultPrincipal(USER);
const SECOND_USER_ID: string = "user-2";
// A request may name another user to act as.
const USER_HEADER: string = "x-user";
const OPERATOR_FIRST: string = "operator-first";
const OPERATOR_SECOND: string = "operator-second";
// Open and locked rows of the first operator, an open row of the second, and a spare open row of the first.
const OPEN_FIRST: string = "open-first";
const LOCKED_FIRST: string = "locked-first";
const OPEN_SECOND: string = "open-second";
const SPARE_FIRST: string = "spare-first";
const NOT_FOUND_MESSAGE: string = "WRITECONDITIONDOCUMENTENTITY_NOT_FOUND";
// The machine running the containers may be loaded, so a request gets more time than the default.
const TEST_TIMEOUT: number = 60_000;

// "empty-criteria" adds a condition and returns empty delete criteria; "soft-delete" adds a condition and soft-deletes the row right after the read; "barrier" holds a GET until a second request reaches it.
type TCondition = "barrier" | "capture" | "empty-criteria" | "none" | "relation" | "soft-delete" | "status";

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

@Entity("write_condition_operators")
class WriteConditionOperatorEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString("id", OPERATOR_FIRST)
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString("name", "Operator")
	public name!: string;
}

@Entity("write_condition_documents")
class WriteConditionDocumentEntity {
	@PrimaryColumn({ length: 64, type: "varchar" })
	@describeString("id", OPEN_FIRST)
	public id!: string;

	@Column({ length: 64, type: "varchar" })
	@describeString("name", "Document")
	public name!: string;

	@ApiPropertyDescribe({ description: "operator", type: EApiPropertyDescribeType.RELATION })
	@JoinColumn({ name: "operatorId" })
	@ManyToOne(() => WriteConditionOperatorEntity, { nullable: true })
	public operator?: null | Relation<WriteConditionOperatorEntity>;

	@Column({ length: 64, name: "operatorId", nullable: true, type: "varchar" })
	public operatorId?: null | string;

	@DeleteDateColumn({ name: "deletedAt", nullable: true })
	public deletedAt?: Date | null;

	@Column({ length: 64, type: "varchar" })
	@describeString("status", "open")
	public status!: string;
}

@Injectable()
@ApiServiceObservable()
@ApiService({
	entity: WriteConditionDocumentEntity,
	functions: {
		[EApiFunctionType.DELETE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } },
		[EApiFunctionType.UPDATE]: { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } },
	},
})
class WriteConditionSaveService extends ApiServiceBase<WriteConditionDocumentEntity> {
	@InjectRepository(WriteConditionDocumentEntity)
	public readonly repository!: Repository<WriteConditionDocumentEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({
	entity: WriteConditionDocumentEntity,
	functions: { [EApiFunctionType.UPDATE]: { persistenceMode: EApiFunctionUpdatePersistenceMode.PATCH, transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } },
})
class WriteConditionPatchService extends ApiServiceBase<WriteConditionDocumentEntity> {
	@InjectRepository(WriteConditionDocumentEntity)
	public readonly repository!: Repository<WriteConditionDocumentEntity>;
}

@Injectable()
@ApiServiceObservable()
@ApiService({
	entity: WriteConditionDocumentEntity,
	functions: {
		[EApiFunctionType.DELETE]: { transaction: { mode: EApiFunctionTransactionMode.SUPPORTS } },
		[EApiFunctionType.UPDATE]: { transaction: { mode: EApiFunctionTransactionMode.SUPPORTS } },
	},
})
class WriteConditionPlainService extends ApiServiceBase<WriteConditionDocumentEntity> {
	@InjectRepository(WriteConditionDocumentEntity)
	public readonly repository!: Repository<WriteConditionDocumentEntity>;
}

/**
 * What the function subscriber adds and what it saw, shared with the tests.
 */
class WriteConditionState {
	public static afterErrors: Array<{ function: string; message: string; status: number | undefined }> = [];

	public static captured: ((where: Array<FindOptionsWhere<WriteConditionDocumentEntity>> | FindOptionsWhere<WriteConditionDocumentEntity>) => void) | undefined;

	public static condition: TCondition = "none";

	public static gets: Array<{ phase: "after" | "before"; principalId: string | undefined; row: unknown }> = [];

	// A repository of the DataSource, outside the transaction of the write.
	public static outsideRepository: Repository<WriteConditionDocumentEntity> | undefined;

	public static principals: Array<{ function: string; principal: Readonly<IApiAuthorizationPrincipal> | undefined }> = [];

	public static reset(): void {
		WriteConditionState.afterErrors = [];
		WriteConditionState.captured = undefined;
		WriteConditionState.condition = "none";
		WriteConditionState.gets = [];
		WriteConditionState.principals = [];
		WriteConditionState.waiting = [];
	}

	// Lets a request pass once a second one waits too, so both are inside their functions at once; a lone request passes after a timeout.
	public static async meet(): Promise<void> {
		await new Promise<void>((resolve: () => void): void => {
			WriteConditionState.waiting.push(resolve);

			if (WriteConditionState.waiting.length >= 2) {
				for (const waiting of WriteConditionState.waiting.splice(0)) waiting();
			} else {
				setTimeout(resolve, 10_000);
			}
		});
	}

	private static waiting: Array<() => void> = [];
}

/**
 * Adds the condition the test picked to every update and delete, and records the principal and AFTER_ERROR calls.
 * @param {(where: FindOptionsWhere<WriteConditionDocumentEntity>) => void} addCondition - The context's `addCondition`.
 */
function addPickedCondition(addCondition: (where: Array<FindOptionsWhere<WriteConditionDocumentEntity>> | FindOptionsWhere<WriteConditionDocumentEntity>) => void): void {
	if (WriteConditionState.condition === "status" || WriteConditionState.condition === "empty-criteria" || WriteConditionState.condition === "soft-delete") addCondition({ status: "open" });

	if (WriteConditionState.condition === "relation") addCondition({ operator: { name: "First" } });

	if (WriteConditionState.condition === "capture") WriteConditionState.captured = addCondition;
}

@Injectable()
@ApiFunctionSubscriber({ entity: WriteConditionDocumentEntity })
class WriteConditionFunctionSubscriber extends ApiFunctionSubscriberBase<WriteConditionDocumentEntity> {
	public async onAfterErrorDelete(_context: IApiSubscriberFunctionErrorExecutionContext<WriteConditionDocumentEntity, IApiSubscriberFunctionExecutionContextData<WriteConditionDocumentEntity>>, error: Error): Promise<void> {
		WriteConditionState.afterErrors.push({ function: "delete", message: error.message, status: (error as { getStatus?: () => number }).getStatus?.() });
	}

	public async onAfterErrorUpdate(_context: IApiSubscriberFunctionErrorExecutionContext<WriteConditionDocumentEntity, IApiSubscriberFunctionExecutionContextData<WriteConditionDocumentEntity>>, error: Error): Promise<void> {
		WriteConditionState.afterErrors.push({ function: "update", message: error.message, status: (error as { getStatus?: () => number }).getStatus?.() });
	}

	public async onBeforeDelete(context: TApiSubscriberFunctionBeforeDeleteContext<WriteConditionDocumentEntity>): Promise<TApiFunctionDeleteCriteria<WriteConditionDocumentEntity> | undefined> {
		WriteConditionState.principals.push({ function: "delete", principal: context.DATA.principal });
		addPickedCondition(context.DATA.addCondition);

		// An empty result replaces the criteria, so only the condition could make the delete address a row.
		return WriteConditionState.condition === "empty-criteria" ? {} : undefined;
	}

	// Right after the read of an update or delete, another writer soft-deletes the row and commits.
	public async onAfterGet(context: IApiSubscriberFunctionExecutionContext<WriteConditionDocumentEntity, WriteConditionDocumentEntity, IApiSubscriberFunctionExecutionContextData<WriteConditionDocumentEntity>>): Promise<WriteConditionDocumentEntity | undefined> {
		if (WriteConditionState.condition === "soft-delete") await WriteConditionState.outsideRepository?.softDelete({ id: context.result.id });

		// Built after both requests passed the barrier, so its principal is read again from the request it runs in.
		if (WriteConditionState.condition === "barrier") WriteConditionState.gets.push({ phase: "after", principalId: context.DATA.principal?.id, row: context.result.id });

		return undefined;
	}

	public async onBeforeGet(context: IApiSubscriberFunctionExecutionContext<WriteConditionDocumentEntity, TApiFunctionGetProperties<WriteConditionDocumentEntity>, IApiSubscriberFunctionExecutionContextData<WriteConditionDocumentEntity>>): Promise<TApiFunctionGetProperties<WriteConditionDocumentEntity> | undefined> {
		WriteConditionState.principals.push({ function: "get", principal: context.DATA.principal });

		if (WriteConditionState.condition === "barrier") {
			const row: unknown = (context.result.where as { id?: unknown } | undefined)?.id;
			WriteConditionState.gets.push({ phase: "before", principalId: context.DATA.principal?.id, row });
			await WriteConditionState.meet();
		}

		return undefined;
	}

	public async onBeforeUpdate(context: TApiSubscriberFunctionBeforeUpdateContext<WriteConditionDocumentEntity>): Promise<TApiFunctionUpdateProperties<WriteConditionDocumentEntity> | undefined> {
		WriteConditionState.principals.push({ function: "update", principal: context.DATA.principal });
		addPickedCondition(context.DATA.addCondition);

		return undefined;
	}
}

/**
 * Records the SQL a request runs while recording is on.
 */
class WriteConditionQueryRecorder implements Logger {
	public static isRecording: boolean = false;

	public static queries: Array<string> = [];

	public log(): void {}

	public logMigration(): void {}

	public logQuery(query: string): void {
		if (WriteConditionQueryRecorder.isRecording) WriteConditionQueryRecorder.queries.push(query);
	}

	public logQueryError(): void {}

	public logQuerySlow(): void {}

	public logSchemaBuild(): void {}
}

/**
 * Authenticates every request as the one test user.
 */
@Injectable()
class WriteConditionGuard {
	public canActivate(context: ExecutionContext): boolean {
		const request: { headers: Record<string, string | undefined>; user?: unknown } = context.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: unknown }>();
		request.user = { ...USER, id: request.headers[USER_HEADER] ?? USER.id };

		return true;
	}
}

const authentication = { guard: WriteConditionGuard, type: EApiAuthenticationType.USER } as never;
const disabled = { generation: { isEnabled: false } } as const;
const secured = { security: { authentication } } as const;

const AUTHORIZATION = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: NAMESPACE,
	resourceDefinition: {
		entity: WriteConditionDocumentEntity,
		fields: [
			{ isFilterable: true, path: "resource.id", queryPath: "id" },
			{ isFilterable: true, path: "resource.operatorName", queryPath: "operator.name" },
			{ isFilterable: true, path: "resource.status", queryPath: "status" },
		],
		namespace: NAMESPACE,
		resourcePath: `${NAMESPACE}/{id}`,
		resourceType: NAMESPACE,
	},
};

/**
 * Path parameters of the custom inspect route, copied from the entity column so the resource path renders the row id.
 */
class WriteConditionInspectParametersDto {
	@ApiPropertyCopy({ dtoType: EApiDtoType.PARAMETERS, entity: (): typeof WriteConditionDocumentEntity => WriteConditionDocumentEntity, method: EApiRouteType.GET, propertyName: "id" })
	public id!: string;
}

@ApiControllerSecurable()
@ApiController<WriteConditionDocumentEntity>({
	authorization: AUTHORIZATION as never,
	entity: WriteConditionDocumentEntity,
	name: "WriteConditionSave",
	path: "write-condition-save",
	routes: {
		[EApiRouteType.CREATE]: disabled,
		[EApiRouteType.DELETE]: secured,
		[EApiRouteType.GET]: disabled,
		[EApiRouteType.GET_LIST]: disabled,
		[EApiRouteType.PARTIAL_UPDATE]: secured,
		[EApiRouteType.UPDATE]: disabled,
	} as never,
})
class WriteConditionSaveController {
	@Inject(WriteConditionSaveService)
	public readonly service!: WriteConditionSaveService;

	// A custom route whose handler calls a generated function of the service.
	@ApiRouteCustom<WriteConditionDocumentEntity>({ dto: { [EApiDtoType.PARAMETERS]: WriteConditionInspectParametersDto }, resource: { action: "custom.inspect", entity: WriteConditionDocumentEntity }, response: { status: HttpStatus.OK, type: undefined }, route: { method: RequestMethod.POST, path: "inspect/:id" }, security: { authentication } } as never)
	public async inspect(@Param("id") id: string): Promise<{ id: string }> {
		const document: WriteConditionDocumentEntity = await this.service.get({ where: { id } });

		return { id: document.id };
	}
}

@ApiControllerSecurable()
@ApiController<WriteConditionDocumentEntity>({
	authorization: AUTHORIZATION as never,
	entity: WriteConditionDocumentEntity,
	name: "WriteConditionPatch",
	path: "write-condition-patch",
	routes: {
		[EApiRouteType.CREATE]: disabled,
		[EApiRouteType.DELETE]: disabled,
		[EApiRouteType.GET]: disabled,
		[EApiRouteType.GET_LIST]: disabled,
		[EApiRouteType.PARTIAL_UPDATE]: secured,
		[EApiRouteType.UPDATE]: disabled,
	} as never,
})
class WriteConditionPatchController {
	@Inject(WriteConditionPatchService)
	public readonly service!: WriteConditionPatchService;
}

// Every route of the namespace is allowed; the scoped form keeps only rows of the operator named "First".
const ALLOW_ALL: Array<IApiPolicyStatement> = [{ Action: [`${NAMESPACE}:*`], Effect: EApiPolicyEffect.ALLOW, Resource: [`${NAMESPACE}/*`] }];
const ALLOW_FIRST_OPERATOR: Array<IApiPolicyStatement> = [{ Action: [`${NAMESPACE}:*`], Condition: { StringEquals: { "resource.operatorName": "First" } }, Effect: EApiPolicyEffect.ALLOW, Resource: [`${NAMESPACE}/*`] }];

const UPDATE_ROUTES: Array<{ path: string; persistence: string }> = [
	{ path: "write-condition-save", persistence: "SAVE" },
	{ path: "write-condition-patch", persistence: "PATCH" },
];

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

describe.each(DATABASES)("Write conditions and the request principal of function subscribers on $databaseName (E2E)", ({ database }: { database: TDatabase; databaseName: string }) => {
	let app: INestApplication;
	let fastify: { inject: (options: { headers?: Record<string, string>; method: string; payload?: unknown; url: string }) => Promise<{ body: string; json: () => unknown; statusCode: number }> };
	let repository: Repository<WriteConditionDocumentEntity>;
	let statements: Array<IApiPolicyStatement> = ALLOW_ALL;
	let stop: () => Promise<void> = async () => {};

	beforeAll(async () => {
		const started: { options: TypeOrmModuleOptions; stop: () => Promise<void> } = await startDatabase(database);
		stop = started.stop;

		const moduleReference = await Test.createTestingModule({
			controllers: [WriteConditionSaveController, WriteConditionPatchController],
			imports: [
				TypeOrmModule.forRoot({ ...started.options, dropSchema: true, entities: [WriteConditionOperatorEntity, WriteConditionDocumentEntity], logger: new WriteConditionQueryRecorder(), synchronize: true } as TypeOrmModuleOptions),
				TypeOrmModule.forFeature([WriteConditionOperatorEntity, WriteConditionDocumentEntity]),
				ApiAuthorizationModule.forRoot({
					iam: {
						attachmentSources: [{ getAttachments: async () => await Promise.resolve({ attachments: [PRINCIPAL.id, SECOND_USER_ID].map((principalId: string) => ({ policyId: POLICY_ID, principalId, principalType: EApiAuthorizationPrincipalType.USER })), boundaries: [] }) }],
						documentSources: [
							{
								getDocumentsByIds: async (ids: ReadonlyArray<string>): Promise<ReadonlyArray<IApiPolicyDocumentRecord>> => await Promise.resolve(ids.includes(POLICY_ID) ? [{ document: { Statement: statements, Version: "2012-10-17" }, id: POLICY_ID, namespace: NAMESPACE, sourceType: EApiPolicySourceType.DATABASE, version: "1" }] : []),
							},
						],
					},
					principalResolver: { resolve: (user: unknown) => AuthorizationResolveDefaultPrincipal(user as never) },
				} as never),
				ApiSubscriberModule,
			],
			providers: [WriteConditionFunctionSubscriber, WriteConditionGuard, WriteConditionPatchService, WriteConditionPlainService, WriteConditionSaveService],
		}).compile();

		app = moduleReference.createNestApplication(new FastifyAdapter(), { logger: false });
		await app.init();
		fastify = app.getHttpAdapter().getInstance();
		repository = app.get(getRepositoryToken(WriteConditionDocumentEntity));
		WriteConditionState.outsideRepository = repository;

		await app.get<Repository<WriteConditionOperatorEntity>>(getRepositoryToken(WriteConditionOperatorEntity)).save([
			{ id: OPERATOR_FIRST, name: "First" },
			{ id: OPERATOR_SECOND, name: "Second" },
		]);
	}, 600_000);

	beforeEach(async () => {
		WriteConditionState.reset();
		WriteConditionQueryRecorder.isRecording = false;
		WriteConditionQueryRecorder.queries = [];
		statements = ALLOW_ALL;
		await repository.createQueryBuilder().delete().execute();
		await repository.save([
			{ id: OPEN_FIRST, name: "Original", operatorId: OPERATOR_FIRST, status: "open" },
			{ id: LOCKED_FIRST, name: "Original", operatorId: OPERATOR_FIRST, status: "locked" },
			{ id: OPEN_SECOND, name: "Original", operatorId: OPERATOR_SECOND, status: "open" },
			{ id: SPARE_FIRST, name: "Original", operatorId: OPERATOR_FIRST, status: "open" },
		]);
	}, TEST_TIMEOUT);

	afterAll(async () => {
		await app?.close();
		await stop();
	}, 120_000);

	async function readName(id: string): Promise<string | undefined> {
		return (await repository.findOne({ where: { id }, withDeleted: true }))?.name;
	}

	async function recordQueries(request: () => Promise<unknown>): Promise<Array<string>> {
		WriteConditionQueryRecorder.queries = [];
		WriteConditionQueryRecorder.isRecording = true;

		try {
			await request();
		} finally {
			WriteConditionQueryRecorder.isRecording = false;
		}

		return WriteConditionQueryRecorder.queries;
	}

	function expectConditionMiss(response: { body: string; json: () => unknown; statusCode: number }, functionName: string): void {
		expect(response.statusCode, response.body).toBe(404);
		expect(response.json()).toEqual(expect.objectContaining({ message: NOT_FOUND_MESSAGE, statusCode: 404 }));
		expect(WriteConditionState.afterErrors).toEqual([expect.objectContaining({ function: functionName, status: 404 })]);
	}

	describe.each(UPDATE_ROUTES)("update in $persistence persistence ($path)", ({ path }: { path: string; persistence: string }) => {
		const patch = async (id: string): Promise<{ body: string; json: () => unknown; statusCode: number }> => await fastify.inject({ method: "PATCH", payload: { name: "Changed" }, url: `/${path}/${id}` });

		it(
			"writes a row the condition keeps",
			async () => {
				WriteConditionState.condition = "status";
				const response = await patch(OPEN_FIRST);

				expect(response.statusCode, response.body).toBe(200);
				expect(await readName(OPEN_FIRST)).toBe("Changed");
				expect(WriteConditionState.afterErrors).toEqual([]);
			},
			TEST_TIMEOUT,
		);

		it(
			"answers not found through AFTER_ERROR for a row the condition excludes, and leaves it unchanged",
			async () => {
				WriteConditionState.condition = "status";

				expectConditionMiss(await patch(LOCKED_FIRST), "update");
				expect(await readName(LOCKED_FIRST)).toBe("Original");
			},
			TEST_TIMEOUT,
		);

		it(
			"checks a condition through a relation",
			async () => {
				WriteConditionState.condition = "relation";

				expect((await patch(OPEN_FIRST)).statusCode).toBe(200);
				WriteConditionState.afterErrors = [];
				expectConditionMiss(await patch(OPEN_SECOND), "update");
				expect(await readName(OPEN_FIRST)).toBe("Changed");
				expect(await readName(OPEN_SECOND)).toBe("Original");
			},
			TEST_TIMEOUT,
		);

		it(
			"ANDs the condition with the authorization scope, never widening either, and answers a miss of each alike",
			async () => {
				statements = ALLOW_FIRST_OPERATOR;
				WriteConditionState.condition = "status";

				expect((await patch(OPEN_FIRST)).statusCode).toBe(200);
				WriteConditionState.afterErrors = [];
				// The scope keeps this row; the condition excludes it.
				const conditionMiss = await patch(LOCKED_FIRST);
				expectConditionMiss(conditionMiss, "update");
				WriteConditionState.afterErrors = [];
				// The condition keeps this row; the scope excludes it.
				const scopeMiss = await patch(OPEN_SECOND);
				expectConditionMiss(scopeMiss, "update");
				expect(conditionMiss.json()).toEqual(scopeMiss.json());
				expect(await readName(LOCKED_FIRST)).toBe("Original");
				expect(await readName(OPEN_SECOND)).toBe("Original");
			},
			TEST_TIMEOUT,
		);
	});

	describe("delete", () => {
		const remove = async (id: string): Promise<{ body: string; json: () => unknown; statusCode: number }> => await fastify.inject({ method: "DELETE", url: `/write-condition-save/${id}` });

		it(
			"removes a row the condition keeps",
			async () => {
				WriteConditionState.condition = "status";
				const response = await remove(OPEN_FIRST);

				expect(response.statusCode, response.body).toBe(HttpStatus.NO_CONTENT);
				expect(await repository.existsBy({ id: OPEN_FIRST })).toBe(false);
				expect(WriteConditionState.afterErrors).toEqual([]);
			},
			TEST_TIMEOUT,
		);

		it(
			"answers not found through AFTER_ERROR for a row the condition excludes, and keeps it",
			async () => {
				WriteConditionState.condition = "status";

				expectConditionMiss(await remove(LOCKED_FIRST), "delete");
				expect(await repository.existsBy({ id: LOCKED_FIRST })).toBe(true);
			},
			TEST_TIMEOUT,
		);

		it(
			"checks a condition through a relation",
			async () => {
				WriteConditionState.condition = "relation";

				expect((await remove(OPEN_FIRST)).statusCode).toBe(HttpStatus.NO_CONTENT);
				WriteConditionState.afterErrors = [];
				expectConditionMiss(await remove(OPEN_SECOND), "delete");
				expect(await repository.existsBy({ id: OPEN_SECOND })).toBe(true);
			},
			TEST_TIMEOUT,
		);

		it(
			"ANDs the condition with the authorization scope, never widening either, and answers a miss of each alike",
			async () => {
				statements = ALLOW_FIRST_OPERATOR;
				WriteConditionState.condition = "status";

				expect((await remove(OPEN_FIRST)).statusCode).toBe(HttpStatus.NO_CONTENT);
				WriteConditionState.afterErrors = [];
				const conditionMiss = await remove(LOCKED_FIRST);
				expectConditionMiss(conditionMiss, "delete");
				WriteConditionState.afterErrors = [];
				const scopeMiss = await remove(OPEN_SECOND);
				expectConditionMiss(scopeMiss, "delete");
				expect(conditionMiss.json()).toEqual(scopeMiss.json());
				expect(await repository.existsBy({ id: LOCKED_FIRST })).toBe(true);
				expect(await repository.existsBy({ id: OPEN_SECOND })).toBe(true);
			},
			TEST_TIMEOUT,
		);
	});

	// On the drivers that lock, the check is a locking read: FOR UPDATE, and FOR UPDATE OF the entity on PostgreSQL.
	function expectRowLock(queries: Array<string>): void {
		if (database === "sqlite") return;

		expect(
			queries.some((query: string) => (database === "postgres" ? /for update of/iu : /for update/iu).test(query)),
			queries.join("\n"),
		).toBe(true);
	}

	describe("cost", () => {
		// The SAVE write and the remove address the row by its key, so a condition costs one locking read; PATCH puts it in the UPDATE itself.
		it(
			"adds one read to a SAVE update only when a condition is added, and none without one",
			async () => {
				const withoutCondition: Array<string> = await recordQueries(async () => await fastify.inject({ method: "PATCH", payload: { name: "First write" }, url: `/write-condition-save/${OPEN_FIRST}` }));
				WriteConditionState.condition = "status";
				const withCondition: Array<string> = await recordQueries(async () => await fastify.inject({ method: "PATCH", payload: { name: "Second write" }, url: `/write-condition-save/${OPEN_FIRST}` }));

				expect(await readName(OPEN_FIRST)).toBe("Second write");
				expect(withCondition.length, withCondition.join("\n")).toBe(withoutCondition.length + 1);
				expectRowLock(withCondition);
				expect(
					withoutCondition.some((query: string) => /for update/iu.test(query)),
					withoutCondition.join("\n"),
				).toBe(false);
			},
			TEST_TIMEOUT,
		);

		it(
			"adds no query to a PATCH update with a condition on the row's own columns",
			async () => {
				const withoutCondition: Array<string> = await recordQueries(async () => await fastify.inject({ method: "PATCH", payload: { name: "First write" }, url: `/write-condition-patch/${OPEN_FIRST}` }));
				WriteConditionState.condition = "status";
				const withCondition: Array<string> = await recordQueries(async () => await fastify.inject({ method: "PATCH", payload: { name: "Second write" }, url: `/write-condition-patch/${OPEN_FIRST}` }));

				expect(await readName(OPEN_FIRST)).toBe("Second write");
				expect(withCondition.length, withCondition.join("\n")).toBe(withoutCondition.length);
				expect(
					withoutCondition.some((query: string) => /for update/iu.test(query)),
					withoutCondition.join("\n"),
				).toBe(false);
			},
			TEST_TIMEOUT,
		);

		it(
			"adds one read to a delete only when a condition is added, and none without one",
			async () => {
				const withoutCondition: Array<string> = await recordQueries(async () => await fastify.inject({ method: "DELETE", url: `/write-condition-save/${OPEN_FIRST}` }));
				WriteConditionState.condition = "status";
				const withCondition: Array<string> = await recordQueries(async () => await fastify.inject({ method: "DELETE", url: `/write-condition-save/${SPARE_FIRST}` }));

				expect(await repository.existsBy({ id: SPARE_FIRST })).toBe(false);
				expect(withCondition.length, withCondition.join("\n")).toBe(withoutCondition.length + 1);
				expectRowLock(withCondition);
				expect(
					withoutCondition.some((query: string) => /for update/iu.test(query)),
					withoutCondition.join("\n"),
				).toBe(false);
			},
			TEST_TIMEOUT,
		);
	});

	describe("locking read of a PATCH condition through a relation", () => {
		it(
			"locks the row only when a condition reads another table",
			async () => {
				const withoutCondition: Array<string> = await recordQueries(async () => await fastify.inject({ method: "PATCH", payload: { name: "First write" }, url: `/write-condition-patch/${OPEN_FIRST}` }));
				WriteConditionState.condition = "relation";
				const withCondition: Array<string> = await recordQueries(async () => await fastify.inject({ method: "PATCH", payload: { name: "Second write" }, url: `/write-condition-patch/${OPEN_FIRST}` }));

				expect(await readName(OPEN_FIRST)).toBe("Second write");
				expect(withoutCondition.some((query: string) => /for update/iu.test(query))).toBe(false);
				expectRowLock(withCondition);
			},
			TEST_TIMEOUT,
		);
	});

	describe("criteria a condition must not complete", () => {
		async function expectNothingChanged(): Promise<void> {
			const rows: Array<WriteConditionDocumentEntity> = await repository.find({ order: { id: "ASC" }, withDeleted: true });

			expect(rows.map((row: WriteConditionDocumentEntity) => [row.id, row.name, row.deletedAt ?? null])).toEqual([
				[LOCKED_FIRST, "Original", null],
				[OPEN_FIRST, "Original", null],
				[OPEN_SECOND, "Original", null],
				[SPARE_FIRST, "Original", null],
			]);
		}

		it(
			"refuses a delete with empty criteria although a condition was added",
			async () => {
				WriteConditionState.condition = "status";

				await expect(app.get(WriteConditionSaveService).delete({})).rejects.toThrow("WRITECONDITIONDOCUMENTENTITY_DELETING_ERROR");
				await expectNothingChanged();
			},
			TEST_TIMEOUT,
		);

		it(
			"refuses a delete whose BEFORE subscriber empties the criteria and adds a condition",
			async () => {
				WriteConditionState.condition = "empty-criteria";

				await expect(app.get(WriteConditionSaveService).delete({ id: OPEN_FIRST })).rejects.toThrow("WRITECONDITIONDOCUMENTENTITY_DELETING_ERROR");
				await expectNothingChanged();
			},
			TEST_TIMEOUT,
		);

		it.each([
			["SAVE", WriteConditionSaveService],
			["PATCH", WriteConditionPatchService],
		])(
			"refuses a %s update with empty criteria although a condition would be added",
			async (_persistence: string, service: typeof WriteConditionPatchService | typeof WriteConditionSaveService) => {
				WriteConditionState.condition = "status";

				await expect(app.get<WriteConditionPatchService | WriteConditionSaveService>(service).update({}, { name: "Changed" })).rejects.toThrow();
				await expectNothingChanged();
			},
			TEST_TIMEOUT,
		);
	});

	describe("a soft delete by another writer between the read and the write", () => {
		it.each(UPDATE_ROUTES)(
			"answers not found for an update in $persistence persistence, and leaves the row unchanged",
			async ({ path }: { path: string; persistence: string }) => {
				WriteConditionState.condition = "soft-delete";

				expectConditionMiss(await fastify.inject({ method: "PATCH", payload: { name: "Changed" }, url: `/${path}/${OPEN_FIRST}` }), "update");
				expect(await readName(OPEN_FIRST)).toBe("Original");
			},
			TEST_TIMEOUT,
		);

		it(
			"answers not found for a delete, and keeps the row",
			async () => {
				WriteConditionState.condition = "soft-delete";

				expectConditionMiss(await fastify.inject({ method: "DELETE", url: `/write-condition-save/${OPEN_FIRST}` }), "delete");
				expect(await repository.exists({ where: { id: OPEN_FIRST }, withDeleted: true })).toBe(true);
			},
			TEST_TIMEOUT,
		);
	});

	describe("strict rules of addCondition", () => {
		it.each([
			["update", async (service: WriteConditionPlainService) => await service.update({ id: OPEN_FIRST }, { name: "Changed" })],
			["delete", async (service: WriteConditionPlainService) => await service.delete({ id: OPEN_FIRST })],
		])(
			"refuses a condition on a %s that runs without a transaction, naming the function",
			async (functionName: string, call: (service: WriteConditionPlainService) => Promise<unknown>) => {
				WriteConditionState.condition = "status";

				await expect(call(app.get(WriteConditionPlainService))).rejects.toThrow(`[NestJS-Crud-Automator] Function "WriteConditionPlainService.${functionName}" needs a transaction to add a write condition: configure its transaction mode as REQUIRED`);
				expect(await readName(OPEN_FIRST)).toBe("Original");
			},
			TEST_TIMEOUT,
		);

		it(
			"refuses a condition added after the BEFORE subscribers have run",
			async () => {
				WriteConditionState.condition = "capture";

				expect((await fastify.inject({ method: "PATCH", payload: { name: "Changed" }, url: `/write-condition-save/${OPEN_FIRST}` })).statusCode).toBe(200);
				expect(() => WriteConditionState.captured?.({ status: "open" })).toThrow(`[NestJS-Crud-Automator] Function "WriteConditionSaveService.update" accepts write conditions only while its BEFORE subscribers run`);
			},
			TEST_TIMEOUT,
		);
	});

	describe("principal", () => {
		function principalsOf(functionName: string): Array<Readonly<IApiAuthorizationPrincipal> | undefined> {
			return WriteConditionState.principals.filter((entry: { function: string }) => entry.function === functionName).map((entry: { principal: Readonly<IApiAuthorizationPrincipal> | undefined }) => entry.principal);
		}

		it(
			"carries the deep-frozen principal of a generated route to the function and the read it runs",
			async () => {
				expect((await fastify.inject({ method: "PATCH", payload: { name: "Changed" }, url: `/write-condition-save/${OPEN_FIRST}` })).statusCode).toBe(200);
				const [principal] = principalsOf("update");

				expect(principal).toEqual(expect.objectContaining({ id: PRINCIPAL.id, roles: ["editor"] }));
				expect(Object.isFrozen(principal)).toBe(true);
				expect(Object.isFrozen(principal?.roles)).toBe(true);
				expect(Object.isFrozen(principal?.attributes)).toBe(true);
				// The update reads the row through its generated GET, which runs in the same request.
				expect(principalsOf("get").length).toBeGreaterThan(0);
				expect(principalsOf("get").every((entry: Readonly<IApiAuthorizationPrincipal> | undefined) => entry === principal)).toBe(true);
			},
			TEST_TIMEOUT,
		);

		it(
			"carries the principal of an @ApiRouteCustom route to the functions its handler calls",
			async () => {
				const response = await fastify.inject({ method: "POST", url: `/write-condition-save/inspect/${OPEN_FIRST}` });

				expect(response.statusCode, response.body).toBe(200);
				expect(principalsOf("get")).toEqual([expect.objectContaining({ id: PRINCIPAL.id })]);
			},
			TEST_TIMEOUT,
		);

		it(
			"keeps the principals of two concurrent requests apart",
			async () => {
				WriteConditionState.condition = "barrier";

				const responses = await Promise.all([fastify.inject({ headers: { [USER_HEADER]: PRINCIPAL.id }, method: "POST", url: `/write-condition-save/inspect/${OPEN_FIRST}` }), fastify.inject({ headers: { [USER_HEADER]: SECOND_USER_ID }, method: "POST", url: `/write-condition-save/inspect/${OPEN_SECOND}` })]);

				expect(responses.map((response: { statusCode: number }) => response.statusCode)).toEqual([200, 200]);
				// Both requests were inside their functions at once before either went on.
				expect(WriteConditionState.gets.slice(0, 2).map((entry: { phase: string }) => entry.phase)).toEqual(["before", "before"]);
				expect(WriteConditionState.gets).toHaveLength(4);

				for (const entry of WriteConditionState.gets) {
					expect(entry.principalId, JSON.stringify(entry)).toBe(entry.row === OPEN_FIRST ? PRINCIPAL.id : SECOND_USER_ID);
				}
			},
			TEST_TIMEOUT,
		);

		it(
			"has no principal on a direct service call",
			async () => {
				const service: WriteConditionSaveService = app.get(WriteConditionSaveService);

				await service.update({ id: OPEN_FIRST }, { name: "Changed" });
				await service.delete({ id: SPARE_FIRST });

				expect(WriteConditionState.principals.length).toBeGreaterThan(0);
				expect(WriteConditionState.principals.every((entry: { principal: unknown }) => entry.principal === undefined)).toBe(true);
			},
			TEST_TIMEOUT,
		);
	});
});
