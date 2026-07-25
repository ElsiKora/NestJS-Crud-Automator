import type { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionTransaction, IApiFunctionTransactionFailure } from "@interface/class/api/function";
import type { IApiSubscriberFunction, IApiSubscriberFunctionTransactionContext } from "@interface/class/api/subscriber/function";
import type { IApiFunctionSubscriberProperties } from "@interface/decorator/api/subscriber";
import type { TApiFunctionTransactionEvent } from "@type/class/api/function";

import { ApiFunctionTransactionCommitUnknownOutcomeException, ApiFunctionTransactionPostCommitException, ApiFunctionTransactionRollbackException } from "@class/api/function/transaction/exception";
import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { EApiFunctionTransactionFailureStage, EApiFunctionTransactionTraceType } from "@enum/decorator/api";

export class ApiFunctionTransactionLifecycle {
	public static async executeAfterCommit(registry: ApiFunctionTransactionRegistry): Promise<void> {
		const subscribers: Array<{ context: IApiSubscriberFunctionTransactionContext; subscriber: IApiSubscriberFunction<IApiBaseEntity> }> = ApiFunctionTransactionLifecycle.getMatchingSubscribers(registry);
		const hookFailures: Array<IApiFunctionTransactionFailure> = [];

		for (const { context, subscriber } of subscribers) {
			if (!subscriber.onAfterCommit) {
				continue;
			}

			try {
				await subscriber.onAfterCommit(context);
			} catch (error) {
				hookFailures.push(ApiFunctionTransactionLifecycle.createFailure(EApiFunctionTransactionFailureStage.AFTER_COMMIT, error, subscriber));
			}
		}

		if (hookFailures.length === 0) {
			return;
		}

		const beforeErrorFailures: Array<IApiFunctionTransactionFailure> = await ApiFunctionTransactionLifecycle.executeBeforeCommitErrorSubscribers(subscribers, hookFailures);
		const transaction: Readonly<IApiFunctionTransaction> = registry.getTransaction();

		const provisionalError: ApiFunctionTransactionPostCommitException = new ApiFunctionTransactionPostCommitException({
			errorLifecycleFailures: beforeErrorFailures,
			hookFailures,
			owner: transaction.owner,
			transactionId: transaction.id,
		});
		const afterErrorFailures: Array<IApiFunctionTransactionFailure> = await ApiFunctionTransactionLifecycle.executeAfterCommitErrorSubscribers(subscribers, provisionalError);

		throw new ApiFunctionTransactionPostCommitException({
			errorLifecycleFailures: [...beforeErrorFailures, ...afterErrorFailures],
			hookFailures,
			owner: transaction.owner,
			transactionId: transaction.id,
		});
	}

	public static async executeAfterRollback(registry: ApiFunctionTransactionRegistry, operationError: unknown, rollbackFailure?: IApiFunctionTransactionFailure): Promise<never> {
		const subscribers: Array<{ context: IApiSubscriberFunctionTransactionContext; subscriber: IApiSubscriberFunction<IApiBaseEntity> }> = ApiFunctionTransactionLifecycle.getMatchingSubscribers(registry);
		const hookFailures: Array<IApiFunctionTransactionFailure> = [];

		for (const { context, subscriber } of subscribers) {
			if (!subscriber.onAfterRollback) {
				continue;
			}

			try {
				await subscriber.onAfterRollback(context);
			} catch (error) {
				hookFailures.push(ApiFunctionTransactionLifecycle.createFailure(EApiFunctionTransactionFailureStage.AFTER_ROLLBACK, error, subscriber));
			}
		}

		const rawFailures: Array<IApiFunctionTransactionFailure> = rollbackFailure ? [rollbackFailure, ...hookFailures] : hookFailures;

		if (rawFailures.length === 0) {
			throw operationError;
		}

		const beforeErrorFailures: Array<IApiFunctionTransactionFailure> = await ApiFunctionTransactionLifecycle.executeBeforeRollbackErrorSubscribers(subscribers, rawFailures);
		const transaction: Readonly<IApiFunctionTransaction> = registry.getTransaction();

		const provisionalError: ApiFunctionTransactionRollbackException = new ApiFunctionTransactionRollbackException({
			errorLifecycleFailures: beforeErrorFailures,
			hookFailures,
			operationError,
			owner: transaction.owner,
			rollbackFailure,
			transactionId: transaction.id,
		});
		const afterErrorFailures: Array<IApiFunctionTransactionFailure> = await ApiFunctionTransactionLifecycle.executeAfterRollbackErrorSubscribers(subscribers, provisionalError);

		throw new ApiFunctionTransactionRollbackException({
			errorLifecycleFailures: [...beforeErrorFailures, ...afterErrorFailures],
			hookFailures,
			operationError,
			owner: transaction.owner,
			rollbackFailure,
			transactionId: transaction.id,
		});
	}

	public static async executeCommitUnknown(registry: ApiFunctionTransactionRegistry, error: unknown, cleanupFailure?: IApiFunctionTransactionFailure): Promise<never> {
		const subscribers: Array<{ context: IApiSubscriberFunctionTransactionContext; subscriber: IApiSubscriberFunction<IApiBaseEntity> }> = ApiFunctionTransactionLifecycle.getMatchingSubscribers(registry);
		const commitFailure: IApiFunctionTransactionFailure = ApiFunctionTransactionLifecycle.createFailure(EApiFunctionTransactionFailureStage.COMMIT, error);
		const rawFailures: Array<IApiFunctionTransactionFailure> = cleanupFailure ? [commitFailure, cleanupFailure] : [commitFailure];
		const beforeErrorFailures: Array<IApiFunctionTransactionFailure> = await ApiFunctionTransactionLifecycle.executeBeforeCommitErrorSubscribers(subscribers, rawFailures);
		const transaction: Readonly<IApiFunctionTransaction> = registry.getTransaction();

		const provisionalError: ApiFunctionTransactionCommitUnknownOutcomeException = new ApiFunctionTransactionCommitUnknownOutcomeException({
			cleanupFailure,
			commitFailure,
			errorLifecycleFailures: beforeErrorFailures,
			owner: transaction.owner,
			transactionId: transaction.id,
		});
		const afterErrorFailures: Array<IApiFunctionTransactionFailure> = await ApiFunctionTransactionLifecycle.executeAfterCommitErrorSubscribers(subscribers, provisionalError);

		throw new ApiFunctionTransactionCommitUnknownOutcomeException({
			cleanupFailure,
			commitFailure,
			errorLifecycleFailures: [...beforeErrorFailures, ...afterErrorFailures],
			owner: transaction.owner,
			transactionId: transaction.id,
		});
	}

	private static createFailure(stage: EApiFunctionTransactionFailureStage, error: unknown, subscriber?: IApiSubscriberFunction<IApiBaseEntity>): IApiFunctionTransactionFailure {
		return Object.freeze({
			error,
			stage,
			subscriberName: subscriber?.constructor.name,
		});
	}

	private static async executeAfterCommitErrorSubscribers(subscribers: ReadonlyArray<{ context: IApiSubscriberFunctionTransactionContext; subscriber: IApiSubscriberFunction<IApiBaseEntity> }>, error: Error): Promise<Array<IApiFunctionTransactionFailure>> {
		const failures: Array<IApiFunctionTransactionFailure> = [];

		for (const { context, subscriber } of subscribers) {
			if (!subscriber.onAfterErrorCommit) {
				continue;
			}

			try {
				await subscriber.onAfterErrorCommit(context, error);
			} catch (lifecycleError) {
				failures.push(ApiFunctionTransactionLifecycle.createFailure(EApiFunctionTransactionFailureStage.AFTER_ERROR_COMMIT, lifecycleError, subscriber));
			}
		}

		return failures;
	}

	private static async executeAfterRollbackErrorSubscribers(subscribers: ReadonlyArray<{ context: IApiSubscriberFunctionTransactionContext; subscriber: IApiSubscriberFunction<IApiBaseEntity> }>, error: Error): Promise<Array<IApiFunctionTransactionFailure>> {
		const failures: Array<IApiFunctionTransactionFailure> = [];

		for (const { context, subscriber } of subscribers) {
			if (!subscriber.onAfterErrorRollback) {
				continue;
			}

			try {
				await subscriber.onAfterErrorRollback(context, error);
			} catch (lifecycleError) {
				failures.push(ApiFunctionTransactionLifecycle.createFailure(EApiFunctionTransactionFailureStage.AFTER_ERROR_ROLLBACK, lifecycleError, subscriber));
			}
		}

		return failures;
	}

	private static async executeBeforeCommitErrorSubscribers(subscribers: ReadonlyArray<{ context: IApiSubscriberFunctionTransactionContext; subscriber: IApiSubscriberFunction<IApiBaseEntity> }>, rawFailures: ReadonlyArray<IApiFunctionTransactionFailure>): Promise<Array<IApiFunctionTransactionFailure>> {
		const failures: Array<IApiFunctionTransactionFailure> = [];
		const readonlyFailures: ReadonlyArray<IApiFunctionTransactionFailure> = Object.freeze([...rawFailures]);

		for (const { context, subscriber } of subscribers) {
			if (!subscriber.onBeforeErrorCommit) {
				continue;
			}

			try {
				await subscriber.onBeforeErrorCommit(context, readonlyFailures);
			} catch (error) {
				failures.push(ApiFunctionTransactionLifecycle.createFailure(EApiFunctionTransactionFailureStage.BEFORE_ERROR_COMMIT, error, subscriber));
			}
		}

		return failures;
	}

	private static async executeBeforeRollbackErrorSubscribers(subscribers: ReadonlyArray<{ context: IApiSubscriberFunctionTransactionContext; subscriber: IApiSubscriberFunction<IApiBaseEntity> }>, rawFailures: ReadonlyArray<IApiFunctionTransactionFailure>): Promise<Array<IApiFunctionTransactionFailure>> {
		const failures: Array<IApiFunctionTransactionFailure> = [];
		const readonlyFailures: ReadonlyArray<IApiFunctionTransactionFailure> = Object.freeze([...rawFailures]);

		for (const { context, subscriber } of subscribers) {
			if (!subscriber.onBeforeErrorRollback) {
				continue;
			}

			try {
				await subscriber.onBeforeErrorRollback(context, readonlyFailures);
			} catch (error) {
				failures.push(ApiFunctionTransactionLifecycle.createFailure(EApiFunctionTransactionFailureStage.BEFORE_ERROR_ROLLBACK, error, subscriber));
			}
		}

		return failures;
	}

	private static getMatchingSubscribers(registry: ApiFunctionTransactionRegistry): Array<{ context: IApiSubscriberFunctionTransactionContext; subscriber: IApiSubscriberFunction<IApiBaseEntity> }> {
		const matchedEvents: Map<IApiSubscriberFunction<IApiBaseEntity>, Array<TApiFunctionTransactionEvent>> = new Map<IApiSubscriberFunction<IApiBaseEntity>, Array<TApiFunctionTransactionEvent>>();

		for (const event of registry.getObservableEvents()) {
			if (event.functionType === EApiFunctionTransactionTraceType.STEP) {
				continue;
			}

			const subscribers: Array<IApiSubscriberFunction<IApiBaseEntity>> = apiSubscriberRegistry.getFunctionSubscribers(event.entityName, event.functionType, event.action);

			for (const subscriber of subscribers) {
				const events: Array<TApiFunctionTransactionEvent> = matchedEvents.get(subscriber) ?? [];

				events.push(event);
				matchedEvents.set(subscriber, events);
			}
		}

		return [...matchedEvents.entries()]
			.toSorted((leftEntry: [IApiSubscriberFunction<IApiBaseEntity>, Array<TApiFunctionTransactionEvent>], rightEntry: [IApiSubscriberFunction<IApiBaseEntity>, Array<TApiFunctionTransactionEvent>]) => {
				const leftSubscriber: IApiSubscriberFunction<IApiBaseEntity> = leftEntry[0];
				const rightSubscriber: IApiSubscriberFunction<IApiBaseEntity> = rightEntry[0];
				const leftProperties: IApiFunctionSubscriberProperties<IApiBaseEntity> | undefined = apiSubscriberRegistry.getFunctionSubscriberProperties(leftSubscriber);
				const rightProperties: IApiFunctionSubscriberProperties<IApiBaseEntity> | undefined = apiSubscriberRegistry.getFunctionSubscriberProperties(rightSubscriber);
				const priorityDifference: number = (rightProperties?.priority ?? 0) - (leftProperties?.priority ?? 0);

				return priorityDifference === 0 ? apiSubscriberRegistry.getFunctionSubscriberRegistrationOrder(leftSubscriber) - apiSubscriberRegistry.getFunctionSubscriberRegistrationOrder(rightSubscriber) : priorityDifference;
			})
			.map((entry: [IApiSubscriberFunction<IApiBaseEntity>, Array<TApiFunctionTransactionEvent>]): { context: IApiSubscriberFunctionTransactionContext; subscriber: IApiSubscriberFunction<IApiBaseEntity> } => ({
				context: registry.createContext(entry[1]),
				subscriber: entry[0],
			}));
	}
}
