import type { IApiFunctionTransactionFailure } from "@interface/class/api/function";
import type { IApiSubscriberFunction, IApiSubscriberFunctionTransactionContext } from "@interface/class/api/subscriber/function";

import { ApiFunctionTransactionCommitUnknownOutcomeException, ApiFunctionTransactionPostCommitException, ApiFunctionTransactionRollbackException } from "@class/api/function/transaction/exception";
import { ApiFunctionTransactionLifecycle } from "@class/api/function/transaction/lifecycle.class";
import { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { EApiFunctionTransactionFailureStage, EApiFunctionTransactionOutcome, EApiFunctionTransactionOwnerKind, EApiFunctionType } from "@enum/decorator/api";
import { resetApiSubscriberRegistry } from "@test/unit/fixture";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createSucceededRegistry(entityName: string, functionTypes: ReadonlyArray<EApiFunctionType>): ApiFunctionTransactionRegistry {
	const registry: ApiFunctionTransactionRegistry = new ApiFunctionTransactionRegistry("transaction-id", {
		entityName,
		functionType: functionTypes[0] ?? EApiFunctionType.CREATE,
		kind: EApiFunctionTransactionOwnerKind.FUNCTION,
		methodName: "owner",
	});

	for (const functionType of functionTypes) {
		const sequence: number = registry.beginEvent({
			entityName,
			functionType,
			isSubscriberObservable: true,
			methodName: functionType,
		});

		registry.succeedEvent(sequence);
	}

	return registry;
}

describe("ApiFunctionTransactionLifecycle", () => {
	beforeEach(() => {
		resetApiSubscriberRegistry();
	});

	afterEach(() => {
		resetApiSubscriberRegistry();
	});

	it("deduplicates matching subscribers and orders them by priority then registration", async () => {
		class LifecycleOrderingEntity {}

		const order: Array<string> = [];
		let firstContext: IApiSubscriberFunctionTransactionContext | undefined;
		let highContext: IApiSubscriberFunctionTransactionContext | undefined;
		let secondContext: IApiSubscriberFunctionTransactionContext | undefined;
		const firstSubscriber: IApiSubscriberFunction<LifecycleOrderingEntity> = {
			onAfterCommit: vi.fn(async (context: IApiSubscriberFunctionTransactionContext) => {
				firstContext = context;
				order.push("first");
			}),
		};
		const secondSubscriber: IApiSubscriberFunction<LifecycleOrderingEntity> = {
			onAfterCommit: vi.fn(async (context: IApiSubscriberFunctionTransactionContext) => {
				secondContext = context;
				order.push("second");
			}),
		};
		const highSubscriber: IApiSubscriberFunction<LifecycleOrderingEntity> = {
			onAfterCommit: vi.fn(async (context: IApiSubscriberFunctionTransactionContext) => {
				highContext = context;
				order.push("high");
			}),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: LifecycleOrderingEntity, priority: 1 }, firstSubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: LifecycleOrderingEntity, functions: [{ type: EApiFunctionType.UPDATE }], priority: 1 }, secondSubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: LifecycleOrderingEntity, functions: [{ type: EApiFunctionType.CREATE }], priority: 10 }, highSubscriber);

		const registry: ApiFunctionTransactionRegistry = createSucceededRegistry(LifecycleOrderingEntity.name, [EApiFunctionType.CREATE, EApiFunctionType.UPDATE]);

		await ApiFunctionTransactionLifecycle.executeAfterCommit(registry);

		expect(order).toEqual(["high", "first", "second"]);
		expect(highSubscriber.onAfterCommit).toHaveBeenCalledTimes(1);
		expect(firstSubscriber.onAfterCommit).toHaveBeenCalledTimes(1);
		expect(secondSubscriber.onAfterCommit).toHaveBeenCalledTimes(1);
		expect(highContext?.DATA.events).toHaveLength(2);
		expect(highContext?.DATA.matchedEvents).toHaveLength(1);
		expect(firstContext?.DATA.events).toHaveLength(2);
		expect(firstContext?.DATA.matchedEvents).toHaveLength(2);
		expect(secondContext?.DATA.matchedEvents).toHaveLength(1);
	});

	it("aggregates post-commit failures, continues hooks, and does not recurse on error-lifecycle failures", async () => {
		class LifecycleCommitFailureEntity {}

		const firstHookError = new Error("first hook failed");
		const secondHookError = new Error("second hook failed");
		const errorLifecycleError = new Error("after error failed");
		let rawFailures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>> | undefined;
		const firstSubscriber: IApiSubscriberFunction<LifecycleCommitFailureEntity> = {
			onAfterCommit: vi.fn(async () => {
				throw firstHookError;
			}),
			onAfterErrorCommit: vi.fn(async () => {
				throw errorLifecycleError;
			}),
			onBeforeErrorCommit: vi.fn(async (_context: IApiSubscriberFunctionTransactionContext, failures: ReadonlyArray<Readonly<IApiFunctionTransactionFailure>>) => {
				rawFailures = failures;
			}),
		};
		const secondSubscriber: IApiSubscriberFunction<LifecycleCommitFailureEntity> = {
			onAfterCommit: vi.fn(async () => {
				throw secondHookError;
			}),
			onAfterErrorCommit: vi.fn(async () => undefined),
			onBeforeErrorCommit: vi.fn(async () => undefined),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: LifecycleCommitFailureEntity, priority: 2 }, firstSubscriber);
		apiSubscriberRegistry.registerFunctionSubscriber({ entity: LifecycleCommitFailureEntity, priority: 1 }, secondSubscriber);

		const registry: ApiFunctionTransactionRegistry = createSucceededRegistry(LifecycleCommitFailureEntity.name, [EApiFunctionType.CREATE]);
		let thrownError: unknown;

		try {
			await ApiFunctionTransactionLifecycle.executeAfterCommit(registry);
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError).toBeInstanceOf(ApiFunctionTransactionPostCommitException);
		expect(thrownError).toMatchObject({
			errorLifecycleFailures: [
				{
					error: errorLifecycleError,
					stage: EApiFunctionTransactionFailureStage.AFTER_ERROR_COMMIT,
				},
			],
			hookFailures: [
				{
					error: firstHookError,
					stage: EApiFunctionTransactionFailureStage.AFTER_COMMIT,
				},
				{
					error: secondHookError,
					stage: EApiFunctionTransactionFailureStage.AFTER_COMMIT,
				},
			],
			outcome: EApiFunctionTransactionOutcome.COMMITTED,
		});
		expect(rawFailures).toHaveLength(2);
		expect(firstSubscriber.onAfterCommit).toHaveBeenCalledTimes(1);
		expect(secondSubscriber.onAfterCommit).toHaveBeenCalledTimes(1);
		expect(firstSubscriber.onAfterErrorCommit).toHaveBeenCalledTimes(1);
		expect(secondSubscriber.onAfterErrorCommit).toHaveBeenCalledTimes(1);
	});

	it("runs rollback hooks and preserves the original operation error when handling succeeds", async () => {
		class LifecycleRollbackEntity {}

		const operationError = new Error("operation failed");
		const subscriber: IApiSubscriberFunction<LifecycleRollbackEntity> = {
			onAfterRollback: vi.fn(async () => undefined),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: LifecycleRollbackEntity }, subscriber);

		const registry: ApiFunctionTransactionRegistry = createSucceededRegistry(LifecycleRollbackEntity.name, [EApiFunctionType.UPDATE]);

		await expect(ApiFunctionTransactionLifecycle.executeAfterRollback(registry, operationError)).rejects.toBe(operationError);
		expect(subscriber.onAfterRollback).toHaveBeenCalledTimes(1);
	});

	it("keeps the operation error primary and does not recurse on rollback error-lifecycle failures", async () => {
		class LifecycleRollbackFailureEntity {}

		const operationError = new Error("operation failed");
		const rollbackError = new Error("rollback failed");
		const hookError = new Error("rollback hook failed");
		const beforeErrorLifecycleError = new Error("before rollback error failed");
		const afterErrorLifecycleError = new Error("after rollback error failed");
		const rollbackFailure: IApiFunctionTransactionFailure = {
			error: rollbackError,
			stage: EApiFunctionTransactionFailureStage.ROLLBACK,
		};
		const subscriber: IApiSubscriberFunction<LifecycleRollbackFailureEntity> = {
			onAfterErrorRollback: vi.fn(async () => {
				throw afterErrorLifecycleError;
			}),
			onAfterRollback: vi.fn(async () => {
				throw hookError;
			}),
			onBeforeErrorRollback: vi.fn(async () => {
				throw beforeErrorLifecycleError;
			}),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: LifecycleRollbackFailureEntity }, subscriber);

		const registry: ApiFunctionTransactionRegistry = createSucceededRegistry(LifecycleRollbackFailureEntity.name, [EApiFunctionType.DELETE]);
		let thrownError: unknown;

		try {
			await ApiFunctionTransactionLifecycle.executeAfterRollback(registry, operationError, rollbackFailure);
		} catch (error) {
			thrownError = error;
		}

		expect(thrownError).toBeInstanceOf(ApiFunctionTransactionRollbackException);
		expect(thrownError).toMatchObject({
			cause: operationError,
			errorLifecycleFailures: [
				{
					error: beforeErrorLifecycleError,
					stage: EApiFunctionTransactionFailureStage.BEFORE_ERROR_ROLLBACK,
				},
				{
					error: afterErrorLifecycleError,
					stage: EApiFunctionTransactionFailureStage.AFTER_ERROR_ROLLBACK,
				},
			],
			hookFailures: [
				{
					error: hookError,
					stage: EApiFunctionTransactionFailureStage.AFTER_ROLLBACK,
				},
			],
			operationError,
			rollbackFailure,
		});
		expect(subscriber.onBeforeErrorRollback).toHaveBeenCalledTimes(1);
		expect(subscriber.onAfterErrorRollback).toHaveBeenCalledTimes(1);
	});

	it("routes unknown COMMIT only through commit-error hooks", async () => {
		class LifecycleUnknownCommitEntity {}

		const commitError = new Error("commit failed");
		const subscriber: IApiSubscriberFunction<LifecycleUnknownCommitEntity> = {
			onAfterCommit: vi.fn(async () => undefined),
			onAfterErrorCommit: vi.fn(async () => undefined),
			onAfterRollback: vi.fn(async () => undefined),
			onBeforeErrorCommit: vi.fn(async () => undefined),
		};

		apiSubscriberRegistry.registerFunctionSubscriber({ entity: LifecycleUnknownCommitEntity }, subscriber);

		const registry: ApiFunctionTransactionRegistry = createSucceededRegistry(LifecycleUnknownCommitEntity.name, [EApiFunctionType.CREATE]);

		await expect(ApiFunctionTransactionLifecycle.executeCommitUnknown(registry, commitError)).rejects.toMatchObject({
			commitFailure: {
				error: commitError,
				stage: EApiFunctionTransactionFailureStage.COMMIT,
			},
			name: ApiFunctionTransactionCommitUnknownOutcomeException.name,
		});
		expect(subscriber.onAfterCommit).not.toHaveBeenCalled();
		expect(subscriber.onAfterRollback).not.toHaveBeenCalled();
		expect(subscriber.onBeforeErrorCommit).toHaveBeenCalledTimes(1);
		expect(subscriber.onAfterErrorCommit).toHaveBeenCalledTimes(1);
	});
});
