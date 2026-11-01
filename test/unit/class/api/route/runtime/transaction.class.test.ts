import type { IApiRouteRuntimeGeneratedExecutionOptions } from "@interface/class/api/route";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { DataSource, ObjectLiteral, Repository } from "typeorm";

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
import { In } from "typeorm";
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

function createRouteService(dataSource?: DataSource): ApiServiceBase<RuntimeRouteEntity> {
	const service: ApiServiceBase<RuntimeRouteEntity> = new ApiServiceBase<RuntimeRouteEntity>();

	if (dataSource) {
		Object.defineProperty(service, "repository", {
			value: createTypeOrmRepositoryStub<RuntimeRouteEntity>(dataSource),
		});
	}

	vi.spyOn(service, "create").mockImplementation(async (properties: Partial<RuntimeRouteEntity>): Promise<RuntimeRouteEntity> => properties as RuntimeRouteEntity);
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
	// The mocked CREATE functions do not save a row, so the key the route reads by is the id they return.
	vi.spyOn(ApiControllerGeneratedInsertedKeyStorage, "run").mockImplementation(async (_input: object, callback: () => Promise<unknown>): Promise<ObjectLiteral> => ({ id: ((await callback()) as RuntimeRouteEntity).id }));

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
		const transaction = createTransactionFixture();
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
		const transaction = createTransactionFixture();
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

			return properties as RuntimeRouteEntity;
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
		const transaction = createTransactionFixture();
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
		const transaction = createTransactionFixture();
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
		const transaction = createTransactionFixture();
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
	] as const)("does not open a route transaction when mode is %s", async (_label, mode) => {
		const transaction = createTransactionFixture();
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
		expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
	});

	it.each([EApiFunctionTransactionMode.MANDATORY, EApiFunctionTransactionMode.REQUIRED, EApiFunctionTransactionMode.SUPPORTS])("joins an active manager for route mode %s without opening another transaction", async (mode) => {
		const outerTransaction = createTransactionFixture();
		const innerTransaction = createTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(innerTransaction.dataSource);

		vi.spyOn(service, "create").mockImplementation(async (properties: Partial<RuntimeRouteEntity>): Promise<RuntimeRouteEntity> => {
			expect(ApiFunctionContextStorage.getEventManager()).toBe(outerTransaction.entityManager);

			return properties as RuntimeRouteEntity;
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
		const transaction = createTransactionFixture();
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
		const repository: Repository<RuntimeRouteEntity> = (service as unknown as { repository: Repository<RuntimeRouteEntity> }).repository;

		vi.spyOn(service, "create").mockImplementation(
			async (properties: Partial<RuntimeRouteEntity>): Promise<RuntimeRouteEntity> =>
				await ApiFunctionExecuteWithTransaction({
					callback: async (eventManager): Promise<RuntimeRouteEntity> => {
						expect(eventManager).toBe(transaction.entityManager);

						return properties as RuntimeRouteEntity;
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
		const transaction = createTransactionFixture();
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
		const options = createGeneratedCreateOptions(service, {
			transaction: {
				mode: EApiFunctionTransactionMode.NONE,
			},
		});

		await expect(ApiRouteRuntime.executeGenerated(options)).resolves.toMatchObject({
			id: "route-transaction-1",
		});

		const outerTransaction = createTransactionFixture();

		await expect(
			ApiFunctionTransactionScope.runWithDataSource(outerTransaction.dataSource, { name: "outer-none" }, async (): Promise<void> => {
				await ApiRouteRuntime.executeGenerated(options);
			}),
		).rejects.toThrow("ApiRoute generated transaction mode NONE cannot run inside an active transaction");
		expect(outerTransaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
	});

	it("rejects REQUIRED when the controller service repository is missing", async () => {
		const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();

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
		const transaction = createTransactionFixture();
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
		const transaction = createTransactionFixture();
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
		const transaction = createTransactionFixture();
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
		])("opens no transaction under SUPPORTS for %s", async (_name: string, where: unknown) => {
			const transaction = createTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			await ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, where));

			expect(service.create).toHaveBeenCalledTimes(1);
			expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it.each([
			["a scalar WHERE", { source: "response" }],
			["a WHERE array", [{ source: "response" }, { source: "request" }]],
			["a match-nothing WHERE", { id: In([]) }],
		])("opens a route-owned transaction under SUPPORTS for %s", async (_name: string, where: unknown) => {
			const transaction = createTransactionFixture();
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
			const transaction = createTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			mockReloadMiss(service, new NotFoundException());

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }, { transaction: { mode } }))).rejects.toBeInstanceOf(ForbiddenException);
			expect(service.create).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		});

		it("keeps the 404 of a reload miss without a scope", async () => {
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();
			const reloadError: NotFoundException = new NotFoundException();

			mockReloadMiss(service, reloadError);

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, undefined))).rejects.toBe(reloadError);
		});

		it("keeps a reload 404 that is not the read miss and rolls back", async () => {
			const transaction = createTransactionFixture();
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
			const transaction = createTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const operationError: NotFoundException = new NotFoundException();

			vi.spyOn(service, "create").mockRejectedValue(operationError);

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }))).rejects.toBe(operationError);
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		});

		it("keeps a 404 from request relation hydration before writing", async () => {
			const transaction = createTransactionFixture();
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

		it.each([EApiFunctionTransactionMode.NONE, "UNKNOWN" as EApiFunctionTransactionMode])("fails closed on a %s route before writing", async (mode: EApiFunctionTransactionMode) => {
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }, { transaction: { mode } }))).rejects.toThrow("ApiRoute generated transaction mode cannot enforce an authorization scope on a write without a transaction");
			expect(service.create).not.toHaveBeenCalled();
		});

		it("rejects an unprotected create before the transaction and the write", async () => {
			const transaction = createTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);
			const unprotectedCreate = vi.fn();

			Object.defineProperty(service, "create", { value: unprotectedCreate });

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, { source: "response" }))).rejects.toThrow("Generated create service function is not protected by its built-in decorator");
			expect(unprotectedCreate).not.toHaveBeenCalled();
			expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		});

		it("keeps an unprotected create on a non-scoped route", async () => {
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();
			const unprotectedCreate = vi.fn(async (): Promise<RuntimeRouteEntity> => ({ id: "route-transaction-1", source: "response" }));

			Object.defineProperty(service, "create", { value: unprotectedCreate });

			await ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, undefined));

			expect(unprotectedCreate).toHaveBeenCalledTimes(1);
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
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();

			await ApiRouteRuntime.executeGenerated(createCompositeOptions(service, undefined));

			expect(vi.mocked(service.get).mock.calls[0]?.[0].where).toEqual({ id: "route-transaction-1", source: "request" });
		});

		it.each([undefined, null])("rolls back a create result whose primary column is %s instead of reloading by scope alone", async (value: null | undefined) => {
			const transaction = createTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			vi.mocked(service.create).mockResolvedValue({ id: "route-transaction-1", source: value } as never);

			await expect(ApiRouteRuntime.executeGenerated(createCompositeOptions(service, { source: "response" }))).rejects.toThrow("Generated create result must hold every primary key column");
			expect(service.get).not.toHaveBeenCalled();
			expect(transaction.queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
			expect(transaction.queryRunner.commitTransaction).not.toHaveBeenCalled();
		});

		it("keeps a non-scoped NONE route outside any transaction", async () => {
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService();

			await ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, {}, { transaction: { mode: EApiFunctionTransactionMode.NONE } }));

			expect(service.create).toHaveBeenCalledTimes(1);
		});

		it("rejects an empty WHERE array before opening a transaction or writing", async () => {
			const transaction = createTransactionFixture();
			const service: ApiServiceBase<RuntimeRouteEntity> = createRouteService(transaction.dataSource);

			await expect(ApiRouteRuntime.executeGenerated(createScopedCreateOptions(service, []))).rejects.toThrow("Authorization scope WHERE cannot be an empty array");
			expect(service.create).not.toHaveBeenCalled();
			expect(transaction.dataSource.createQueryRunner).not.toHaveBeenCalled();
		});
	});

	it("does not represent a route-after failure as rollback after commit", async () => {
		const transaction = createTransactionFixture();
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
		const transaction = createTransactionFixture();
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
