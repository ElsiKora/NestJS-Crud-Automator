import "reflect-metadata";

import type { IApiRouteRuntimeGeneratedExecutionOptions } from "@interface/class/api/route";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import type { FindOneOptions, Logger } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiService } from "@decorator/api/service/decorator";
import { EApiControllerRelationReferenceShape, EApiDtoType, EApiFunctionTransactionMode, EApiFunctionType, EApiRouteType } from "@enum/decorator/api";
import { PostgreSqlContainer } from "@testcontainers/postgresql";
import { Column, DataSource, Entity, ManyToOne, PrimaryColumn, QueryRunner, Repository } from "typeorm";
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

	beforeAll(async (): Promise<void> => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();
		dataSource = await new DataSource({
			dropSchema: true,
			entities: [RouteTransactionItemEntity, RouteTransactionOwnerEntity, RouteTransactionProfileEntity],
			logger: queryLogger,
			logging: ["query"],
			synchronize: true,
			type: "postgres",
			url: container.getConnectionUri(),
		}).initialize();
	}, 120_000);

	beforeEach(async (): Promise<void> => {
		await dataSource.query('TRUNCATE TABLE "route_transaction_items", "route_transaction_owners", "route_transaction_profiles" CASCADE');
		const profile: RouteTransactionProfileEntity = await dataSource.getRepository(RouteTransactionProfileEntity).save({
			id: PROFILE_ID,
			label: "Profile",
		});

		await dataSource.getRepository(RouteTransactionOwnerEntity).save({
			id: OWNER_ID,
			name: "Owner",
			profile,
		});
		queryLogger.clear();
	});

	afterAll(async (): Promise<void> => {
		if (dataSource?.isInitialized) {
			await dataSource.destroy();
		}

		await container?.stop();
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
});
