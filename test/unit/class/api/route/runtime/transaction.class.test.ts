import type { IApiRouteRuntimeGeneratedExecutionOptions } from "@interface/class/api/route";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { DataSource, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionLifecycle } from "@class/api/function/transaction/lifecycle.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiDtoType, EApiFunctionTransactionMode, EApiFunctionTransactionOwnerKind, EApiFunctionType, EApiRouteType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { BadRequestException } from "@nestjs/common";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTransactionFixture, resetApiSubscriberRegistry } from "@test/unit/fixture";
import { RuntimeRouteEntity, RuntimeRouteRelationEntity, RuntimeRouteResponseDTO } from "@test/unit/class/api/route/runtime/fixture";

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
			value: {
				manager: {
					connection: dataSource,
				},
			} as Repository<RuntimeRouteEntity>,
		});
	}

	vi.spyOn(service, "create").mockImplementation(async (properties: Partial<RuntimeRouteEntity>): Promise<RuntimeRouteEntity> => properties as RuntimeRouteEntity);
	vi.spyOn(service, "get").mockResolvedValue({
		id: "route-transaction-1",
		source: "response",
	});

	return service;
}

afterEach(() => {
	vi.restoreAllMocks();
	resetApiSubscriberRegistry();
});

describe("ApiRouteRuntime generated transactions", () => {
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
		vi.spyOn(service, "get").mockImplementation(async (): Promise<RuntimeRouteEntity> => {
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
								errorType: EErrorStringAction.INVALID_ARGUMENT,
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
		vi.spyOn(service, "update").mockImplementation(async (_criteria, properties): Promise<RuntimeRouteEntity> => {
			expect(ApiFunctionContextStorage.getEventManager()).toBe(transaction.entityManager);
			order.push("operation");

			return {
				id: "route-transaction-1",
				...properties,
			};
		});
		vi.spyOn(service, "get").mockImplementation(async (): Promise<RuntimeRouteEntity> => {
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
							errorType: EErrorStringAction.INVALID_ARGUMENT,
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

		vi.spyOn(service, "update").mockResolvedValue({
			id: "route-transaction-1",
			source: "updated",
		});
		vi.spyOn(service, "get").mockRejectedValue(reloadError);

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
			vi.spyOn(service, "delete").mockImplementation(async (): Promise<void> => {
				assertActiveManager();
			});
		} else if (method === EApiRouteType.GET) {
			vi.spyOn(service, "get").mockImplementation(async (): Promise<RuntimeRouteEntity> => {
				assertActiveManager();

				return {
					id: "route-transaction-1",
				};
			});
		} else {
			vi.spyOn(service, "getList").mockImplementation(async () => {
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
									errorType: EErrorStringAction.INVALID_ARGUMENT,
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

		vi.spyOn(service, "get").mockRejectedValue(reloadError);

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
