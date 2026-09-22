import "reflect-metadata";

import type { IApiRouteRuntimeGeneratedExecutionOptions } from "@interface/class/api/route";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { DeepPartial, EntityManager, FindOneOptions, FindOptionsWhere, Logger } from "typeorm";
import type { IApiSubscriberFunction, TApiSubscriberFunctionBeforeGetContext, TApiSubscriberFunctionBeforeUpdateContext, TApiSubscriberFunctionAfterUpdateContext } from "../../src/index";

import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { ApiServiceObservable } from "@decorator/api/service/observable.decorator";
import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiService } from "@decorator/api/service/decorator";
import { EApiControllerRelationReferenceShape, EApiDtoType, EApiFunctionTransactionMode, EApiFunctionType, EApiFunctionUpdatePersistenceMode, EApiRouteType } from "@enum/decorator/api";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { AfterLoad, Column, DataSource, DeleteDateColumn, Entity, ManyToOne, PrimaryColumn, QueryRunner, Repository, VersionColumn } from "typeorm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

@Entity("route_transaction_profiles")
class RouteTransactionProfileEntity {
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ type: "varchar" })
	public label!: string;
}

@Entity("route_transaction_owners")
class RouteTransactionOwnerEntity {
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;

	@ManyToOne(() => RouteTransactionProfileEntity, { eager: true, nullable: false })
	public profile!: RouteTransactionProfileEntity;
}

@Entity("route_transaction_items")
class RouteTransactionItemEntity {
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;

	@ManyToOne(() => RouteTransactionOwnerEntity, { eager: false, nullable: false })
	public owner!: RouteTransactionOwnerEntity;
}

@ApiService({
	entity: RouteTransactionOwnerEntity,
	functions: {
		[EApiFunctionType.GET]: {
			transaction: {
				mode: EApiFunctionTransactionMode.MANDATORY,
			},
		},
	},
})
class RouteTransactionOwnerService extends ApiServiceBase<RouteTransactionOwnerEntity> {
	public constructor(public readonly repository: Repository<RouteTransactionOwnerEntity>) {
		super();
	}
}

@ApiService({
	entity: RouteTransactionItemEntity,
	functions: {
		[EApiFunctionType.CREATE]: {
			transaction: {
				mode: EApiFunctionTransactionMode.MANDATORY,
			},
		},
		[EApiFunctionType.GET]: {
			transaction: {
				mode: EApiFunctionTransactionMode.MANDATORY,
			},
		},
		[EApiFunctionType.GET_LIST]: {
			transaction: {
				mode: EApiFunctionTransactionMode.MANDATORY,
			},
		},
	},
})
class RouteTransactionItemService extends ApiServiceBase<RouteTransactionItemEntity> {
	public constructor(public readonly repository: Repository<RouteTransactionItemEntity>) {
		super();
	}
}

@Entity("route_transaction_patches")
class RouteTransactionPatchEntity {
	public static shouldPresentOtherId: boolean = false;

	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@Column({ array: true, type: "text" })
	public cidrs!: Array<string>;

	@DeleteDateColumn({ nullable: true, type: "timestamptz" })
	public deletedAt!: Date | null;

	@Column({ select: false, type: "varchar" })
	public hidden: string = "constructor-hidden";

	@Column({ type: "varchar" })
	public state: string = "constructor-state";

	@Column({ type: "varchar" })
	public tenantId!: string;

	@VersionColumn()
	public version!: number;

	@AfterLoad()
	public presentId(): void {
		if (RouteTransactionPatchEntity.shouldPresentOtherId && this.id === PATCH_ID) this.id = OTHER_PATCH_ID;
	}
}

@ApiService({
	entity: RouteTransactionPatchEntity,
	functions: {
		[EApiFunctionType.GET]: { transaction: { mode: EApiFunctionTransactionMode.MANDATORY } },
		[EApiFunctionType.UPDATE]: {
			persistenceMode: EApiFunctionUpdatePersistenceMode.PATCH,
			transaction: { mode: EApiFunctionTransactionMode.MANDATORY },
		},
	},
})
@ApiServiceObservable()
class RouteTransactionPatchService extends ApiServiceBase<RouteTransactionPatchEntity> {
	public constructor(public readonly repository: Repository<RouteTransactionPatchEntity>) {
		super();
	}
}

class RouteTransactionQueryLogger implements Logger {
	public readonly executions: Array<{ isTransactionActive: boolean; query: string; queryRunner: QueryRunner | undefined }> = [];

	public readonly queries: Array<string> = [];

	public clear(): void {
		this.executions.length = 0;
		this.queries.length = 0;
	}

	public log(): void {}

	public logMigration(): void {}

	public logQuery(query: string, _parameters?: Array<unknown>, queryRunner?: QueryRunner): void {
		this.executions.push({ isTransactionActive: Boolean(queryRunner?.isTransactionActive), query, queryRunner });
		this.queries.push(query);
	}

	public logQueryError(): void {}

	public logQuerySlow(): void {}

	public logSchemaBuild(): void {}
}

const PATCH_ID: string = "40000000-0000-4000-8000-000000000001";
const OTHER_PATCH_ID: string = "40000000-0000-4000-8000-000000000002";

const OWNER_ID: string = "10000000-0000-4000-8000-000000000001";
const PROFILE_ID: string = "20000000-0000-4000-8000-000000000001";

function createDeferred(): { promise: Promise<void>; resolve: () => void } {
	let resolvePromise: (() => void) | undefined;
	const promise = new Promise<void>((resolve): void => {
		resolvePromise = resolve;
	});

	return {
		promise,
		resolve: (): void => resolvePromise?.(),
	};
}

function createGeneratedCreateOptions(itemService: RouteTransactionItemService, ownerService: RouteTransactionOwnerService, itemId: string, lock: NonNullable<FindOneOptions<RouteTransactionOwnerEntity>["lock"]>, transactionMode: EApiFunctionTransactionMode = EApiFunctionTransactionMode.REQUIRED): IApiRouteRuntimeGeneratedExecutionOptions<RouteTransactionItemEntity, EApiRouteType.CREATE> {
	return {
		controller: {
			ownerService,
			service: itemService,
		} as never,
		entityMetadata: {
			columns: [
				{
					isPrimary: true,
					name: "id",
					type: "uuid",
				},
			],
			primaryKey: {
				isPrimary: true,
				name: "id",
				type: "uuid",
			},
			tableName: "route_transaction_items",
		},
		method: EApiRouteType.CREATE,
		methodName: "create",
		properties: {
			entity: RouteTransactionItemEntity,
			routes: {
				[EApiRouteType.CREATE]: {
					dto: {
						[EApiDtoType.RESPONSE]: RouteTransactionItemEntity,
					},
					relations: {
						request: {
							load: {
								include: {
									owner: {
										profile: true,
									},
								},
								locks: {
									owner: lock,
								},
								relationLoadStrategy: "query",
							},
							reference: {
								shape: EApiControllerRelationReferenceShape.SCALAR,
							},
						},
						response: {
							load: {
								include: {
									owner: true,
								},
								relationLoadStrategy: "query",
							},
							reference: {
								shape: EApiControllerRelationReferenceShape.SCALAR,
							},
						},
					},
					response: {
						serialization: {
							isEnabled: false,
						},
					},
					transaction: {
						mode: transactionMode,
					},
				},
			},
		},
		targets: {
			body: {
				id: itemId,
				name: `Item ${itemId}`,
				owner: OWNER_ID as never,
			},
			headers: {},
			ip: "127.0.0.1",
		},
	};
}

function createGeneratedGetListOptions(itemService: RouteTransactionItemService): IApiRouteRuntimeGeneratedExecutionOptions<RouteTransactionItemEntity, EApiRouteType.GET_LIST> {
	return {
		controller: {
			service: itemService,
		} as never,
		entityMetadata: {
			columns: [
				{
					isPrimary: true,
					name: "id",
					type: "uuid",
				},
				{
					isPrimary: false,
					name: "name",
					type: "varchar",
				},
			],
			primaryKey: {
				isPrimary: true,
				name: "id",
				type: "uuid",
			},
			tableName: "route_transaction_items",
		},
		method: EApiRouteType.GET_LIST,
		methodName: "getList",
		properties: {
			entity: RouteTransactionItemEntity,
			routes: {
				[EApiRouteType.GET_LIST]: {
					dto: {
						[EApiDtoType.RESPONSE]: RouteTransactionItemEntity,
					},
					response: {
						serialization: {
							isEnabled: false,
						},
					},
					transaction: {
						mode: EApiFunctionTransactionMode.REQUIRED,
					},
				},
			},
		},
		targets: {
			headers: {},
			ip: "127.0.0.1",
			query: {
				limit: 10,
				page: 1,
			},
		},
	};
}

describe("generated route transactions with PostgreSQL", () => {
	const queryLogger = new RouteTransactionQueryLogger();
	let container: StartedPostgreSqlContainer;
	let dataSource: DataSource;
	let patchHooks: {
		beforeGet?: (context: TApiSubscriberFunctionBeforeGetContext<RouteTransactionPatchEntity>) => Promise<FindOneOptions<RouteTransactionPatchEntity> | undefined>;
		beforeUpdate?: (context: TApiSubscriberFunctionBeforeUpdateContext<RouteTransactionPatchEntity>) => Promise<void>;
		afterUpdate?: (context: TApiSubscriberFunctionAfterUpdateContext<RouteTransactionPatchEntity>) => Promise<void>;
	} = {};
	const patchLifecycle: Array<string> = [];
	const patchSubscriber: IApiSubscriberFunction<RouteTransactionPatchEntity> = {
		onBeforeGet: async (context) => {
			patchLifecycle.push("get:before");
			return patchHooks.beforeGet?.(context);
		},
		onAfterGet: async () => {
			patchLifecycle.push("get:after");
			return undefined;
		},
		onBeforeUpdate: async (context) => {
			patchLifecycle.push("update:before");
			await patchHooks.beforeUpdate?.(context);
			return undefined;
		},
		onAfterUpdate: async (context) => {
			patchLifecycle.push("update:after");
			await patchHooks.afterUpdate?.(context);
			return undefined;
		},
	};

	async function runConcurrentPatch(patch: DeepPartial<RouteTransactionPatchEntity>, concurrentWrite: (manager: EntityManager) => Promise<void>, mandatoryWhere?: FindOptionsWhere<RouteTransactionPatchEntity>): Promise<{ owner: EntityManager; result: PromiseSettledResult<RouteTransactionPatchEntity> }> {
		const hydrated = createDeferred();
		const resume = createDeferred();
		let owner: EntityManager | undefined;
		patchHooks.beforeUpdate = async (context): Promise<void> => {
			expect(context.DATA.eventManager).toBe(owner);
			expect(context.DATA.currentEntity).toMatchObject({ cidrs: ["192.0.2.0/24"], state: "ACTIVE" });
			hydrated.resolve();
			await resume.promise;
		};
		const service = new RouteTransactionPatchService(dataSource.getRepository(RouteTransactionPatchEntity));
		const criteria = { id: PATCH_ID };
		const operation = ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "native-patch-paused-writer" }, async (manager): Promise<RouteTransactionPatchEntity> => {
			owner = manager;
			await manager.query("SET LOCAL statement_timeout = '5s'");
			return mandatoryWhere ? await ApiControllerGeneratedReadScopeStorage.run(EApiFunctionType.UPDATE, criteria, mandatoryWhere, () => service.update(criteria, patch)) : await service.update(criteria, patch);
		});
		const settled = Promise.allSettled([operation]);
		try {
			await Promise.race([
				hydrated.promise,
				operation.then((): never => {
					throw new Error("PATCH completed before its hydration barrier.");
				}),
			]);
			await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "native-patch-concurrent-writer" }, async (manager): Promise<void> => {
				expect(manager).not.toBe(owner);
				await manager.query("SET LOCAL lock_timeout = '2s'");
				await concurrentWrite(manager);
			});
		} finally {
			resume.resolve();
			await settled;
		}
		if (!owner) throw new Error("PATCH owner was not acquired.");
		const [result] = await settled;
		return { owner, result: result! };
	}

	beforeAll(async (): Promise<void> => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		dataSource = new DataSource({
			dropSchema: true,
			entities: [RouteTransactionItemEntity, RouteTransactionOwnerEntity, RouteTransactionProfileEntity, RouteTransactionPatchEntity],
			logger: queryLogger,
			logging: ["query"],
			synchronize: true,
			type: "postgres",
			url: container.getConnectionUri(),
		});
		await dataSource.initialize();
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: RouteTransactionPatchEntity }, patchSubscriber);
	}, 120_000);

	beforeEach(async (): Promise<void> => {
		patchHooks = {};
		patchLifecycle.length = 0;
		RouteTransactionPatchEntity.shouldPresentOtherId = false;
		await dataSource.query('TRUNCATE TABLE "route_transaction_items", "route_transaction_owners", "route_transaction_profiles", "route_transaction_patches" CASCADE');
		const profile: RouteTransactionProfileEntity = await dataSource.getRepository(RouteTransactionProfileEntity).save({
			id: PROFILE_ID,
			label: "Profile",
		});

		await dataSource.getRepository(RouteTransactionOwnerEntity).save({
			id: OWNER_ID,
			name: "Owner",
			profile,
		});
		await dataSource.getRepository(RouteTransactionPatchEntity).insert([
			{ id: PATCH_ID, cidrs: ["192.0.2.0/24"], hidden: "database-hidden-original", state: "ACTIVE", tenantId: "tenant-a" },
			{ id: OTHER_PATCH_ID, cidrs: ["198.51.100.0/24"], hidden: "database-hidden-other", state: "OTHER", tenantId: "tenant-b" },
		]);
		queryLogger.clear();
	});

	afterAll(async (): Promise<void> => {
		const failures: Array<unknown> = [];
		try {
			if (dataSource?.isInitialized) await dataSource.destroy();
		} catch (error) {
			failures.push(error);
		}
		try {
			await container?.stop();
		} catch (error) {
			failures.push(error);
		}
		if (failures.length === 1) throw failures[0];
		if (failures.length > 1) throw new AggregateError(failures, "PostgreSQL data source and container cleanup failed.");
	});

	it.each([
		{
			lock: {
				mode: "pessimistic_read",
			},
			lockPattern: /FOR SHARE/u,
		},
		{
			lock: {
				mode: "pessimistic_write",
			},
			lockPattern: /FOR UPDATE/u,
		},
	] as const)("executes a $lock.mode direct lock and leaves nested query loading unlocked", async ({ lock, lockPattern }) => {
		const itemService = new RouteTransactionItemService(dataSource.getRepository(RouteTransactionItemEntity));
		const ownerService = new RouteTransactionOwnerService(dataSource.getRepository(RouteTransactionOwnerEntity));
		const managers: Array<unknown> = [];
		const getEventManager = ApiFunctionContextStorage.getEventManager.bind(ApiFunctionContextStorage);
		const eventManagerSpy = vi.spyOn(ApiFunctionContextStorage, "getEventManager").mockImplementation(() => {
			const manager = getEventManager();

			if (manager) {
				managers.push(manager);
			}

			return manager;
		});
		const result = await ApiRouteRuntime.executeGenerated(createGeneratedCreateOptions(itemService, ownerService, `30000000-0000-4000-8000-00000000000${lock.mode === "pessimistic_read" ? "1" : "2"}`, lock));
		const lockedOwnerQueries: Array<string> = queryLogger.queries.filter((query: string): boolean => query.includes('"route_transaction_owners"') && lockPattern.test(query));
		const nestedProfileQueries: Array<string> = queryLogger.queries.filter((query: string): boolean => query.includes('"route_transaction_profiles"'));

		expect(managers.length).toBeGreaterThanOrEqual(3);
		expect(managers.every((manager: unknown): boolean => manager === managers[0])).toBe(true);
		expect(ApiFunctionContextStorage.getEventManager()).toBeUndefined();
		eventManagerSpy.mockRestore();
		expect(lockedOwnerQueries).toHaveLength(1);
		expect(lockedOwnerQueries[0]).not.toContain('"route_transaction_profiles"');
		expect(nestedProfileQueries.length).toBeGreaterThan(0);
		expect(nestedProfileQueries.every((query: string): boolean => !/FOR (?:SHARE|UPDATE)/u.test(query))).toBe(true);
		expect(result).toMatchObject({
			owner: OWNER_ID,
		});
		expect(await dataSource.getRepository(RouteTransactionItemEntity).findOneByOrFail({ id: (result as RouteTransactionItemEntity).id })).toMatchObject({
			name: expect.stringContaining("Item"),
		});
	});

	it("executes generated GET_LIST queries on the route-owned PostgreSQL query runner", async () => {
		const itemId: string = "30000000-0000-4000-8000-000000000003";
		const itemRepository: Repository<RouteTransactionItemEntity> = dataSource.getRepository(RouteTransactionItemEntity);
		const owner: RouteTransactionOwnerEntity = await dataSource.getRepository(RouteTransactionOwnerEntity).findOneByOrFail({ id: OWNER_ID });

		await itemRepository.save({ id: itemId, name: "Listed item", owner });
		queryLogger.clear();

		const result: unknown = await ApiRouteRuntime.executeGenerated(createGeneratedGetListOptions(new RouteTransactionItemService(itemRepository)));
		const transactionStart = queryLogger.executions.find(({ query }: { query: string }): boolean => query === "START TRANSACTION");
		const listSelects = queryLogger.executions.filter(({ query }: { query: string }): boolean => query.startsWith("SELECT") && query.includes('"route_transaction_items"'));

		expect(transactionStart?.queryRunner).toBeDefined();
		expect(listSelects.length).toBeGreaterThan(0);
		expect(listSelects.every(({ isTransactionActive, queryRunner }): boolean => isTransactionActive && queryRunner === transactionStart?.queryRunner)).toBe(true);
		expect(result).toMatchObject({
			items: [expect.objectContaining({ id: itemId, name: "Listed item" })],
			totalCount: 1,
		});
	});

	it("allows concurrent readers while blocking a writer until every route commits", async () => {
		const firstItemService = new RouteTransactionItemService(dataSource.getRepository(RouteTransactionItemEntity));
		const secondItemService = new RouteTransactionItemService(dataSource.getRepository(RouteTransactionItemEntity));
		const firstOwnerService = new RouteTransactionOwnerService(dataSource.getRepository(RouteTransactionOwnerEntity));
		const secondOwnerService = new RouteTransactionOwnerService(dataSource.getRepository(RouteTransactionOwnerEntity));
		const firstLockAcquired = createDeferred();
		const secondLockAcquired = createDeferred();
		const releaseFirstRoute = createDeferred();
		const releaseSecondRoute = createDeferred();
		const firstGet = firstOwnerService.get.bind(firstOwnerService);
		const secondGet = secondOwnerService.get.bind(secondOwnerService);

		firstOwnerService.get = async (properties): Promise<RouteTransactionOwnerEntity> => {
			const owner: RouteTransactionOwnerEntity = await firstGet(properties);

			firstLockAcquired.resolve();
			await releaseFirstRoute.promise;

			return owner;
		};
		secondOwnerService.get = async (properties): Promise<RouteTransactionOwnerEntity> => {
			const owner: RouteTransactionOwnerEntity = await secondGet(properties);

			secondLockAcquired.resolve();
			await releaseSecondRoute.promise;

			return owner;
		};

		const firstRoute = ApiRouteRuntime.executeGenerated(createGeneratedCreateOptions(firstItemService, firstOwnerService, "30000000-0000-4000-8000-000000000011", { mode: "pessimistic_read" }));
		const secondRoute = ApiRouteRuntime.executeGenerated(createGeneratedCreateOptions(secondItemService, secondOwnerService, "30000000-0000-4000-8000-000000000012", { mode: "pessimistic_read" }));

		await Promise.all([firstLockAcquired.promise, secondLockAcquired.promise]);

		const writer: QueryRunner = dataSource.createQueryRunner();

		await writer.connect();
		await writer.startTransaction();
		await writer.query("SET LOCAL lock_timeout = '5s'");

		let writerSettled: boolean = false;
		const writerUpdate = writer.manager.update(RouteTransactionOwnerEntity, { id: OWNER_ID }, { name: "Updated Owner" }).then((): void => {
			writerSettled = true;
		});

		await new Promise<void>((resolve): void => {
			setTimeout(resolve, 150);
		});
		expect(writerSettled).toBe(false);

		releaseFirstRoute.resolve();
		await firstRoute;
		await new Promise<void>((resolve): void => {
			setTimeout(resolve, 150);
		});
		expect(writerSettled).toBe(false);

		releaseSecondRoute.resolve();
		await secondRoute;
		await writerUpdate;
		await writer.commitTransaction();
		await writer.release();

		expect(writerSettled).toBe(true);
		expect(await dataSource.getRepository(RouteTransactionOwnerEntity).findOneByOrFail({ id: OWNER_ID })).toMatchObject({
			name: "Updated Owner",
		});
		expect(await dataSource.getRepository(RouteTransactionItemEntity).count()).toBe(2);
	});

	it("rolls back before the generated operation when a locked relation is missing", async () => {
		const itemService = new RouteTransactionItemService(dataSource.getRepository(RouteTransactionItemEntity));
		const ownerService = new RouteTransactionOwnerService(dataSource.getRepository(RouteTransactionOwnerEntity));
		const options = createGeneratedCreateOptions(itemService, ownerService, "30000000-0000-4000-8000-000000000021", { mode: "pessimistic_read" });

		options.targets.body = {
			...options.targets.body,
			owner: "10000000-0000-4000-8000-000000000099" as never,
		};

		await expect(ApiRouteRuntime.executeGenerated(options)).rejects.toMatchObject({
			status: 404,
		});
		expect(await dataSource.getRepository(RouteTransactionItemEntity).count()).toBe(0);
	});

	it("rejects a lock when SUPPORTS has no active transaction", async () => {
		const itemService = new RouteTransactionItemService(dataSource.getRepository(RouteTransactionItemEntity));
		const ownerService = new RouteTransactionOwnerService(dataSource.getRepository(RouteTransactionOwnerEntity));

		await expect(ApiRouteRuntime.executeGenerated(createGeneratedCreateOptions(itemService, ownerService, "30000000-0000-4000-8000-000000000031", { mode: "pessimistic_read" }, EApiFunctionTransactionMode.SUPPORTS))).rejects.toThrow("Request relation locks require an active transaction");
		expect(await dataSource.getRepository(RouteTransactionItemEntity).count()).toBe(0);
	});
	it.each([false, true])("PATCH preserves omitted state but writes explicit same-value state=%s after a concurrent commit", async (isStateExplicit): Promise<void> => {
		const { owner, result } = await runConcurrentPatch({ cidrs: ["203.0.113.0/24"], ...(isStateExplicit ? { state: "ACTIVE" } : {}) }, async (manager): Promise<void> => {
			await manager.update(RouteTransactionPatchEntity, { id: PATCH_ID }, { state: "SUSPENDED" });
		});
		expect(result.status).toBe("fulfilled");
		if (result.status !== "fulfilled") throw result.reason;
		const expectedState = isStateExplicit ? "ACTIVE" : "SUSPENDED";
		expect(result.value).toMatchObject({ id: PATCH_ID, cidrs: ["203.0.113.0/24"], state: expectedState, version: 3 });
		expect(await dataSource.getRepository(RouteTransactionPatchEntity).findOneByOrFail({ id: PATCH_ID })).toMatchObject({ cidrs: ["203.0.113.0/24"], state: expectedState, version: 3 });
		const ownedWrites = queryLogger.executions.filter((entry) => entry.queryRunner === owner.queryRunner && entry.query.startsWith("UPDATE") && entry.query.includes('"route_transaction_patches"'));
		expect(ownedWrites).toHaveLength(1);
		expect(ownedWrites[0]?.isTransactionActive).toBe(true);
		expect(patchLifecycle).toEqual(["get:before", "get:after", "update:before", "update:after"]);
	});

	it.each([false, true])("PATCH rejects a target leaving its protected visibility with soft-delete=%s", async (isSoftDelete): Promise<void> => {
		const { result } = await runConcurrentPatch(
			{ cidrs: ["203.0.113.0/24"] },
			async (manager): Promise<void> => {
				if (isSoftDelete) await manager.softDelete(RouteTransactionPatchEntity, { id: PATCH_ID });
				else await manager.update(RouteTransactionPatchEntity, { id: PATCH_ID }, { tenantId: "tenant-b" });
			},
			{ tenantId: "tenant-a" },
		);
		expect(result.status).toBe("rejected");
		if (result.status !== "rejected") throw new Error("Expected protected PATCH rejection.");
		expect(result.reason).toMatchObject({ status: 404 });
		expect(patchLifecycle).toEqual(["get:before", "get:after", "update:before"]);
		const row = await dataSource.getRepository(RouteTransactionPatchEntity).findOneOrFail({ where: { id: PATCH_ID }, withDeleted: true });
		expect(row.cidrs).toEqual(["192.0.2.0/24"]);
		expect(row.version).toBe(2);
		if (isSoftDelete) expect(row.deletedAt).toBeInstanceOf(Date);
		else expect(row.tenantId).toBe("tenant-b");
	});

	it("PATCH reloads a changed state by immutable identity and rolls back it with a same-owner side effect", async (): Promise<void> => {
		const service = new RouteTransactionPatchService(dataSource.getRepository(RouteTransactionPatchEntity));
		const failure = new Error("outer patch rollback");
		const sideEffectId = "20000000-0000-4000-8000-000000000099";
		let updateOwner: EntityManager | undefined;
		patchHooks.afterUpdate = async (context): Promise<void> => {
			updateOwner = context.DATA.eventManager;
			expect(context.result.state).toBe("SUSPENDED");
			await context.DATA.eventManager!.insert(RouteTransactionProfileEntity, { id: sideEffectId, label: "same-owner-side-effect" });
		};
		await expect(
			ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "native-patch-atomic-rollback" }, async (manager): Promise<void> => {
				const result = await service.update({ id: PATCH_ID, state: "ACTIVE" }, { state: "SUSPENDED" });
				expect(result.state).toBe("SUSPENDED");
				expect(updateOwner).toBe(manager);
				throw failure;
			}),
		).rejects.toBe(failure);
		expect(await dataSource.getRepository(RouteTransactionPatchEntity).findOneByOrFail({ id: PATCH_ID })).toMatchObject({ state: "ACTIVE", version: 1 });
		expect(await dataSource.getRepository(RouteTransactionProfileEntity).existsBy({ id: sideEffectId })).toBe(false);
		expect(patchLifecycle).toEqual(["get:before", "get:after", "update:before", "update:after"]);
	});

	it("PATCH keeps the effective projection and original primary key despite native AfterLoad presentation", async (): Promise<void> => {
		RouteTransactionPatchEntity.shouldPresentOtherId = true;
		const service = new RouteTransactionPatchService(dataSource.getRepository(RouteTransactionPatchEntity));
		const select = { cidrs: true, id: true };
		patchHooks.beforeGet = async (context) => ({ ...context.result, select });
		patchHooks.beforeUpdate = async (context): Promise<void> => {
			expect(context.DATA.currentEntity).toMatchObject({ id: OTHER_PATCH_ID, state: "constructor-state", hidden: "constructor-hidden" });
			Object.assign(select, { hidden: true, state: true });
		};
		const result = await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "native-patch-projection" }, () => service.update({ id: PATCH_ID }, { cidrs: ["203.0.113.0/24"] }));
		expect(result).toMatchObject({ id: OTHER_PATCH_ID, cidrs: ["203.0.113.0/24"], state: "constructor-state", hidden: "constructor-hidden" });
		const rows = await dataSource.query('SELECT "id", "cidrs", "state", "hidden" FROM "route_transaction_patches" ORDER BY "id"');
		expect(rows).toEqual([
			{ id: PATCH_ID, cidrs: ["203.0.113.0/24"], state: "ACTIVE", hidden: "database-hidden-original" },
			{ id: OTHER_PATCH_ID, cidrs: ["198.51.100.0/24"], state: "OTHER", hidden: "database-hidden-other" },
		]);
		const selects = queryLogger.queries.filter((query) => query.startsWith("SELECT") && query.includes('"route_transaction_patches"') && !query.startsWith('SELECT "id"'));
		expect(selects).toHaveLength(2);
		expect(selects.every((query) => !query.includes('"hidden"') && !query.includes('"state"'))).toBe(true);
		patchHooks.beforeGet = async (context) => ({ ...context.result, select: { cidrs: true, id: true } });
		patchHooks.beforeUpdate = undefined;
		const writesBefore = queryLogger.queries.filter((query) => query.startsWith("UPDATE")).length;
		await expect(ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "native-patch-unselected" }, () => service.update({ id: PATCH_ID }, { state: "FORBIDDEN" }))).rejects.toMatchObject({ status: 400 });
		expect(queryLogger.queries.filter((query) => query.startsWith("UPDATE"))).toHaveLength(writesBefore);
	});

	it("PATCH with only omitted values performs a fresh read without UPDATE or its own version bump", async (): Promise<void> => {
		const { owner, result } = await runConcurrentPatch({ state: undefined, cidrs: undefined }, async (manager): Promise<void> => {
			await manager.update(RouteTransactionPatchEntity, { id: PATCH_ID }, { state: "SUSPENDED" });
		});
		expect(result.status).toBe("fulfilled");
		if (result.status !== "fulfilled") throw result.reason;
		expect(result.value).toMatchObject({ id: PATCH_ID, cidrs: ["192.0.2.0/24"], state: "SUSPENDED", version: 2 });
		expect(queryLogger.executions.filter((entry) => entry.queryRunner === owner.queryRunner && entry.query.startsWith("UPDATE"))).toHaveLength(0);
		expect(patchLifecycle).toEqual(["get:before", "get:after", "update:before", "update:after"]);
	});
});
