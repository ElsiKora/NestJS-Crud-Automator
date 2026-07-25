import type { EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionCustomRuntime } from "@class/api/function/custom-runtime.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { EApiFunctionTransactionMode, EApiSubscriberOnType } from "@enum/decorator/api";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createTransactionFixture } from "@test/unit/fixture";

class FunctionRuntimeEntity {
	public id?: string;
}

class OtherFunctionRuntimeEntity {
	public id?: string;
}

const createRepository = () => {
	const transactionRepository = {} as Repository<FunctionRuntimeEntity>;
	const transactionManager = {
		getRepository: vi.fn().mockReturnValue(transactionRepository),
	} as unknown as EntityManager;
	const { dataSource } = createTransactionFixture(transactionManager);
	const repository = {
		manager: {
			connection: dataSource,
			getRepository: vi.fn().mockReturnValue(transactionRepository),
		},
	} as unknown as Repository<FunctionRuntimeEntity>;

	return {
		dataSource,
		repository,
		transactionManager,
	};
};

describe("ApiFunctionCustomRuntime", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("opens a transaction for REQUIRED mode when no transaction is active", async () => {
		const { dataSource, repository, transactionManager } = createRepository();
		const originalMethod = vi.fn(async () => ApiFunctionContextStorage.get<FunctionRuntimeEntity>()?.eventManager);

		const result = await ApiFunctionCustomRuntime.execute({
			functionArguments: [],
			originalMethod,
			properties: {
				action: "customAction",
				entity: FunctionRuntimeEntity,
			},
			target: { repository },
			transactionMode: EApiFunctionTransactionMode.REQUIRED,
		});

		expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(result).toBe(transactionManager);
	});

	it("does not expose function context storage to custom before subscribers when REQUIRED opens a transaction", async () => {
		const { repository } = createRepository();
		const beforeContextSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockImplementation(async () => ApiFunctionContextStorage.get<FunctionRuntimeEntity>());

		await ApiFunctionCustomRuntime.execute({
			functionArguments: [],
			originalMethod: async () => "handler",
			properties: {
				action: "customAction",
				entity: FunctionRuntimeEntity,
			},
			target: { repository },
			transactionMode: EApiFunctionTransactionMode.REQUIRED,
		});

		expect(beforeContextSpy).toHaveBeenCalled();
		await expect(beforeContextSpy.mock.results[0]?.value).resolves.toBeUndefined();
	});

	it("joins an active transaction for SUPPORTS mode", async () => {
		const { dataSource, repository, transactionManager } = createRepository();
		const originalMethod = vi.fn(async () => ApiFunctionContextStorage.get<FunctionRuntimeEntity>()?.eventManager);

		const result = await ApiFunctionTransactionScope.runWithDataSource(
			dataSource,
			{ name: "customSupports" },
			async () =>
				await ApiFunctionCustomRuntime.execute({
					functionArguments: [],
					originalMethod,
					properties: {
						action: "customAction",
						entity: FunctionRuntimeEntity,
					},
					target: { repository },
					transactionMode: EApiFunctionTransactionMode.SUPPORTS,
				}),
		);

		expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(result).toBe(transactionManager);
	});

	it("resolves non-transactional context repository from the configured custom entity", async () => {
		const { repository } = createRepository();
		const managerRepository = {} as Repository<OtherFunctionRuntimeEntity>;
		vi.spyOn(repository.manager, "getRepository").mockReturnValue(managerRepository as never);
		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await ApiFunctionCustomRuntime.execute<OtherFunctionRuntimeEntity>({
			functionArguments: [],
			originalMethod: async () => ApiFunctionContextStorage.get<OtherFunctionRuntimeEntity>()?.repository,
			properties: {
				action: "customAction",
				entity: OtherFunctionRuntimeEntity,
			},
			target: {
				repository: repository as unknown as Repository<OtherFunctionRuntimeEntity>,
			},
			transactionMode: EApiFunctionTransactionMode.SUPPORTS,
		});

		expect(repository.manager.getRepository).toHaveBeenCalledWith(OtherFunctionRuntimeEntity);
		expect(result).toBe(managerRepository);
	});

	it("fails MANDATORY mode without an active transaction", async () => {
		const { repository } = createRepository();
		const errorSubscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(
			ApiFunctionCustomRuntime.execute({
				functionArguments: [],
				originalMethod: async () => undefined,
				properties: {
					action: "customAction",
					entity: FunctionRuntimeEntity,
				},
				target: { repository },
				transactionMode: EApiFunctionTransactionMode.MANDATORY,
			}),
		).rejects.toThrow("ApiFunctionCustom transaction mode MANDATORY requires an active transaction");
		expect(errorSubscriberSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(FunctionRuntimeEntity), expect.any(String), EApiSubscriberOnType.BEFORE_ERROR, expect.any(Object), expect.any(Error), "customAction");
	});

	it("fails NONE mode inside an active transaction", async () => {
		const { dataSource, repository } = createRepository();
		const errorSubscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		await expect(
			ApiFunctionTransactionScope.runWithDataSource(
				dataSource,
				{ name: "customNone" },
				async () =>
					await ApiFunctionCustomRuntime.execute({
						functionArguments: [],
						originalMethod: async () => undefined,
						properties: {
							action: "customAction",
							entity: FunctionRuntimeEntity,
						},
						target: { repository },
						transactionMode: EApiFunctionTransactionMode.NONE,
					}),
			),
		).rejects.toThrow("ApiFunctionCustom transaction mode NONE cannot run inside an active transaction");
		expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(errorSubscriberSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(FunctionRuntimeEntity), expect.any(String), EApiSubscriberOnType.BEFORE_ERROR, expect.any(Object), expect.any(Error), "customAction");
	});

	it("threads custom subscriber before and after results", async () => {
		const { repository } = createRepository();
		const originalMethod = vi.fn(async (value: unknown) => `handler:${String(value)}`);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockImplementation(async (_controller, _entity, _functionType, onType) => {
			if (onType === EApiSubscriberOnType.BEFORE) {
				return ["subscriber-input"];
			}

			return "subscriber-output";
		});

		const result = await ApiFunctionCustomRuntime.execute({
			functionArguments: ["initial-input"],
			originalMethod,
			properties: {
				action: "customAction",
				entity: FunctionRuntimeEntity,
			},
			target: { repository },
			transactionMode: EApiFunctionTransactionMode.SUPPORTS,
		});

		expect(originalMethod).toHaveBeenCalledWith("subscriber-input");
		expect(result).toBe("subscriber-output");
	});

	it("fires before_error when a before custom subscriber fails", async () => {
		const { repository } = createRepository();
		const errorSubscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockRejectedValueOnce(new Error("before failed"));

		await expect(
			ApiFunctionCustomRuntime.execute({
				functionArguments: [],
				originalMethod: async () => undefined,
				properties: {
					action: "customAction",
					entity: FunctionRuntimeEntity,
				},
				target: { repository },
				transactionMode: EApiFunctionTransactionMode.SUPPORTS,
			}),
		).rejects.toThrow("before failed");
		expect(errorSubscriberSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(FunctionRuntimeEntity), expect.any(String), EApiSubscriberOnType.BEFORE_ERROR, expect.any(Object), expect.any(Error), "customAction");
	});

	it("fires after_error when the custom operation fails", async () => {
		const { repository } = createRepository();
		const errorSubscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeFunctionErrorSubscribers").mockResolvedValue(undefined);

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		await expect(
			ApiFunctionCustomRuntime.execute({
				functionArguments: [],
				originalMethod: async () => {
					throw new Error("operation failed");
				},
				properties: {
					action: "customAction",
					entity: FunctionRuntimeEntity,
				},
				target: { repository },
				transactionMode: EApiFunctionTransactionMode.SUPPORTS,
			}),
		).rejects.toThrow("operation failed");
		expect(errorSubscriberSpy).toHaveBeenCalledWith(expect.any(Function), expect.any(FunctionRuntimeEntity), expect.any(String), EApiSubscriberOnType.AFTER_ERROR, expect.any(Object), expect.any(Error), "customAction");
	});

	it("exposes repository helpers and all context operations inside custom functions", async () => {
		const { repository, transactionManager } = createRepository();
		const target = {
			create: vi.fn(async (properties: unknown) => ({ operation: "create", properties })),
			delete: vi.fn(async () => undefined),
			get: vi.fn(async (properties: unknown) => ({ operation: "get", properties })),
			getList: vi.fn(async (properties: unknown) => ({ items: [{ operation: "getList", properties }], totalCount: 1 })),
			getMany: vi.fn(async (properties: unknown) => [{ operation: "getMany", properties }]),
			repository,
			update: vi.fn(async (criteria: unknown, properties: unknown) => ({ criteria, operation: "update", properties })),
		};

		vi.spyOn(ApiSubscriberExecutor, "executeFunctionSubscribers").mockResolvedValue(undefined);

		const result = await ApiFunctionCustomRuntime.execute({
			functionArguments: [],
			originalMethod: async () => {
				const context = ApiFunctionContextStorage.get<FunctionRuntimeEntity>();

				if (!context) {
					throw new Error("Missing context");
				}

				await context.operations.create({ id: "created" });
				await context.operations.delete({ id: "deleted" });
				await context.operations.get({ where: { id: "one" } });
				await context.operations.getList({ take: 1 });
				await context.operations.getMany({ where: [{ id: "many" }] });
				await context.operations.update({ id: "updated" }, { id: "updated" });

				return {
					directRepository: context.getRepository(FunctionRuntimeEntity),
					operationRepository: context.operations.getRepository(FunctionRuntimeEntity),
				};
			},
			properties: {
				action: "customAction",
				entity: FunctionRuntimeEntity,
			},
			target,
			transactionMode: EApiFunctionTransactionMode.REQUIRED,
		});

		expect(transactionManager.getRepository).toHaveBeenCalledWith(FunctionRuntimeEntity);
		expect(result).toEqual({
			directRepository: transactionManager.getRepository(FunctionRuntimeEntity),
			operationRepository: transactionManager.getRepository(FunctionRuntimeEntity),
		});
		expect(target.create).toHaveBeenCalledWith({ id: "created" });
		expect(target.delete).toHaveBeenCalledWith({ id: "deleted" });
		expect(target.get).toHaveBeenCalledWith({ where: { id: "one" } });
		expect(target.getList).toHaveBeenCalledWith({ take: 1 });
		expect(target.getMany).toHaveBeenCalledWith({ where: [{ id: "many" }] });
		expect(target.update).toHaveBeenCalledWith({ id: "updated" }, { id: "updated" });
	});
});
