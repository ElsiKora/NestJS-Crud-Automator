import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionTransactionFailure } from "@interface/class/api/function";
import type { IApiSubscriberFunction, IApiSubscriberFunctionTransactionContext } from "@interface/class/api/subscriber/function";
import type { DataSource, EntityManager, QueryRunner, Repository } from "typeorm";

import { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction/scope.class";
import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionCommitUnknownOutcomeException, ApiFunctionTransactionPostCommitException } from "@class/api/function/transaction/exception";
import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";
import { EApiFunctionTransactionEventStatus, EApiFunctionTransactionFailureStage, EApiFunctionTransactionOwnerKind, EApiFunctionTransactionOutcome, EApiFunctionTransactionTraceType, EApiFunctionTransactionMode, EApiFunctionType } from "@enum/decorator/api";
import { createTransactionFixture, resetApiSubscriberRegistry } from "@test/unit/fixture";
import { ApiFunctionExecuteWithTransaction } from "@utility/api/function-transaction.utility";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createRepository<E extends IApiBaseEntity>(): { dataSource: DataSource; entityManager: EntityManager; queryRunner: QueryRunner; repository: Repository<E> } {
	const { dataSource, entityManager, queryRunner } = createTransactionFixture();
	const repository = {
		manager: {
			connection: dataSource,
		},
	} as unknown as Repository<E>;

	return {
		dataSource,
		entityManager,
		queryRunner,
		repository,
	};
}

describe("ApiFunctionExecuteWithTransaction", () => {
	beforeEach(() => {
		resetApiSubscriberRegistry();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		resetApiSubscriberRegistry();
	});

	it("opens one FUNCTION-owned transaction for nested REQUIRED work and flushes once", async () => {
		class NestedTransactionEntity {}
		class NestedTransactionService {}

		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, NestedTransactionService);

		let context: IApiSubscriberFunctionTransactionContext | undefined;
		const subscriber: IApiSubscriberFunction<NestedTransactionEntity> = {
			onAfterCommit: vi.fn(async (receivedContext: IApiSubscriberFunctionTransactionContext) => {
				expect(ApiFunctionContextStorage.getTransactionRegistry()).toBeUndefined();
				context = receivedContext;
			}),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: NestedTransactionEntity }, subscriber);

		const { dataSource, entityManager, queryRunner, repository } = createRepository<NestedTransactionEntity>();

		const result = await ApiFunctionExecuteWithTransaction({
			action: "outer",
			callback: async (outerManager: EntityManager | undefined) => {
				expect(outerManager).toBe(entityManager);

				return await ApiFunctionExecuteWithTransaction({
					action: "inner",
					callback: async (innerManager: EntityManager | undefined) => {
						expect(innerManager).toBe(entityManager);

						return "result";
					},
					entity: NestedTransactionEntity,
					functionType: EApiFunctionType.UPDATE,
					methodName: "inner",
					mode: EApiFunctionTransactionMode.REQUIRED,
					repository,
					serviceConstructor: NestedTransactionService,
				});
			},
			entity: NestedTransactionEntity,
			functionType: EApiFunctionType.CREATE,
			methodName: "outer",
			mode: EApiFunctionTransactionMode.REQUIRED,
			repository,
			serviceConstructor: NestedTransactionService,
		});

		expect(result).toBe("result");
		expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(queryRunner.connect).toHaveBeenCalledTimes(1);
		expect(queryRunner.startTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
		expect(subscriber.onAfterCommit).toHaveBeenCalledTimes(1);
		expect(context?.DATA.events).toEqual([
			expect.objectContaining({
				action: "outer",
				functionType: EApiFunctionType.CREATE,
				methodName: "outer",
				sequence: 1,
			}),
			expect.objectContaining({
				action: "inner",
				functionType: EApiFunctionType.UPDATE,
				methodName: "inner",
				sequence: 2,
			}),
		]);
		expect(context?.DATA.matchedEvents).toHaveLength(2);
		expect(context?.DATA.transaction.owner).toEqual({
			action: "outer",
			entityName: NestedTransactionEntity.name,
			functionType: EApiFunctionType.CREATE,
			kind: EApiFunctionTransactionOwnerKind.FUNCTION,
			methodName: "outer",
		});
	});

	it("reports post-commit hook failure without rolling back committed work", async () => {
		class PostCommitFailureEntity {}
		class PostCommitFailureService {}

		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, PostCommitFailureService);

		const hookError = new Error("post-commit failed");
		const subscriber: IApiSubscriberFunction<PostCommitFailureEntity> = {
			onAfterCommit: vi.fn(async () => {
				throw hookError;
			}),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: PostCommitFailureEntity }, subscriber);

		const { queryRunner, repository } = createRepository<PostCommitFailureEntity>();

		await expect(
			ApiFunctionExecuteWithTransaction({
				callback: async () => "committed",
				entity: PostCommitFailureEntity,
				functionType: EApiFunctionType.CREATE,
				methodName: "create",
				mode: EApiFunctionTransactionMode.REQUIRED,
				repository,
				serviceConstructor: PostCommitFailureService,
			}),
		).rejects.toMatchObject({
			hookFailures: [
				{
					error: hookError,
				},
			],
			name: ApiFunctionTransactionPostCommitException.name,
			outcome: EApiFunctionTransactionOutcome.COMMITTED,
		});
		expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
	});

	it("routes an unknown COMMIT through commit-error hooks without commit or rollback hooks", async () => {
		class UnknownCommitEntity {}
		class UnknownCommitService {}

		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, UnknownCommitService);

		const commitError = new Error("commit failed");
		let normalizedError: Error | undefined;
		let rawFailures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>> | undefined;
		const subscriber: IApiSubscriberFunction<UnknownCommitEntity> = {
			onAfterCommit: vi.fn(async () => undefined),
			onAfterErrorCommit: vi.fn(async (_context: IApiSubscriberFunctionTransactionContext, error: Error) => {
				normalizedError = error;
			}),
			onAfterRollback: vi.fn(async () => undefined),
			onBeforeErrorCommit: vi.fn(async (_context: IApiSubscriberFunctionTransactionContext, failures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>) => {
				rawFailures = failures;
			}),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: UnknownCommitEntity }, subscriber);

		const { queryRunner, repository } = createRepository<UnknownCommitEntity>();

		vi.mocked(queryRunner.commitTransaction).mockRejectedValueOnce(commitError);

		await expect(
			ApiFunctionExecuteWithTransaction({
				callback: async () => "unknown",
				entity: UnknownCommitEntity,
				functionType: EApiFunctionType.UPDATE,
				methodName: "update",
				mode: EApiFunctionTransactionMode.REQUIRED,
				repository,
				serviceConstructor: UnknownCommitService,
			}),
		).rejects.toMatchObject({
			commitFailure: {
				error: commitError,
			},
			name: ApiFunctionTransactionCommitUnknownOutcomeException.name,
		});
		expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
		expect(rawFailures).toEqual([
			expect.objectContaining({
				error: commitError,
				stage: EApiFunctionTransactionFailureStage.COMMIT,
			}),
		]);
		expect(normalizedError).toBeInstanceOf(ApiFunctionTransactionCommitUnknownOutcomeException);
		expect(subscriber.onAfterCommit).not.toHaveBeenCalled();
		expect(subscriber.onAfterRollback).not.toHaveBeenCalled();
		expect(subscriber.onBeforeErrorCommit).toHaveBeenCalledTimes(1);
		expect(subscriber.onAfterErrorCommit).toHaveBeenCalledTimes(1);
	});

	it("keeps STEP in full traces but matches subscribers only through nested observable functions", async () => {
		class StepOwnerEntity {}
		class StepOwnerService {}

		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, StepOwnerService);

		let context: IApiSubscriberFunctionTransactionContext | undefined;
		const subscriber: IApiSubscriberFunction<StepOwnerEntity> = {
			onAfterCommit: vi.fn(async (receivedContext: IApiSubscriberFunctionTransactionContext) => {
				context = receivedContext;
			}),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: StepOwnerEntity }, subscriber);

		const { dataSource, queryRunner, repository } = createRepository<StepOwnerEntity>();

		await ApiFunctionExecuteWithTransaction({
			callback: async () =>
				await ApiFunctionExecuteWithTransaction({
					callback: async () => undefined,
					entity: StepOwnerEntity,
					functionType: EApiFunctionType.CREATE,
					methodName: "create",
					mode: EApiFunctionTransactionMode.REQUIRED,
					repository,
					serviceConstructor: StepOwnerService,
				}),
			entity: StepOwnerEntity,
			functionType: EApiFunctionTransactionTraceType.STEP,
			methodName: "validate",
			mode: EApiFunctionTransactionMode.REQUIRED,
			repository,
			serviceConstructor: StepOwnerService,
		});

		expect(dataSource.createQueryRunner).toHaveBeenCalledTimes(1);
		expect(queryRunner.commitTransaction).toHaveBeenCalledTimes(1);
		expect(subscriber.onAfterCommit).toHaveBeenCalledTimes(1);
		expect(context?.DATA.events).toEqual([
			expect.objectContaining({
				functionType: EApiFunctionTransactionTraceType.STEP,
				methodName: "validate",
			}),
			expect.objectContaining({
				functionType: EApiFunctionType.CREATE,
				methodName: "create",
			}),
		]);
		expect(context?.DATA.matchedEvents).toEqual([
			expect.objectContaining({
				functionType: EApiFunctionType.CREATE,
			}),
		]);
		expect(context?.DATA.transaction.owner).toEqual({
			action: undefined,
			entityName: StepOwnerEntity.name,
			functionType: EApiFunctionTransactionTraceType.STEP,
			kind: EApiFunctionTransactionOwnerKind.FUNCTION,
			methodName: "validate",
		});
	});

	it("records failed events, rolls back once, and preserves the operation error", async () => {
		class FailedTransactionEntity {}
		class FailedTransactionService {}

		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, FailedTransactionService);

		const operationError = new Error("operation failed");
		let context: IApiSubscriberFunctionTransactionContext | undefined;
		const subscriber: IApiSubscriberFunction<FailedTransactionEntity> = {
			onAfterRollback: vi.fn(async (receivedContext: IApiSubscriberFunctionTransactionContext) => {
				expect(ApiFunctionContextStorage.getTransactionRegistry()).toBeUndefined();
				context = receivedContext;
			}),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: FailedTransactionEntity }, subscriber);

		const { queryRunner, repository } = createRepository<FailedTransactionEntity>();

		await expect(
			ApiFunctionExecuteWithTransaction({
				callback: async () => {
					throw operationError;
				},
				entity: FailedTransactionEntity,
				functionType: EApiFunctionType.DELETE,
				methodName: "delete",
				mode: EApiFunctionTransactionMode.REQUIRED,
				repository,
				serviceConstructor: FailedTransactionService,
			}),
		).rejects.toBe(operationError);
		expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
		expect(queryRunner.rollbackTransaction).toHaveBeenCalledTimes(1);
		expect(queryRunner.release).toHaveBeenCalledTimes(1);
		expect(subscriber.onAfterRollback).toHaveBeenCalledTimes(1);
		expect(context?.DATA.matchedEvents).toEqual([
			expect.objectContaining({
				error: operationError,
				status: EApiFunctionTransactionEventStatus.FAILED,
			}),
		]);
	});

	it.each([EApiFunctionTransactionMode.NONE, EApiFunctionTransactionMode.SUPPORTS])("does not create lifecycle work for non-transactional %s mode", async (mode: EApiFunctionTransactionMode) => {
		class NonTransactionalEntity {}
		class NonTransactionalService {}

		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, NonTransactionalService);

		const subscriber: IApiSubscriberFunction<NonTransactionalEntity> = {
			onAfterCommit: vi.fn(async () => undefined),
			onAfterRollback: vi.fn(async () => undefined),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: NonTransactionalEntity }, subscriber);

		await ApiFunctionExecuteWithTransaction({
			callback: async (eventManager: EntityManager | undefined) => {
				expect(eventManager).toBeUndefined();

				return undefined;
			},
			entity: NonTransactionalEntity,
			functionType: EApiFunctionType.GET,
			methodName: "get",
			mode,
			serviceConstructor: NonTransactionalService,
		});

		expect(subscriber.onAfterCommit).not.toHaveBeenCalled();
		expect(subscriber.onAfterRollback).not.toHaveBeenCalled();
	});
	it("times only reached native callbacks, preserving inclusive nested intervals and excluding event bookkeeping", async () => {
		class Entity {}
		const { dataSource } = createTransactionFixture();
		let clock = 0;
		vi.spyOn(performance, "now").mockImplementation(() => clock);
		const originalBegin = ApiFunctionTransactionRegistry.prototype.beginEvent;
		const originalSucceed = ApiFunctionTransactionRegistry.prototype.succeedEvent;
		vi.spyOn(ApiFunctionTransactionRegistry.prototype, "beginEvent").mockImplementation(function (this: ApiFunctionTransactionRegistry, options) {
			clock += 100;
			return originalBegin.call(this, options);
		});
		vi.spyOn(ApiFunctionTransactionRegistry.prototype, "succeedEvent").mockImplementation(function (this: ApiFunctionTransactionRegistry, sequence) {
			clock += 200;
			return originalSucceed.call(this, sequence);
		});
		const observe = vi.fn();
		const selectors = ["outer", "inner"].map((methodName) => ({ entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName }));
		await ApiFunctionTransactionScope.runWithDataSource(
			dataSource,
			{ name: "timing", observation: { onSettled: observe, selectors } },
			async () =>
				await ApiFunctionExecuteWithTransaction({
					callback: async () => {
						clock += 1.25;
						await ApiFunctionExecuteWithTransaction({
							callback: async () => {
								clock += 2.5;
							},
							entity: Entity,
							functionType: EApiFunctionTransactionTraceType.STEP,
							methodName: "inner",
							mode: EApiFunctionTransactionMode.REQUIRED,
						});
						clock += 4.75;
					},
					entity: Entity,
					functionType: EApiFunctionTransactionTraceType.STEP,
					methodName: "outer",
					mode: EApiFunctionTransactionMode.MANDATORY,
				}),
		);
		expect(observe).toHaveBeenCalledWith({
			droppedCount: 0,
			measurements: [
				{ durationMs: 308.5, selectorIndex: 0, status: EApiFunctionTransactionEventStatus.SUCCEEDED },
				{ durationMs: 2.5, selectorIndex: 1, status: EApiFunctionTransactionEventStatus.SUCCEEDED },
			],
			outcome: EApiFunctionTransactionOutcome.COMMITTED,
		});
	});

	it("does not time mode preflight failures or nontransactional callbacks", async () => {
		class Entity {}
		const { dataSource } = createTransactionFixture();
		const now = vi.spyOn(performance, "now");
		const observe = vi.fn();
		const execute = (mode: EApiFunctionTransactionMode) => ApiFunctionExecuteWithTransaction({ callback: async () => "result", entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "step", mode });
		await expect(execute(EApiFunctionTransactionMode.MANDATORY)).rejects.toThrow("requires an active transaction");
		await expect(execute(EApiFunctionTransactionMode.NONE)).resolves.toBe("result");
		await expect(execute(EApiFunctionTransactionMode.SUPPORTS)).resolves.toBe("result");
		await ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "preflight", observation: { onSettled: observe, selectors: [{ entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "step" }] } }, async () => {
			await expect(execute(EApiFunctionTransactionMode.NONE)).rejects.toThrow("cannot run inside an active transaction");
		});
		expect(now).not.toHaveBeenCalled();
		expect(observe).toHaveBeenCalledWith({ droppedCount: 0, measurements: [], outcome: EApiFunctionTransactionOutcome.COMMITTED });
	});

	it("delivers successful step measurements after a real post-commit hook failure without changing the exception", async () => {
		class Entity {}
		class Service {}
		Reflect.defineMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, true, Service);
		const { dataSource, queryRunner } = createTransactionFixture();
		const hookError = new Error("hook failure");
		const order: Array<string> = [];
		apiSubscriberRegistry.registerFunctionSubscriber(
			{ entity: Entity },
			{
				onAfterCommit: async () => {
					order.push("hook");
					throw hookError;
				},
			},
		);
		const observe = vi.fn(() => {
			order.push("observe");
		});
		await expect(
			ApiFunctionTransactionScope.runWithDataSource(dataSource, { name: "post-commit", observation: { onSettled: observe, selectors: [{ entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "step" }] } }, async () => {
				await ApiFunctionExecuteWithTransaction({ callback: async () => undefined, entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "step", mode: EApiFunctionTransactionMode.MANDATORY });
				await ApiFunctionExecuteWithTransaction({ callback: async () => undefined, entity: Entity, functionType: EApiFunctionType.UPDATE, methodName: "update", mode: EApiFunctionTransactionMode.SUPPORTS, serviceConstructor: Service });
			}),
		).rejects.toMatchObject({ name: ApiFunctionTransactionPostCommitException.name, outcome: EApiFunctionTransactionOutcome.COMMITTED, cause: hookError });
		expect(order).toEqual(["hook", "observe"]);
		expect(observe).toHaveBeenCalledWith({ droppedCount: 0, measurements: [expect.objectContaining({ selectorIndex: 0, status: EApiFunctionTransactionEventStatus.SUCCEEDED })], outcome: EApiFunctionTransactionOutcome.COMMITTED });
		expect(queryRunner.rollbackTransaction).not.toHaveBeenCalled();
	});

	it("keeps reached step failure distinct from successful nested work when the owner rolls back", async () => {
		class Entity {}
		const { dataSource } = createTransactionFixture();
		const error = new Error("same error");
		const observe = vi.fn();
		const selectors = ["outer", "inner"].map((methodName) => ({ entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName }));
		await expect(
			ApiFunctionTransactionScope.runWithDataSource(
				dataSource,
				{ name: "rollback", observation: { onSettled: observe, selectors } },
				async () =>
					await ApiFunctionExecuteWithTransaction({
						callback: async () => {
							await ApiFunctionExecuteWithTransaction({ callback: async () => undefined, entity: Entity, functionType: EApiFunctionTransactionTraceType.STEP, methodName: "inner", mode: EApiFunctionTransactionMode.SUPPORTS });
							throw error;
						},
						entity: Entity,
						functionType: EApiFunctionTransactionTraceType.STEP,
						methodName: "outer",
						mode: EApiFunctionTransactionMode.MANDATORY,
					}),
			),
		).rejects.toBe(error);
		expect(observe).toHaveBeenCalledWith({ droppedCount: 0, measurements: [expect.objectContaining({ selectorIndex: 0, status: EApiFunctionTransactionEventStatus.FAILED }), expect.objectContaining({ selectorIndex: 1, status: EApiFunctionTransactionEventStatus.SUCCEEDED })], outcome: EApiFunctionTransactionOutcome.ROLLED_BACK });
	});
});
