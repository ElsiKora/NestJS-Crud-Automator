import type { IApiRouteRuntimeGeneratedExecutionOptions } from "@interface/class/api/route";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { DataSource, EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionLifecycle } from "@class/api/function/transaction/lifecycle.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGeneratedInsertedKeyStorage } from "@class/api/controller/generated/inserted-key-storage.class";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated/read-scope-storage.class";
import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiDtoType, EApiFunctionTransactionMode, EApiFunctionTransactionOwnerKind, EApiFunctionType, EApiRouteType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";
import { And, Equal, In, LessThan, MoreThanOrEqual } from "typeorm";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTransactionFixture, createTypeOrmRepositoryStub, resetApiSubscriberRegistry } from "@test/unit/fixture";
import { RuntimeRouteEntity, RuntimeRouteListQueryDTO, RuntimeRouteRelationEntity, RuntimeRouteResponseDTO } from "@test/unit/class/api/route/runtime/fixture";

function createGeneratedCreateOptions(
	service: ApiServiceBase<RuntimeRouteEntity>,
	routeConfig: TApiControllerPropertiesRoute<RuntimeRouteEntity, EApiRouteType.CREATE> = {},
	body: Partial<RuntimeRouteEntity> = {
		id: "route-transaction-1",
		source: "request",
	},
): IApiRouteRuntimeGeneratedExecutionOptions<RuntimeRouteEntity, EApiRouteType.CREATE> {
	return {
		controller: {
			service,
		},
		entityMetadata: {
			columns: [
				{
					isPrimary: true,
					name: "id",
					type: "varchar",
				},
			],
			primaryKey: {
				isPrimary: true,
				name: "id",
				type: "varchar",
			},
			tableName: "runtime_route_entities",
		},
		method: EApiRouteType.CREATE,
		methodName: "create",
		properties: {
			entity: RuntimeRouteEntity,
			routes: {
				[EApiRouteType.CREATE]: {
					dto: {
						[EApiDtoType.RESPONSE]: RuntimeRouteResponseDTO,
					},
					response: {
						serialization: {
							isEnabled: false,
						},
					},
					...routeConfig,
				} as never,
			},
		},
		schemaPrefix: "RuntimeRoute",
		targets: {
			body,
			headers: {},
			ip: "127.0.0.1",
		},
	};
}

function createGeneratedUpdateOptions(service: ApiServiceBase<RuntimeRouteEntity>, method: EApiRouteType.PARTIAL_UPDATE | EApiRouteType.UPDATE, routeConfig: TApiControllerPropertiesRoute<RuntimeRouteEntity, EApiRouteType.PARTIAL_UPDATE | EApiRouteType.UPDATE> = {}): IApiRouteRuntimeGeneratedExecutionOptions<RuntimeRouteEntity, EApiRouteType.PARTIAL_UPDATE | EApiRouteType.UPDATE> {
	return {
		controller: {
			service,
		},
		entityMetadata: {
			columns: [
				{
					isPrimary: true,
					name: "id",
					type: "varchar",
				},
			],
			primaryKey: {
				isPrimary: true,
				name: "id",
				type: "varchar",
			},
			tableName: "runtime_route_entities",
		},
		method,
		methodName: method === EApiRouteType.UPDATE ? "update" : "partialUpdate",
		properties: {
			entity: RuntimeRouteEntity,
			routes: {
				[method]: {
					dto: {
						[EApiDtoType.RESPONSE]: RuntimeRouteResponseDTO,
					},
					response: {
						serialization: {
							isEnabled: false,
						},
					},
					...routeConfig,
				},
			} as never,
		},
		schemaPrefix: "RuntimeRoute",
		targets: {
			body: {
				relation: "request" as never,
			},
			headers: {},
			ip: "127.0.0.1",
			parameters: {
				id: "route-transaction-1",
			},
		},
	};
}

function createGeneratedReadOrDeleteOptions(service: ApiServiceBase<RuntimeRouteEntity>, method: EApiRouteType.DELETE | EApiRouteType.GET | EApiRouteType.GET_LIST): IApiRouteRuntimeGeneratedExecutionOptions<RuntimeRouteEntity, EApiRouteType.DELETE | EApiRouteType.GET | EApiRouteType.GET_LIST> {
	return {
		controller: {
			service,
		},
		entityMetadata: {
			columns: [
				{
					isPrimary: true,
					name: "id",
					type: "varchar",
				},
			],
			primaryKey: {
				isPrimary: true,
				name: "id",
				type: "varchar",
			},
			tableName: "runtime_route_entities",
		},
		method,
		methodName: method,
		properties: {
			entity: RuntimeRouteEntity,
			routes: {
				[method]: {
					...(method === EApiRouteType.DELETE
						? {}
						: {
								dto: {
									...(method === EApiRouteType.GET_LIST ? { [EApiDtoType.QUERY]: RuntimeRouteListQueryDTO } : {}),
									[EApiDtoType.RESPONSE]: RuntimeRouteResponseDTO,
								},
								response: {
									serialization: {
										isEnabled: false,
									},
								},
							}),
					transaction: {
						mode: EApiFunctionTransactionMode.REQUIRED,
					},
				},
			} as never,
		},
		schemaPrefix: "RuntimeRoute",
		targets: {
			headers: {},
			ip: "127.0.0.1",
			parameters: method === EApiRouteType.GET_LIST ? undefined : { id: "route-transaction-1" },
			query: method === EApiRouteType.GET_LIST ? { limit: 10, page: 1 } : undefined,
		},
	};
}

const STORED_ROW: RuntimeRouteEntity = { id: "route-transaction-1", source: "stored" };

function createStoredRowRepository(storedRows: Array<RuntimeRouteEntity>, primaryColumns: Array<{ propertyName: string; type: string }> = [], connection: object = {}): Repository<RuntimeRouteEntity> {
	const dataSource: object = Object.assign(connection, { driver: { normalizeType: (column: { type: string }): string => column.type } }, "options" in connection ? {} : { options: { type: "postgres" } });

	return Object.assign(createTypeOrmRepositoryStub<RuntimeRouteEntity>(dataSource, { columns: [], primaryColumns }), { count: vi.fn(async (): Promise<number> => storedRows.length) });
}

function createRouteTransactionFixture(storedRows: Array<RuntimeRouteEntity> = [STORED_ROW], primaryColumns: Array<{ propertyName: string; type: string }> = []): ReturnType<typeof createTransactionFixture> {
	const repository: Repository<RuntimeRouteEntity> = createStoredRowRepository(storedRows, primaryColumns);

	return createTransactionFixture({ getRepository: vi.fn(() => repository) } as unknown as EntityManager);
}

/**
 * Claims the scope of a mocked create and reports the key of its stored row, as the built-in create function does.
 * @param {object} properties - Body the create function received.
 * @param {object} storedRow - Row the mocked create stored.
 * @param {ReadonlyArray<string>} keys - Primary columns of the row.
 */
function reportStoredRow(properties: object, storedRow: object, keys: ReadonlyArray<string>): void {
	const values: Array<[string, unknown]> = keys.map((key: string): [string, unknown] => [key, Reflect.get(storedRow, key)]);

	ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.CREATE, properties);
	// Like EntityMetadata.getEntityIdMap, a row with a missing primary value reports no key.
	ApiControllerGeneratedInsertedKeyStorage.claim(properties, "RuntimeRouteEntity")?.(values.some(([, value]: [string, unknown]): boolean => value === undefined || value === null) ? undefined : Object.fromEntries(values));
}

function storeCreatedRow(properties: Partial<RuntimeRouteEntity>, keys: ReadonlyArray<string> = ["id"]): RuntimeRouteEntity {
	reportStoredRow(properties, properties, keys);

	return properties as RuntimeRouteEntity;
}

function createRouteService(dataSource?: DataSource, storedRows: Array<RuntimeRouteEntity> = [STORED_ROW]): ApiServiceBase<RuntimeRouteEntity> {
	const service: ApiServiceBase<RuntimeRouteEntity> = new ApiServiceBase<RuntimeRouteEntity>();

	Object.defineProperty(service, "repository", {
		configurable: true,
		value: createStoredRowRepository(storedRows, [], dataSource),
	});

	vi.spyOn(service, "create").mockImplementation(async (properties: Partial<RuntimeRouteEntity>): Promise<RuntimeRouteEntity> => storeCreatedRow(properties));
	vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);

		return {
			id: "route-transaction-1",
			source: "response",
		};
	});
	vi.spyOn(service, "getList").mockImplementation(async (properties) => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET_LIST, properties);

		return {
			count: 0,
			currentPage: 1,
			items: [],
			totalCount: 0,
			totalPages: 0,
		};
	});
	vi.spyOn(service, "update").mockImplementation(async (criteria, properties): Promise<RuntimeRouteEntity> => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.UPDATE, criteria);

		return { id: "route-transaction-1", ...properties };
	});
	vi.spyOn(service, "delete").mockImplementation(async (criteria): Promise<void> => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.DELETE, criteria);
	});

	ApiControllerGeneratedFunctionCapability.mark(service.create, EApiFunctionType.CREATE, RuntimeRouteEntity);
	ApiControllerGeneratedFunctionCapability.mark(service.get, EApiFunctionType.GET, RuntimeRouteEntity);
	ApiControllerGeneratedFunctionCapability.mark(service.getList, EApiFunctionType.GET_LIST, RuntimeRouteEntity);
	ApiControllerGeneratedFunctionCapability.mark(service.update, EApiFunctionType.UPDATE, RuntimeRouteEntity);
	ApiControllerGeneratedFunctionCapability.mark(service.delete, EApiFunctionType.DELETE, RuntimeRouteEntity);

	return service;
}

afterEach(() => {
	vi.restoreAllMocks();
	resetApiSubscriberRegistry();
});

describe("ApiRouteRuntime generated transactions", () => {
	it("rejects an own undecorated UPDATE before invoking it", async () => {
		const service: ApiServiceBase<RuntimeRouteEntity> = new ApiServiceBase<RuntimeRouteEntity>();
		const update = vi.spyOn(service, "update");

		await expect(ApiRouteRuntime.executeGenerated(createGeneratedUpdateOptions(service, EApiRouteType.UPDATE))).rejects.toThrow("Generated update service function is not protected by its built-in decorator");
		expect(update).not.toHaveBeenCalled();
	});

	it("rejects an inherited undecorated DELETE before invoking it", async () => {
		const inheritedDelete = vi.fn();
		const servicePrototype: object = Object.create(ApiServiceBase.prototype) as object;
		Object.defineProperty(servicePrototype, EApiFunctionType.DELETE, { configurable: true, value: inheritedDelete, writable: true });
		const service: ApiServiceBase<RuntimeRouteEntity> = Object.create(servicePrototype) as ApiServiceBase<RuntimeRouteEntity>;
		const options = createGeneratedReadOrDeleteOptions(service, EApiRouteType.DELETE);

		(options.properties.routes[EApiRouteType.DELETE] as TApiControllerPropertiesRoute<RuntimeRouteEntity, EApiRouteType.DELETE>).transaction = { mode: EApiFunctionTransactionMode.SUPPORTS };

		await expect(ApiRouteRuntime.executeGenerated(options)).rejects.toThrow("Generated delete service function is not protected by its built-in decorator");
		expect(inheritedDelete).not.toHaveBeenCalled();
	});

	it("rejects an unmarked CREATE before opening a transaction or creating", async () => {
		const transaction = createTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = new ApiServiceBase<RuntimeRouteEntity>();
		const create = vi.spyOn(service, "create");

		Object.defineProperty(service, "repository", {
			value: {
				manager: {
					dataSource: transaction.dataSource,
				},
			} as Repository<RuntimeRouteEntity>,
		});

		await expect(ApiRouteRuntime.executeGenerated(createGeneratedCreateOptions(service, { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } }))).rejects.toThrow("Generated create service function is not protected by its built-in decorator");
		expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		expect(create).not.toHaveBeenCalled();
	});

	it("rejects an unmarked CREATE reload before opening a transaction or creating", async () => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = new ApiServiceBase<RuntimeRouteEntity>();
		const create = vi.spyOn(service, "create");
		const get = vi.spyOn(service, "get");

		ApiControllerGeneratedFunctionCapability.mark(create, EApiFunctionType.CREATE, RuntimeRouteEntity);

		Object.defineProperty(service, "repository", {
			value: createTypeOrmRepositoryStub<RuntimeRouteEntity>(transaction.dataSource),
		});

		await expect(ApiRouteRuntime.executeGenerated(createGeneratedCreateOptions(service, { transaction: { mode: EApiFunctionTransactionMode.REQUIRED } }))).rejects.toThrow("Generated get service function is not protected by its built-in decorator");
		expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		expect(create).not.toHaveBeenCalled();
		expect(get).not.toHaveBeenCalled();
	});

	it("rejects an unmarked UPDATE response reload before updating", async () => {
		const service: ApiServiceBase<RuntimeRouteEntity> = new ApiServiceBase<RuntimeRouteEntity>();
		const update = vi.spyOn(service, "update").mockImplementation(async (criteria): Promise<RuntimeRouteEntity> => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.UPDATE, criteria);

			return { id: "route-transaction-1" };
		});
		const get = vi.spyOn(service, "get");

		ApiControllerGeneratedFunctionCapability.mark(update, EApiFunctionType.UPDATE, RuntimeRouteEntity);

		await expect(
			ApiRouteRuntime.executeGenerated(
				createGeneratedUpdateOptions(service, EApiRouteType.UPDATE, {
					relations: {
						response: {
							load: { include: { relation: true } },
							reference: { shape: EApiControllerRelationReferenceShape.SCALAR },
						},
					},
				} as never),
			),
		).rejects.toThrow("Generated get service function is not protected by its built-in decorator");
		expect(update).not.toHaveBeenCalled();
		expect(get).not.toHaveBeenCalled();
	});

	it("keeps validation outside REQUIRED and commits before route after", async () => {
		const order: Array<string> = [];
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const relationService: ApiServiceBase<RuntimeRouteRelationEntity> = new ApiServiceBase<RuntimeRouteRelationEntity>();

		vi.mocked(transaction.queryRunner.connect).mockImplementation(async (): Promise<void> => {
			order.push("connect");
		});
		vi.mocked(transaction.queryRunner.startTransaction).mockImplementation(async (): Promise<void> => {
			order.push("begin");
		});
		vi.mocked(transaction.queryRunner.commitTransaction).mockImplementation(async (): Promise<void> => {
			order.push("commit");
		});
		vi.spyOn(service, "create").mockImplementation(async (properties: Partial<RuntimeRouteEntity>): Promise<RuntimeRouteEntity> => {
			expect(ApiFunctionContextStorage.getEventManager()).toBe(transaction.entityManager);
			order.push("operation");

			return storeCreatedRow(properties);
		});
		vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);
			expect(ApiFunctionContextStorage.getEventManager()).toBe(transaction.entityManager);
			order.push("reload");

			return {
				id: "route-transaction-1",
				source: "response",
			};
		});
		vi.spyOn(relationService, "get").mockImplementation(async (): Promise<RuntimeRouteRelationEntity> => {
			expect(ApiFunctionContextStorage.getEventManager()).toBe(transaction.entityManager);
			order.push("hydrate");

			return {
				id: "request",
			};
		});
		vi.spyOn(ApiFunctionTransactionLifecycle, "executeAfterCommit").mockImplementation(async (registry): Promise<void> => {
			order.push("after-commit");
			expect(registry.getTransaction().owner).toEqual({
				entityName: "RuntimeRouteEntity",
				kind: EApiFunctionTransactionOwnerKind.ROUTE,
				methodName: "create",
				routeType: EApiRouteType.CREATE,
			});
		});
		vi.spyOn(ApiSubscriberExecutor, "executeRouteSubscribers").mockImplementation(async (...arguments_): Promise<undefined> => {
			const onType: EApiSubscriberOnType = arguments_[3];

			if (onType === EApiSubscriberOnType.BEFORE) {
				order.push("route-before");
			} else {
				expect(ApiFunctionContextStorage.getTransactionRegistry()).toBeUndefined();
				order.push("route-after");
			}

			return undefined;
		});

		const options = createGeneratedCreateOptions(
			service,
			{
				relations: {
					request: {
						load: {
							include: {
								relation: true,
							},
						},
						reference: {
							shape: EApiControllerRelationReferenceShape.SCALAR,
						},
					},
				},
				request: {
					[EApiControllerRequestTarget.BODY]: {
						validators: [
							{
								errorType: EErrorStringAction.ARGUMENT_NOT_VALID,
								exception: BadRequestException,
								validationFunction: (): boolean => {
									expect(ApiFunctionContextStorage.getTransactionRegistry()).toBeUndefined();
									order.push("validate");

									return true;
								},
							},
						],
					},
				},
				transaction: {
					mode: EApiFunctionTransactionMode.REQUIRED,
				},
			} as never,
			{
				id: "route-transaction-1",
				relation: "request" as never,
			},
		);

		Object.assign(options.controller, {
			relationService,
		});

		await ApiRouteRuntime.executeGenerated(options);

		expect(order).toEqual(["route-before", "validate", "connect", "begin", "hydrate", "operation", "reload", "commit", "after-commit", "route-after"]);
		expect(transaction.queryRunner.rollbackTransaction).not.toHaveBeenCalled();
	});

	it.each([EApiRouteType.PARTIAL_UPDATE, EApiRouteType.UPDATE] as const)("keeps %s hydration, operation, and reload inside REQUIRED", async (method) => {
		const order: Array<string> = [];
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const relationService: ApiServiceBase<RuntimeRouteRelationEntity> = new ApiServiceBase<RuntimeRouteRelationEntity>();

		vi.mocked(transaction.queryRunner.startTransaction).mockImplementation(async (): Promise<void> => {
			order.push("begin");
		});
		vi.mocked(transaction.queryRunner.commitTransaction).mockImplementation(async (): Promise<void> => {
			order.push("commit");
		});
		vi.spyOn(relationService, "get").mockImplementation(async (): Promise<RuntimeRouteRelationEntity> => {
			expect(ApiFunctionContextStorage.getEventManager()).toBe(transaction.entityManager);
			order.push("hydrate");

			return {
				id: "request",
			};
		});
		vi.spyOn(service, "update").mockImplementation(async (criteria, properties): Promise<RuntimeRouteEntity> => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.UPDATE, criteria);
			expect(ApiFunctionContextStorage.getEventManager()).toBe(transaction.entityManager);
			order.push("operation");

			return {
				id: "route-transaction-1",
				...properties,
			};
		});
		vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);
			expect(ApiFunctionContextStorage.getEventManager()).toBe(transaction.entityManager);
			order.push("reload");

			return {
				id: "route-transaction-1",
				source: "response",
			};
		});

		const options = createGeneratedUpdateOptions(service, method, {
			relations: {
				request: {
					load: {
						include: {
							relation: true,
						},
					},
					reference: {
						shape: EApiControllerRelationReferenceShape.SCALAR,
					},
				},
				response: {
					load: {
						include: {
							relation: true,
						},
					},
					reference: {
						shape: EApiControllerRelationReferenceShape.SCALAR,
					},
				},
			},
			request: {
				[EApiControllerRequestTarget.BODY]: {
					validators: [
						{
							errorType: EErrorStringAction.ARGUMENT_NOT_VALID,
							exception: BadRequestException,
							validationFunction: (): boolean => {
								expect(ApiFunctionContextStorage.getEventManager()).toBeUndefined();
								order.push("validate");

								return true;
							},
						},
					],
				},
			},
			transaction: {
				mode: EApiFunctionTransactionMode.REQUIRED,
			},
		} as never);

		Object.assign(options.controller, {
			relationService,
		});

		await expect(ApiRouteRuntime.executeGenerated(options)).resolves.toMatchObject({
			id: "route-transaction-1",
		});
		expect(order).toEqual(["validate", "begin", "hydrate", "operation", "reload", "commit"]);
		expect(transaction.queryRunner.rollbackTransaction).not.toHaveBeenCalled();
		expect(ApiFunctionContextStorage.getTransactionRegistry()).toBeUndefined();
	});

	it("rolls back UPDATE when generated response reload fails", async () => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const reloadError: Error = new Error("update reload failed");

		vi.spyOn(service, "update").mockImplementation(async (criteria): Promise<RuntimeRouteEntity> => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.UPDATE, criteria);

			return {
				id: "route-transaction-1",
				source: "updated",
			};
		});
		vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);

			throw reloadError;
		});

		await expect(
			ApiRouteRuntime.executeGenerated(
				createGeneratedUpdateOptions(service, EApiRouteType.UPDATE, {
					relations: {
						response: {
							load: {
								include: {
									relation: true,
								},
							},
							reference: {
								shape: EApiControllerRelationReferenceShape.SCALAR,
							},
						},
					},
					transaction: {
						mode: EApiFunctionTransactionMode.REQUIRED,
					},
				} as never),
			),
		).rejects.toBe(reloadError);
		expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
	});

	it.each([EApiRouteType.DELETE, EApiRouteType.GET, EApiRouteType.GET_LIST] as const)("runs generated %s inside a route-owned transaction", async (method) => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const assertActiveManager = (): void => {
			expect(ApiFunctionContextStorage.getEventManager()).toBe(transaction.entityManager);
		};

		if (method === EApiRouteType.DELETE) {
			vi.spyOn(service, "delete").mockImplementation(async (criteria): Promise<void> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.DELETE, criteria);
				assertActiveManager();
			});
		} else if (method === EApiRouteType.GET) {
			vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);
				assertActiveManager();

				return {
					id: "route-transaction-1",
				};
			});
		} else {
			vi.spyOn(service, "getList").mockImplementation(async (properties) => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET_LIST, properties);
				assertActiveManager();

				return {
					count: 0,
					currentPage: 1,
					items: [],
					totalCount: 0,
					totalPages: 0,
				};
			});
		}

		await ApiRouteRuntime.executeGenerated(createGeneratedReadOrDeleteOptions(service, method));

		expect(transaction.dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.rollbackTransaction).not.toHaveBeenCalled();
	});

	it.each([
		["omitted", undefined],
		["SUPPORTS", EApiFunctionTransactionMode.SUPPORTS],
	] as const)("opens a route transaction for a create when mode is %s", async (_label, mode) => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const routeConfig: TApiControllerPropertiesRoute<RuntimeRouteEntity, EApiRouteType.CREATE> = mode
			? {
					transaction: {
						mode,
					},
				}
			: {};

		await expect(ApiRouteRuntime.executeGenerated(createGeneratedCreateOptions(service, routeConfig))).resolves.toMatchObject({
			id: "route-transaction-1",
		});
		expect(ApiFunctionContextStorage.getTransactionRegistry()).toBeUndefined();
		expect(transaction.queryRunner.startTransaction).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
	});

	it.each([EApiFunctionTransactionMode.MANDATORY, EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.SUPPORTS])("joins an active manager for route mode %s without opening another transaction", async (mode) => {
		const outerTransaction = createRouteTransactionFixture();
		const innerTransaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(innerTransaction.dataSource);

		vi.spyOn(service, "create").mockImplementation(async (properties: Partial<RuntimeRouteEntity>): Promise<RuntimeRouteEntity> => {
			expect(ApiFunctionContextStorage.getEventManager()).toBe(outerTransaction.entityManager);

			return storeCreatedRow(properties);
		});

		await ApiFunctionTransactionScope.runWithDataSource(outerTransaction.dataSource, { name: "outer-route" }, async (): Promise<void> => {
			await ApiRouteRuntime.executeGenerated(
				createGeneratedCreateOptions(service, {
					transaction: {
						mode,
					},
				}),
			);
		});

		expect(outerTransaction.dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(innerTransaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		expect(outerTransaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
	});

	it.each([EApiFunctionTransactionMode.MANDATORY, EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.SUPPORTS])("shares one route-owned manager with an inner %s function", async (mode) => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const repository: Repository<RuntimeRouteEntity> = (service as unknown as { repository: Repository<RuntimeRouteEntity> }).repository;

		vi.spyOn(service, "create").mockImplementation(
			async (properties: Partial<RuntimeRouteEntity>): Promise<RuntimeRouteEntity> =>
				await ApiFunctionExecuteWithTransaction({
					callback: async (eventManager): Promise<RuntimeRouteEntity> => {
						expect(eventManager).toBe(transaction.entityManager);

						return storeCreatedRow(properties);
					},
					entity: RuntimeRouteEntity,
					functionType: EApiFunctionType.CREATE,
					methodName: "create",
					mode,
					repository,
				}),
		);

		await ApiRouteRuntime.executeGenerated(
			createGeneratedCreateOptions(service, {
				transaction: {
					mode: EApiFunctionTransactionMode.REQUIRED,
				},
			}),
		);

		expect(transaction.dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
	});

	it("rolls back a route-owned transaction when an inner NONE function rejects it", async () => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const repository: Repository<RuntimeRouteEntity> = (service as unknown as { repository: Repository<RuntimeRouteEntity> }).repository;

		vi.spyOn(service, "create").mockImplementation(
			async (properties: Partial<RuntimeRouteEntity>): Promise<RuntimeRouteEntity> =>
				await ApiFunctionExecuteWithTransaction({
					callback: async (): Promise<RuntimeRouteEntity> => properties as RuntimeRouteEntity,
					entity: RuntimeRouteEntity,
					functionType: EApiFunctionType.CREATE,
					methodName: "create",
					mode: EApiFunctionTransactionMode.NONE,
					repository,
				}),
		);

		await expect(
			ApiRouteRuntime.executeGenerated(
				createGeneratedCreateOptions(service, {
					transaction: {
						mode: EApiFunctionTransactionMode.REQUIRED,
					},
				}),
			),
		).rejects.toThrow("ApiFunction transaction mode NONE cannot run inside an active transaction");
		expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
	});

	it("requires an active transaction for MANDATORY", async () => {
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();

		await expect(
			ApiRouteRuntime.executeGenerated(
				createGeneratedCreateOptions(service, {
					transaction: {
						mode: EApiFunctionTransactionMode.MANDATORY,
					},
				}),
			),
		).rejects.toThrow("ApiRoute generated transaction mode MANDATORY requires an active transaction");
		expect(service.create).not.toHaveBeenCalled();
	});

	it("runs NONE without a transaction and rejects NONE inside an active transaction", async () => {
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();
		const options = createGeneratedReadOrDeleteOptions(service, EApiRouteType.DELETE);

		(options.properties.routes[EApiRouteType.DELETE] as { transaction: { mode: EApiFunctionTransactionMode } }).transaction.mode = EApiFunctionTransactionMode.NONE;

		await expect(ApiRouteRuntime.executeGenerated(options)).resolves.toBeUndefined();
		expect(service.delete).toHaveBeenCalledTimes(1);

		const outerTransaction = createRouteTransactionFixture();

		await expect(
			ApiFunctionTransactionScope.runWithDataSource(outerTransaction.dataSource, { name: "outer-none" }, async (): Promise<void> => {
				await ApiRouteRuntime.executeGenerated(options);
			}),
		).rejects.toThrow("ApiRoute generated transaction mode NONE cannot run inside an active transaction");
		expect(outerTransaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
	});

	it("rejects REQUIRED when the controller service repository is missing", async () => {
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();
		Reflect.deleteProperty(service, "repository");

		await expect(
			ApiRouteRuntime.executeGenerated(
				createGeneratedCreateOptions(service, {
					transaction: {
						mode: EApiFunctionTransactionMode.REQUIRED,
					},
				}),
			),
		).rejects.toThrow("Repository is not available in this context");
		expect(service.create).not.toHaveBeenCalled();
	});

	it("does not open REQUIRED when request validation fails", async () => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

		await expect(
			ApiRouteRuntime.executeGenerated(
				createGeneratedCreateOptions(service, {
					request: {
						[EApiControllerRequestTarget.BODY]: {
							validators: [
								{
									errorType: EErrorStringAction.ARGUMENT_NOT_VALID,
									exception: BadRequestException,
									validationFunction: (): boolean => false,
								},
							],
						},
					},
					transaction: {
						mode: EApiFunctionTransactionMode.REQUIRED,
					},
				} as never),
			),
		).rejects.toBeInstanceOf(BadRequestException);
		expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		expect(service.create).not.toHaveBeenCalled();
	});

	it("rolls back when the generated operation fails", async () => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const operationError: Error = new Error("operation failed");

		vi.spyOn(service, "create").mockRejectedValue(operationError);

		await expect(
			ApiRouteRuntime.executeGenerated(
				createGeneratedCreateOptions(service, {
					transaction: {
						mode: EApiFunctionTransactionMode.REQUIRED,
					},
				}),
			),
		).rejects.toBe(operationError);
		expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		expect(service.get).not.toHaveBeenCalled();
	});

	it("rolls back when the generated response reload fails", async () => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const reloadError: Error = new Error("reload failed");

		vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
			ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);

			throw reloadError;
		});

		await expect(
			ApiRouteRuntime.executeGenerated(
				createGeneratedCreateOptions(service, {
					transaction: {
						mode: EApiFunctionTransactionMode.REQUIRED,
					},
				}),
			),
		).rejects.toBe(reloadError);
		expect(service.create).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
	});

	describe("scoped CREATE", () => {
		function createScopedCreateOptions(service: ApiServiceBase<RuntimeRouteEntity>, where: unknown, routeConfig: TApiControllerPropertiesRoute<RuntimeRouteEntity, EApiRouteType.CREATE> = {}): IApiRouteRuntimeGeneratedExecutionOptions<RuntimeRouteEntity, EApiRouteType.CREATE> {
			const options = createGeneratedCreateOptions(service, routeConfig);

			options.targets.authenticationRequest = { authorizationDecision: { scope: { where }, transforms: [] } } as never;

			return options;
		}

		function mockReloadMiss(service: ApiServiceBase<RuntimeRouteEntity>, reloadError: Error): void {
			vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);
				ApiControllerGeneratedReadScopeStorage.markReadMissed(properties);

				throw reloadError;
			});
		}

		it.each([
			["an omitted scope", undefined],
			["an empty WHERE object", {}],
			["a scalar WHERE", { source: "response" }],
			["a WHERE array", [{ source: "response" }, { source: "request" }]],
			["a match-nothing WHERE", { id: In([]) }],
		])("opens a route-owned transaction under SUPPORTS for %s", async (_name: string, where: unknown) => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);
				expect(ApiFunctionContextStorage.getTransactionRegistry()?.getTransaction().owner.kind).toBe(EApiFunctionTransactionOwnerKind.ROUTE);
				expect(ApiFunctionContextStorage.getEventManager()).toBe(transaction.entityManager);

				return { id: "route-transaction-1", source: "response" };
			});

			await ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, where));

			expect(transaction.queryRunner.startTransaction).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		});

		it.each([EApiFunctionTransactionMode.SUPPORTS, EApiFunctionTransactionMode.REQUIRED])("refuses a scoped reload miss with 403 and rolls back under %s", async (mode: EApiFunctionTransactionMode) => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			mockReloadMiss(service, new NotFoundException());

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }, { transaction: { mode } }))).rejects.toBeInstanceOf(ForbiddenException);
			expect(service.create).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		});

		it("keeps the 404 of a reload miss without a scope and rolls back", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const reloadError: NotFoundException = new NotFoundException();

			mockReloadMiss(service, reloadError);

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, undefined))).rejects.toBe(reloadError);
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it("keeps a reload 404 that is not the read miss and rolls back", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const reloadError: NotFoundException = new NotFoundException();

			vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);

				throw reloadError;
			});

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }))).rejects.toBe(reloadError);
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it("keeps a 404 from the generated operation and rolls back", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const operationError: NotFoundException = new NotFoundException();

			vi.spyOn(service, "create").mockRejectedValue(operationError);

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }))).rejects.toBe(operationError);
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it("keeps a 404 from request relation hydration before writing", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const relationService: ApiServiceBase<RuntimeRouteRelationEntity> = new ApiServiceBase<RuntimeRouteRelationEntity>();
			const hydrationError: NotFoundException = new NotFoundException();

			vi.spyOn(relationService, "get").mockRejectedValue(hydrationError);

			const options = createScopedCreateOptions(service, { source: "response" }, {
				relations: {
					request: {
						load: {
							include: {
								relation: true,
							},
						},
						reference: {
							shape: EApiControllerRelationReferenceShape.SCALAR,
						},
					},
				},
			} as never);

			options.targets.body = { id: "route-transaction-1", relation: "request" as never, source: "request" };
			(options.controller as unknown as { relationService: ApiServiceBase<RuntimeRouteRelationEntity> }).relationService = relationService;

			await expect(ApiRouteRuntime.executeGenerated(options)).rejects.toBe(hydrationError);
			expect(service.create).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it.each([
			[EApiFunctionTransactionMode.NONE, "scoped", { source: "response" }],
			[EApiFunctionTransactionMode.NONE, "non-scoped", undefined],
			["UNKNOWN" as EApiFunctionTransactionMode, "scoped", { source: "response" }],
		])("fails closed on a %s %s route before writing", async (mode: EApiFunctionTransactionMode, _name: string, where: unknown) => {
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, where, { transaction: { mode } }))).rejects.toThrow("ApiRoute generated transaction mode cannot run a create without a transaction");
			expect(service.create).not.toHaveBeenCalled();
		});

		it.each([
			["a scoped", { source: "response" }],
			["a non-scoped", undefined],
		])("rejects an unprotected create on %s route before the transaction and the write", async (_name: string, where: unknown) => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const unprotectedCreate = vi.fn();

			Object.defineProperty(service, "create", { value: unprotectedCreate });

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, where))).rejects.toThrow("Generated create service function is not protected by its built-in decorator");
			expect(unprotectedCreate).not.toHaveBeenCalled();
			expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		function createCompositeOptions(service: ApiServiceBase<RuntimeRouteEntity>, where: unknown): IApiRouteRuntimeGeneratedExecutionOptions<RuntimeRouteEntity, EApiRouteType.CREATE> {
			const options = createScopedCreateOptions(service, where);

			options.entityMetadata.columns = [
				{ isPrimary: true, name: "source", type: "varchar" },
				{ isPrimary: true, name: "id", type: "varchar" },
			];

			return options;
		}

		it("reloads a composite key through every primary column", async () => {
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(createRouteTransactionFixture().dataSource);

			vi.mocked(service.create).mockImplementation(async (properties): Promise<RuntimeRouteEntity> => storeCreatedRow(properties, ["id", "source"]));

			await ApiRouteRuntime.executeGenerated(createCompositeOptions(service, undefined));

			expect(vi.mocked(service.get).mock.calls[0]?.[0].where).toEqual({ id: "route-transaction-1", source: "request" });
		});

		function mockStoredRow(service: ApiServiceBase<RuntimeRouteEntity>, storedRow: object, returnedRow: object = storedRow, keys: ReadonlyArray<string> = ["id"]): void {
			vi.mocked(service.create).mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
				reportStoredRow(properties, storedRow, keys);

				return returnedRow as RuntimeRouteEntity;
			});
		}

		it.each([undefined, null])("rolls back, naming the cause, when a part of the composite key the create stored is %s", async (value: null | undefined) => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			mockStoredRow(service, { id: "route-transaction-1", source: value }, undefined, ["id", "source"]);

			await expect(ApiRouteRuntime.executeGenerated(createCompositeOptions(service, { source: "response" }))).rejects.toThrow("Generated CREATE route cannot read the RuntimeRouteEntity row it inserted: the saved entity has no primary key value TypeORM knows");
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it.each([
			["a scoped", { source: "response" }],
			["a non-scoped", undefined],
		])("rolls back %s create result that holds no primary column instead of reloading by scope alone", async (_name: string, where: unknown) => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const options = createCompositeOptions(service, where);

			mockStoredRow(service, { id: null, name: "stored" }, undefined, ["id", "source"]);
			options.properties.routes[EApiRouteType.CREATE] = { ...options.properties.routes[EApiRouteType.CREATE], transaction: { mode: EApiFunctionTransactionMode.REQUIRED } } as never;

			await expect(ApiRouteRuntime.executeGenerated(options)).rejects.toThrow("Generated CREATE route cannot read the RuntimeRouteEntity row it inserted: the saved entity has no primary key value TypeORM knows");
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		});

		it("fails before the transaction when the entity metadata has no primary column", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const options = createScopedCreateOptions(service, { source: "response" });

			options.entityMetadata.columns = [{ isPrimary: false, name: "id", type: "varchar" }];

			// The route resolves its path plan before it validates the body, so nothing opens a transaction.
			await expect(ApiRouteRuntime.executeGenerated(options)).rejects.toThrow("Primary key not found in entity columns");
			expect(service.create).not.toHaveBeenCalled();
			expect(transaction.queryRunner.startTransaction).not.toHaveBeenCalled();
			expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		});

		it.each([
			["no stored row", []],
			["a sibling row", [STORED_ROW, { id: "route-transaction-1", source: "sibling" }]],
		])("rolls back with 500 when the create identity matches %s", async (_name: string, storedRows: Array<RuntimeRouteEntity>) => {
			const transaction = createRouteTransactionFixture(storedRows);
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }))).rejects.toThrow("Generated create result must identify exactly one stored row");
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		});

		it("rolls back with 500 when a sibling row matches the identity after the reload", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const repository: Repository<RuntimeRouteEntity> = vi.mocked(transaction.entityManager.getRepository)(RuntimeRouteEntity) as Repository<RuntimeRouteEntity>;

			vi.mocked(repository.count).mockResolvedValueOnce(1).mockResolvedValueOnce(2);

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }))).rejects.toThrow("Generated create result must identify exactly one stored row");
			expect(service.get).toHaveBeenCalledTimes(1);
			expect(repository.count).toHaveBeenCalledTimes(2);
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		});

		it("checks the identity of a non-scoped create through the transaction repository", async () => {
			const transaction = createRouteTransactionFixture([]);
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, undefined))).rejects.toThrow("Generated create result must identify exactly one stored row");
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it.each([
			["timestamp with time zone", new Date("2026-01-02T03:04:05.678Z"), (value: Date): string => value.toISOString()],
			["timestamptz", new Date("2026-01-02T03:04:05.678Z"), (value: Date): string => value.toISOString()],
			["timestamp without time zone", new Date("2026-01-02T03:04:05.678Z"), (value: Date): Date => value],
			["datetime", "2026-01-02T03:04:05.678Z", (value: Date): Date => value],
		])("matches a %s primary column by its whole millisecond", async (columnType: string, storedValue: Date | string, bind: (value: Date) => Date | string) => {
			const transaction = createRouteTransactionFixture([STORED_ROW], [{ propertyName: "createdAt", type: columnType }]);
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const options = createCompositeOptions(service, { source: "response" });

			options.entityMetadata.columns = [
				{ isPrimary: true, name: "id", type: "varchar" },
				{ isPrimary: true, name: "createdAt" as never, type: columnType as never },
			];
			mockStoredRow(service, { createdAt: storedValue, id: "route-transaction-1" }, undefined, ["id", "createdAt"]);

			await ApiRouteRuntime.executeGenerated(options);

			const where: Record<string, unknown> = vi.mocked(service.get).mock.calls[0]?.[0].where as Record<string, unknown>;

			expect(where.createdAt).toEqual(And(MoreThanOrEqual(bind(new Date("2026-01-02T03:04:05.678Z"))), LessThan(bind(new Date("2026-01-02T03:04:05.679Z")))));
			expect(where.id).toEqual(Equal("route-transaction-1"));
		});

		it.each([
			["a date column", "date", "2026-01-02"],
			["a column the repository does not describe", undefined, new Date("2026-01-02T03:04:05.678Z")],
		])("matches %s by equality", async (_name: string, columnType: string | undefined, storedValue: Date | string) => {
			const transaction = createRouteTransactionFixture([STORED_ROW], columnType ? [{ propertyName: "createdAt", type: columnType }] : []);
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const options = createCompositeOptions(service, { source: "response" });

			options.entityMetadata.columns = [
				{ isPrimary: true, name: "id", type: "varchar" },
				{ isPrimary: true, name: "createdAt" as never, type: "date" },
			];
			mockStoredRow(service, { createdAt: storedValue, id: "route-transaction-1" }, undefined, ["id", "createdAt"]);

			await ApiRouteRuntime.executeGenerated(options);

			expect((vi.mocked(service.get).mock.calls[0]?.[0].where as Record<string, unknown>).createdAt).toEqual(Equal(storedValue));
		});

		it.each([
			["text", "not a date"],
			["an invalid Date", new Date(Number.NaN)],
		])("rolls back a create result whose date and time key holds %s", async (_name: string, storedValue: Date | string) => {
			const transaction = createRouteTransactionFixture([STORED_ROW], [{ propertyName: "createdAt", type: "timestamptz" }]);
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const options = createCompositeOptions(service, { source: "response" });

			options.entityMetadata.columns = [
				{ isPrimary: true, name: "id", type: "varchar" },
				{ isPrimary: true, name: "createdAt" as never, type: "timestamptz" },
			];
			mockStoredRow(service, { createdAt: storedValue, id: "route-transaction-1" }, undefined, ["id", "createdAt"]);

			await expect(ApiRouteRuntime.executeGenerated(options)).rejects.toThrow("Generated create result holds an invalid date in primary column createdAt");
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it("writes the parsed date and time key of the body before the transaction and the write", async () => {
			const transaction = createRouteTransactionFixture([STORED_ROW], [{ propertyName: "createdAt", type: "timestamptz" }]);
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const options = createScopedCreateOptions(service, undefined);

			Object.defineProperty(service, "repository", { value: createStoredRowRepository([STORED_ROW], [{ propertyName: "createdAt", type: "timestamptz" }], transaction.dataSource) });
			options.targets.body = { createdAt: "2026-01-02T03:04:05.678Z", id: "route-transaction-1" } as never;

			await ApiRouteRuntime.executeGenerated(options);

			const written: { createdAt: unknown; id: unknown } = vi.mocked(service.create).mock.calls[0]?.[0] as never;

			expect(written.id).toBe("route-transaction-1");
			expect(written.createdAt).toBeInstanceOf(Date);
			expect((written.createdAt as Date).toISOString()).toBe("2026-01-02T03:04:05.678Z");
		});

		it("refuses a date and time key the column cannot store before the transaction and the write", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const options = createScopedCreateOptions(service, undefined);

			Object.defineProperty(service, "repository", { value: createStoredRowRepository([STORED_ROW], [{ propertyName: "createdAt", type: "timestamptz" }], transaction.dataSource) });
			options.targets.body = { createdAt: "2026-01-02T03:04:05.678", id: "route-transaction-1" } as never;

			await expect(ApiRouteRuntime.executeGenerated(options)).rejects.toBeInstanceOf(BadRequestException);
			expect(service.create).not.toHaveBeenCalled();
			expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it.each([
			["before", "after"],
			["after", "before"],
		])("ignores a nested create with another input that reports its row %s the protected create", async (nestedOrder: string) => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			vi.mocked(service.create).mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.CREATE, properties);

				if (nestedOrder === "before") {
					ApiControllerGeneratedInsertedKeyStorage.claim({ id: "inner" }, "RuntimeRouteEntity")?.({ id: "inner" });
				}

				ApiControllerGeneratedInsertedKeyStorage.claim(properties, "RuntimeRouteEntity")?.({ id: "route-transaction-1" });

				if (nestedOrder === "after") {
					ApiControllerGeneratedInsertedKeyStorage.claim({ id: "inner" }, "RuntimeRouteEntity")?.({ id: "inner" });
				}

				return properties as RuntimeRouteEntity;
			});

			await ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }));

			expect(vi.mocked(service.get).mock.calls[0]?.[0].where).toEqual({ id: Equal("route-transaction-1"), source: Equal("response") });
			expect(transaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		});

		it("checks the stored row of a scoped create instead of the result its subscribers returned", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			mockStoredRow(service, { id: "planted", source: "request" }, { id: "decoy", source: "response" });
			mockReloadMiss(service, new NotFoundException());

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }))).rejects.toBeInstanceOf(ForbiddenException);
			expect(vi.mocked(service.get).mock.calls[0]?.[0].where).toEqual({ id: Equal("planted"), source: Equal("response") });
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it("rolls back a scoped create function that does not report its stored row", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			vi.mocked(service.create).mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.CREATE, properties);

				return properties as RuntimeRouteEntity;
			});

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }))).rejects.toThrow("Generated CREATE function did not report the key of the row it inserted");
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it("keeps the key of the first claim when one scoped create claims twice", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			vi.mocked(service.create).mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
				reportStoredRow(properties, properties, ["id"]);
				ApiControllerGeneratedInsertedKeyStorage.claim(properties, "RuntimeRouteEntity")?.({ id: "decoy" });

				return properties as RuntimeRouteEntity;
			});

			await ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }));

			expect(vi.mocked(service.get).mock.calls[0]?.[0].where).toEqual({ id: Equal("route-transaction-1"), source: Equal("response") });
			expect(transaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		});

		it("rejects an empty WHERE array before opening a transaction or writing", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, []))).rejects.toThrow("Authorization scope WHERE cannot be an empty array");
			expect(service.create).not.toHaveBeenCalled();
			expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		});
	});

	describe.each([EApiRouteType.UPDATE, EApiRouteType.PARTIAL_UPDATE] as const)("scoped %s", (method: EApiRouteType.PARTIAL_UPDATE | EApiRouteType.UPDATE) => {
		function createScopedUpdateOptions(service: ApiServiceBase<RuntimeRouteEntity>, where: unknown, routeConfig: TApiControllerPropertiesRoute<RuntimeRouteEntity, EApiRouteType.PARTIAL_UPDATE | EApiRouteType.UPDATE> = {}): IApiRouteRuntimeGeneratedExecutionOptions<RuntimeRouteEntity, EApiRouteType.PARTIAL_UPDATE | EApiRouteType.UPDATE> {
			const options = createGeneratedUpdateOptions(service, method, routeConfig);

			options.targets.authenticationRequest = { authorizationDecision: { scope: { where }, transforms: [] } } as never;
			options.targets.body = { source: "request" };

			return options;
		}

		function mockReloadMiss(service: ApiServiceBase<RuntimeRouteEntity>, reloadError: Error): void {
			vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);
				ApiControllerGeneratedReadScopeStorage.markReadMissed(properties);

				throw reloadError;
			});
		}

		it.each([
			["an omitted scope", undefined],
			["an empty WHERE object", {}],
		])("opens no transaction under SUPPORTS for %s", async (_name: string, where: unknown) => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			vi.spyOn(service, "update").mockImplementation(async (criteria, properties): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.UPDATE, criteria);
				expect(ApiFunctionContextStorage.getTransactionRegistry()).toBeUndefined();

				return { id: "route-transaction-1", ...properties };
			});

			await ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, where));

			expect(service.update).toHaveBeenCalledTimes(1);
			expect(service.get).toHaveBeenCalledTimes(1);
			expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it("keeps the 404 of a reload miss without a scope", async () => {
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();
			const reloadError: NotFoundException = new NotFoundException();

			mockReloadMiss(service, reloadError);

			await expect(ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, undefined))).rejects.toBe(reloadError);
		});

		it.each([
			["a scalar WHERE", { source: "response" }],
			["a WHERE array", [{ source: "response" }, { source: "request" }]],
			["a match-nothing WHERE", { id: In([]) }],
		])("opens a route-owned transaction under SUPPORTS for %s", async (_name: string, where: unknown) => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			vi.spyOn(service, "update").mockImplementation(async (criteria, properties): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.UPDATE, criteria);
				expect(ApiFunctionContextStorage.getTransactionRegistry()?.getTransaction().owner.kind).toBe(EApiFunctionTransactionOwnerKind.ROUTE);
				expect(ApiFunctionContextStorage.getEventManager()).toBe(transaction.entityManager);

				return { id: "route-transaction-1", ...properties };
			});

			await ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, where));

			expect(transaction.queryRunner.startTransaction).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		});

		it.each([EApiFunctionTransactionMode.SUPPORTS, EApiFunctionTransactionMode.REQUIRED])("refuses a scoped reload miss with 403 and rolls back under %s", async (mode: EApiFunctionTransactionMode) => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			mockReloadMiss(service, new NotFoundException());

			await expect(ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, { source: "response" }, { transaction: { mode } }))).rejects.toBeInstanceOf(ForbiddenException);
			expect(service.update).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		});

		it("reloads through the same scoped criteria as the write", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			await ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, { source: "response" }));

			expect(vi.mocked(service.get).mock.calls[0]?.[0].where).toEqual(vi.mocked(service.update).mock.calls[0]?.[0]);
		});

		it("keeps a reload 404 that is not the read miss and rolls back", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const reloadError: NotFoundException = new NotFoundException();

			vi.spyOn(service, "get").mockImplementation(async (properties): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);

				throw reloadError;
			});

			await expect(ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, { source: "response" }))).rejects.toBe(reloadError);
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it("keeps the 404 of an old row outside the scope and rolls back", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const operationError: NotFoundException = new NotFoundException();

			vi.spyOn(service, "update").mockRejectedValue(operationError);

			await expect(ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, { source: "response" }))).rejects.toBe(operationError);
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it.each([EApiFunctionTransactionMode.NONE, "UNKNOWN" as EApiFunctionTransactionMode])("fails closed on a scoped %s route before writing", async (mode: EApiFunctionTransactionMode) => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			await expect(ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, { source: "response" }, { transaction: { mode } }))).rejects.toThrow("ApiRoute generated transaction mode cannot run a scoped update without a transaction");
			expect(service.update).not.toHaveBeenCalled();
			expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it("runs a non-scoped NONE route without a transaction", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			await ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, undefined, { transaction: { mode: EApiFunctionTransactionMode.NONE } }));

			expect(service.update).toHaveBeenCalledTimes(1);
			expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it("rolls back the route transaction when an inner NONE update function rejects it", async () => {
			const transaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const repository: Repository<RuntimeRouteEntity> = (service as unknown as { repository: Repository<RuntimeRouteEntity> }).repository;

			vi.spyOn(service, "update").mockImplementation(async (criteria): Promise<RuntimeRouteEntity> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.UPDATE, criteria);

				return await ApiFunctionExecuteWithTransaction({
					callback: async (): Promise<RuntimeRouteEntity> => ({ id: "route-transaction-1" }) as RuntimeRouteEntity,
					entity: RuntimeRouteEntity,
					functionType: EApiFunctionType.UPDATE,
					methodName: "update",
					mode: EApiFunctionTransactionMode.NONE,
					repository,
				});
			});

			await expect(ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, { source: "response" }))).rejects.toThrow("ApiFunction transaction mode NONE cannot run inside an active transaction");
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		});

		it("joins a MANDATORY outer owner, which rolls back on the refusal", async () => {
			const outerTransaction = createRouteTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(outerTransaction.dataSource);

			mockReloadMiss(service, new NotFoundException());

			await expect(
				ApiFunctionTransactionScope.runWithDataSource(outerTransaction.dataSource, { name: "outer-mandatory" }, async (): Promise<void> => {
					await ApiRouteRuntime.executeGenerated(createScopedUpdateOptions(service, { source: "response" }, { transaction: { mode: EApiFunctionTransactionMode.MANDATORY } }));
				}),
			).rejects.toBeInstanceOf(ForbiddenException);
			expect(outerTransaction.dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
			expect(outerTransaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
			expect(outerTransaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		});
	});

	it("does not represent a route-after failure as rollback after commit", async () => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const routeAfterError: Error = new Error("route after failed");

		vi.spyOn(ApiSubscriberExecutor, "executeRouteSubscribers").mockResolvedValueOnce(undefined).mockRejectedValueOnce(routeAfterError);

		await expect(
			ApiRouteRuntime.executeGenerated(
				createGeneratedCreateOptions(service, {
					transaction: {
						mode: EApiFunctionTransactionMode.REQUIRED,
					},
				}),
			),
		).rejects.toBe(routeAfterError);
		expect(transaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.rollbackTransaction).not.toHaveBeenCalled();
	});

	it("does not enter route-after when commit lifecycle fails after database commit", async () => {
		const transaction = createRouteTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const commitLifecycleError: Error = new Error("commit lifecycle failed");
		const routeSubscriber = vi.spyOn(ApiSubscriberExecutor, "executeRouteSubscribers").mockResolvedValue(undefined);

		vi.spyOn(ApiFunctionTransactionLifecycle, "executeAfterCommit").mockRejectedValue(commitLifecycleError);

		await expect(
			ApiRouteRuntime.executeGenerated(
				createGeneratedCreateOptions(service, {
					transaction: {
						mode: EApiFunctionTransactionMode.REQUIRED,
					},
				}),
			),
		).rejects.toBe(commitLifecycleError);
		expect(transaction.queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(transaction.queryRunner.rollbackTransaction).not.toHaveBeenCalled();
		expect(routeSubscriber).toHaveBeenCalledTimes(1);
		expect(routeSubscriber.mock.calls[0]?.[3]).toBe(EApiSubscriberOnType.BEFORE);
	});
});
