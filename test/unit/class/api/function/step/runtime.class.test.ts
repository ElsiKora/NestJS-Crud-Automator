import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext, IApiFunctionStepContext } from "@interface/class/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionStepRuntime } from "@class/api/function/step-runtime.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction-scope.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionTransactionMode } from "@enum/decorator/api";
import { afterEach, describe, expect, it, vi } from "vitest";

class FunctionStepEntity {
	public id?: string;
}

class OtherFunctionStepEntity {
	public id?: string;
}

const createRepository = () => {
	const transactionRepository = {} as Repository<FunctionStepEntity>;
	const transactionManager = {
		getRepository: vi.fn().mockReturnValue(transactionRepository),
	} as unknown as EntityManager;
	const managerRepository = {} as Repository<FunctionStepEntity>;
	const repository = {
		manager: {
			getRepository: vi.fn().mockReturnValue(managerRepository),
			transaction: vi.fn(async (callback: (entityManager: EntityManager) => Promise<unknown>) => await callback(transactionManager)),
		},
	} as unknown as Repository<FunctionStepEntity>;

	return {
		managerRepository,
		repository,
		transactionManager,
		transactionRepository,
	};
};

const createContext = (repository: Repository<FunctionStepEntity>, eventManager?: EntityManager): IApiFunctionContext<FunctionStepEntity> => ({
	entity: FunctionStepEntity,
	eventManager,
	getRepository: <T extends IApiBaseEntity>() => repository as unknown as Repository<T>,
	operations: {} as never,
	repository,
});

describe("ApiFunctionStepRuntime", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("runs SUPPORTS outside a transaction without opening one", async () => {
		const { managerRepository, repository } = createRepository();
		const target = { repository };
		const originalMethod = vi.fn(async function (this: typeof target, value: unknown) {
			const context: IApiFunctionStepContext<FunctionStepEntity> | undefined = ApiFunctionContextStorage.getStep<FunctionStepEntity>();

			return {
				eventManager: context?.eventManager,
				repository: context?.repository,
				relatedRepository: context?.getRepository(FunctionStepEntity),
				thisValue: this,
				value: String(value),
			};
		});

		const result = await ApiFunctionStepRuntime.execute({
			functionArguments: ["supports"],
			originalMethod,
			properties: {
				entity: FunctionStepEntity,
			},
			target,
			transactionMode: EApiFunctionTransactionMode.SUPPORTS,
		});

		expect(repository.manager.transaction).not.toHaveBeenCalled();
		expect(result).toEqual({
			eventManager: undefined,
			relatedRepository: managerRepository,
			repository: managerRepository,
			thisValue: target,
			value: "supports",
		});
	});

	it("does not expose step context through the full function context storage accessor", async () => {
		const { repository } = createRepository();

		const result = await ApiFunctionStepRuntime.execute({
			functionArguments: [],
			originalMethod: async () => ({
				functionContext: ApiFunctionContextStorage.get<FunctionStepEntity>(),
				stepContext: ApiFunctionContextStorage.getStep<FunctionStepEntity>(),
			}),
			properties: {
				entity: FunctionStepEntity,
			},
			target: { repository },
			transactionMode: EApiFunctionTransactionMode.SUPPORTS,
		});

		expect(result).toEqual({
			functionContext: undefined,
			stepContext: {
				eventManager: undefined,
				getRepository: expect.any(Function),
				repository: expect.any(Object),
			},
		});
	});

	it("joins an active transaction for SUPPORTS mode", async () => {
		const { repository, transactionManager, transactionRepository } = createRepository();

		const result = await ApiFunctionTransactionScope.runWithEntityManager(
			transactionManager,
			async () =>
				await ApiFunctionStepRuntime.execute({
					functionArguments: [],
					originalMethod: async () => {
						const context: IApiFunctionStepContext<FunctionStepEntity> | undefined = ApiFunctionContextStorage.getStep<FunctionStepEntity>();

						return {
							eventManager: context?.eventManager,
							repository: context?.repository,
						};
					},
					properties: {
						entity: FunctionStepEntity,
					},
					target: { repository },
					transactionMode: EApiFunctionTransactionMode.SUPPORTS,
				}),
		);

		expect(repository.manager.transaction).not.toHaveBeenCalled();
		expect(result).toEqual({
			eventManager: transactionManager,
			repository: transactionRepository,
		});
	});

	it("opens one transaction for REQUIRED mode outside an active transaction", async () => {
		const { repository, transactionManager, transactionRepository } = createRepository();

		const result = await ApiFunctionStepRuntime.execute({
			functionArguments: [],
			originalMethod: async () => {
				const context: IApiFunctionStepContext<FunctionStepEntity> | undefined = ApiFunctionContextStorage.getStep<FunctionStepEntity>();

				return {
					eventManager: context?.eventManager,
					repository: context?.repository,
				};
			},
			properties: {
				entity: FunctionStepEntity,
			},
			target: { repository },
			transactionMode: EApiFunctionTransactionMode.REQUIRED,
		});

		expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			eventManager: transactionManager,
			repository: transactionRepository,
		});
	});

	it("reuses an active transaction for REQUIRED mode", async () => {
		const { repository, transactionManager, transactionRepository } = createRepository();

		const result = await ApiFunctionTransactionScope.runWithEntityManager(
			transactionManager,
			async () =>
				await ApiFunctionStepRuntime.execute({
					functionArguments: [],
					originalMethod: async () => ApiFunctionContextStorage.getStep<FunctionStepEntity>()?.eventManager,
					properties: {
						entity: FunctionStepEntity,
					},
					target: { repository },
					transactionMode: EApiFunctionTransactionMode.REQUIRED,
				}),
		);

		expect(repository.manager.transaction).not.toHaveBeenCalled();
		expect(transactionManager.getRepository).toHaveBeenCalledWith(FunctionStepEntity);
		expect(result).toBe(transactionManager);
		expect(ApiFunctionContextStorage.get()).toBeUndefined();
		expect(transactionRepository).toBeDefined();
	});

	it("runs NONE mode outside a transaction without opening one", async () => {
		const { managerRepository, repository } = createRepository();

		const result = await ApiFunctionStepRuntime.execute({
			functionArguments: [],
			originalMethod: async () => {
				const context: IApiFunctionStepContext<FunctionStepEntity> | undefined = ApiFunctionContextStorage.getStep<FunctionStepEntity>();

				return {
					eventManager: context?.eventManager,
					relatedRepository: context?.getRepository(FunctionStepEntity),
					repository: context?.repository,
				};
			},
			properties: {
				entity: FunctionStepEntity,
			},
			target: { repository },
			transactionMode: EApiFunctionTransactionMode.NONE,
		});

		expect(repository.manager.transaction).not.toHaveBeenCalled();
		expect(result).toEqual({
			eventManager: undefined,
			relatedRepository: managerRepository,
			repository: managerRepository,
		});
	});

	it("resolves non-transactional context repository from the configured step entity", async () => {
		const { managerRepository, repository } = createRepository();

		const result = await ApiFunctionStepRuntime.execute<OtherFunctionStepEntity>({
			functionArguments: [],
			originalMethod: async () => ApiFunctionContextStorage.getStep<OtherFunctionStepEntity>()?.repository,
			properties: {
				entity: OtherFunctionStepEntity,
			},
			target: {
				repository: repository as unknown as Repository<OtherFunctionStepEntity>,
			},
			transactionMode: EApiFunctionTransactionMode.SUPPORTS,
		});

		expect(repository.manager.getRepository).toHaveBeenCalledWith(OtherFunctionStepEntity);
		expect(result).toBe(managerRepository);
	});

	it("resolves non-transactional getRepository helper from the requested entity", async () => {
		const { managerRepository, repository } = createRepository();

		const result = await ApiFunctionStepRuntime.execute({
			functionArguments: [],
			originalMethod: async () => ApiFunctionContextStorage.getStep<FunctionStepEntity>()?.getRepository(OtherFunctionStepEntity),
			properties: {
				entity: FunctionStepEntity,
			},
			target: { repository },
			transactionMode: EApiFunctionTransactionMode.SUPPORTS,
		});

		expect(repository.manager.getRepository).toHaveBeenCalledWith(OtherFunctionStepEntity);
		expect(result).toBe(managerRepository);
	});

	it("resolves getRepository helper from the requested entity inside an active transaction", async () => {
		const { repository, transactionManager } = createRepository();

		const result = await ApiFunctionTransactionScope.runWithEntityManager(
			transactionManager,
			async () =>
				await ApiFunctionStepRuntime.execute({
					functionArguments: [],
					originalMethod: async () => ApiFunctionContextStorage.getStep<FunctionStepEntity>()?.getRepository(OtherFunctionStepEntity),
					properties: {
						entity: FunctionStepEntity,
					},
					target: { repository },
					transactionMode: EApiFunctionTransactionMode.SUPPORTS,
				}),
		);

		expect(transactionManager.getRepository).toHaveBeenCalledWith(OtherFunctionStepEntity);
		expect(result).toBeDefined();
	});

	it("fails MANDATORY mode outside an active transaction", async () => {
		const { repository } = createRepository();
		const originalMethod = vi.fn(async () => undefined);

		await expect(
			ApiFunctionStepRuntime.execute({
				functionArguments: [],
				originalMethod,
				properties: {
					entity: FunctionStepEntity,
				},
				target: { repository },
				transactionMode: EApiFunctionTransactionMode.MANDATORY,
			}),
		).rejects.toThrow("ApiFunctionStep transaction mode MANDATORY requires an active transaction");
		expect(originalMethod).not.toHaveBeenCalled();
	});

	it("fails NONE mode inside an active transaction", async () => {
		const { repository, transactionManager } = createRepository();
		const originalMethod = vi.fn(async () => undefined);
		const subscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers");
		const errorSubscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers");

		await expect(
			ApiFunctionContextStorage.run(
				createContext(repository, transactionManager),
				async () =>
					await ApiFunctionStepRuntime.execute({
						functionArguments: [],
						originalMethod,
						properties: {
							entity: FunctionStepEntity,
						},
						target: { repository },
						transactionMode: EApiFunctionTransactionMode.NONE,
					}),
			),
		).rejects.toThrow("ApiFunctionStep transaction mode NONE cannot run inside an active transaction");
		expect(originalMethod).not.toHaveBeenCalled();
		expect(subscriberSpy).not.toHaveBeenCalled();
		expect(errorSubscriberSpy).not.toHaveBeenCalled();
	});

	it("fails REQUIRED mode outside a transaction when the service repository is unavailable", async () => {
		const originalMethod = vi.fn(async () => undefined);
		const subscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers");
		const errorSubscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers");

		await expect(
			ApiFunctionStepRuntime.execute({
				functionArguments: [],
				originalMethod,
				properties: {
					entity: FunctionStepEntity,
				},
				target: {},
				transactionMode: EApiFunctionTransactionMode.REQUIRED,
			}),
		).rejects.toThrow("Repository is not available in this context");

		expect(originalMethod).not.toHaveBeenCalled();
		expect(subscriberSpy).not.toHaveBeenCalled();
		expect(errorSubscriberSpy).not.toHaveBeenCalled();
	});

	it("fails before running the step body when non-transactional context repository resolution is unavailable", async () => {
		const originalMethod = vi.fn(async () => undefined);
		const subscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers");
		const errorSubscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers");

		await expect(
			ApiFunctionStepRuntime.execute({
				functionArguments: [],
				originalMethod,
				properties: {
					entity: FunctionStepEntity,
				},
				target: {},
				transactionMode: EApiFunctionTransactionMode.SUPPORTS,
			}),
		).rejects.toThrow("Repository is not available in this context");

		expect(originalMethod).not.toHaveBeenCalled();
		expect(subscriberSpy).not.toHaveBeenCalled();
		expect(errorSubscriberSpy).not.toHaveBeenCalled();
	});

	it("rethrows step failures and restores the outer context", async () => {
		const { repository, transactionManager } = createRepository();
		const outerContext: IApiFunctionContext<FunctionStepEntity> = createContext(repository, transactionManager);
		const error = new Error("step failed");
		const subscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers");
		const errorSubscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers");

		await ApiFunctionContextStorage.run(outerContext, async () => {
			await expect(
				ApiFunctionStepRuntime.execute({
					functionArguments: [],
					originalMethod: async () => {
						throw error;
					},
					properties: {
						entity: FunctionStepEntity,
					},
					target: { repository },
					transactionMode: EApiFunctionTransactionMode.SUPPORTS,
				}),
			).rejects.toBe(error);
			expect(ApiFunctionContextStorage.get()).toBe(outerContext);
		});
		expect(subscriberSpy).not.toHaveBeenCalled();
		expect(errorSubscriberSpy).not.toHaveBeenCalled();
	});

	it("rethrows REQUIRED step failures from the opened transaction", async () => {
		const { repository } = createRepository();
		const error = new Error("required step failed");

		await expect(
			ApiFunctionStepRuntime.execute({
				functionArguments: [],
				originalMethod: async () => {
					throw error;
				},
				properties: {
					entity: FunctionStepEntity,
				},
				target: { repository },
				transactionMode: EApiFunctionTransactionMode.REQUIRED,
			}),
		).rejects.toBe(error);

		expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
	});

	it("reuses an outer REQUIRED transaction for nested REQUIRED step calls", async () => {
		const { repository, transactionManager } = createRepository();

		const result = await ApiFunctionStepRuntime.execute({
			functionArguments: [],
			originalMethod: async () => {
				const outerEventManager: EntityManager | undefined = ApiFunctionContextStorage.getStep<FunctionStepEntity>()?.eventManager;
				const innerEventManager = await ApiFunctionStepRuntime.execute({
					functionArguments: [],
					originalMethod: async () => ApiFunctionContextStorage.getStep<FunctionStepEntity>()?.eventManager,
					properties: {
						entity: FunctionStepEntity,
					},
					target: { repository },
					transactionMode: EApiFunctionTransactionMode.REQUIRED,
				});

				return {
					innerEventManager,
					outerEventManager,
				};
			},
			properties: {
				entity: FunctionStepEntity,
			},
			target: { repository },
			transactionMode: EApiFunctionTransactionMode.REQUIRED,
		});

		expect(repository.manager.transaction).toHaveBeenCalledTimes(1);
		expect(result).toEqual({
			innerEventManager: transactionManager,
			outerEventManager: transactionManager,
		});
	});

	it("reuses the same context for nested step calls", async () => {
		const { repository, transactionManager } = createRepository();

		const result = await ApiFunctionTransactionScope.runWithEntityManager(
			transactionManager,
			async () =>
				await ApiFunctionStepRuntime.execute({
					functionArguments: [],
					originalMethod: async () => {
						const outerEventManager: EntityManager | undefined = ApiFunctionContextStorage.getStep<FunctionStepEntity>()?.eventManager;
						const innerEventManager = await ApiFunctionStepRuntime.execute({
							functionArguments: [],
							originalMethod: async () => ApiFunctionContextStorage.getStep<FunctionStepEntity>()?.eventManager,
							properties: {
								entity: FunctionStepEntity,
							},
							target: { repository },
							transactionMode: EApiFunctionTransactionMode.MANDATORY,
						});

						return {
							innerEventManager,
							outerEventManager,
						};
					},
					properties: {
						entity: FunctionStepEntity,
					},
					target: { repository },
					transactionMode: EApiFunctionTransactionMode.MANDATORY,
				}),
		);

		expect(result).toEqual({
			innerEventManager: transactionManager,
			outerEventManager: transactionManager,
		});
	});

	it("does not execute function subscribers for steps", async () => {
		const { repository } = createRepository();
		const subscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers");
		const errorSubscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers");

		await ApiFunctionStepRuntime.execute({
			functionArguments: [],
			originalMethod: async () => "ok",
			properties: {
				entity: FunctionStepEntity,
			},
			target: { repository },
			transactionMode: EApiFunctionTransactionMode.SUPPORTS,
		});

		expect(subscriberSpy).not.toHaveBeenCalled();
		expect(errorSubscriberSpy).not.toHaveBeenCalled();
	});

	it("does not execute function subscribers for MANDATORY preflight failures", async () => {
		const { repository } = createRepository();
		const subscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers");
		const errorSubscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers");

		await expect(
			ApiFunctionStepRuntime.execute({
				functionArguments: [],
				originalMethod: async () => "ok",
				properties: {
					entity: FunctionStepEntity,
				},
				target: { repository },
				transactionMode: EApiFunctionTransactionMode.MANDATORY,
			}),
		).rejects.toThrow("ApiFunctionStep transaction mode MANDATORY requires an active transaction");

		expect(subscriberSpy).not.toHaveBeenCalled();
		expect(errorSubscriberSpy).not.toHaveBeenCalled();
	});
});
