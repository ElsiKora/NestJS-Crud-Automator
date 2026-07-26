import type { ApiFunctionTransactionRegistry } from "@class/api/function/transaction/registry.class";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionTransactionTraceType } from "@type/class/api/function/transaction";
import type { EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionRuntime } from "@class/api/function/transaction/runtime.class";
import { SERVICE_API_DECORATOR_CONSTANT } from "@constant/decorator/api/service.constant";
import { EApiFunctionTransactionMode, EApiFunctionTransactionOwnerKind } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Executes an ApiFunction callback according to its transaction mode.
 * @template E - Entity type owned by the function repository.
 * @template R - Callback result type.
 * @param {object} options - Transaction execution options.
 * @param {string} [options.action] - Custom function action used for subscriber matching.
 * @param {(eventManager: EntityManager | undefined) => Promise<R>} options.callback - Function body to run with the resolved transaction manager.
 * @param {new (...arguments_: Array<unknown>) => E} options.entity - Entity constructor associated with the function.
 * @param {TApiFunctionTransactionTraceType} options.functionType - Function trace type.
 * @param {string} [options.label] - Error message label for the decorated function primitive.
 * @param {string} options.methodName - Decorated service method name.
 * @param {EApiFunctionTransactionMode} options.mode - Transaction mode to enforce.
 * @param {(eventManager: EntityManager | undefined, error: Error) => Promise<void>} [options.onPreflightError] - Error hook for transaction mode conflicts before the function body starts.
 * @param {Repository<E>} [options.repository] - Repository used to open new transactions when required.
 * @param {new (...arguments_: Array<unknown>) => unknown} [options.serviceConstructor] - Observable service constructor used for subscriber matching.
 * @returns {Promise<R>} Callback result.
 */
export async function ApiFunctionExecuteWithTransaction<E extends IApiBaseEntity, R>(options: {
	action?: string;
	callback: (eventManager: EntityManager | undefined) => Promise<R>;
	entity: new (...arguments_: Array<unknown>) => E;
	functionType: TApiFunctionTransactionTraceType;
	label?: string;
	methodName: string;
	mode: EApiFunctionTransactionMode;
	onPreflightError?: (eventManager: EntityManager | undefined, error: Error) => Promise<void>;
	repository?: Repository<E>;
	serviceConstructor?: new (...arguments_: Array<unknown>) => unknown;
}): Promise<R> {
	const activeRegistry: ApiFunctionTransactionRegistry | undefined = ApiFunctionContextStorage.getTransactionRegistry();
	const activeEventManager: EntityManager | undefined = activeRegistry ? ApiFunctionContextStorage.getEventManager() : undefined;
	const label: string = options.label ?? "ApiFunction";
	const isSubscriberObservable: boolean = Boolean(options.serviceConstructor && Reflect.hasMetadata(SERVICE_API_DECORATOR_CONSTANT.OBSERVABLE_METADATA_KEY, options.serviceConstructor));

	const executeWithEventManager = async (eventManager: EntityManager | undefined): Promise<R> => {
		const registry: ApiFunctionTransactionRegistry | undefined = ApiFunctionContextStorage.getTransactionRegistry();

		const sequence: number | undefined = registry?.beginEvent({
			action: options.action,
			entityName: options.entity.name,
			functionType: options.functionType,
			isSubscriberObservable,
			methodName: options.methodName,
		});

		try {
			const result: R = await options.callback(eventManager);

			if (sequence !== undefined) {
				registry?.succeedEvent(sequence);
			}

			return result;
		} catch (error) {
			if (sequence !== undefined) {
				registry?.failEvent(sequence, error);
			}

			throw error;
		}
	};

	if (options.mode === EApiFunctionTransactionMode.NONE && activeEventManager) {
		const error: Error = ErrorException(`${label} transaction mode NONE cannot run inside an active transaction`);

		const sequence: number | undefined = activeRegistry?.beginEvent({
			action: options.action,
			entityName: options.entity.name,
			functionType: options.functionType,
			isSubscriberObservable,
			methodName: options.methodName,
		});

		try {
			await options.onPreflightError?.(activeEventManager, error);
		} catch (preflightError) {
			if (sequence !== undefined) {
				activeRegistry?.failEvent(sequence, preflightError);
			}

			throw preflightError;
		}

		if (sequence !== undefined) {
			activeRegistry?.failEvent(sequence, error);
		}

		throw error;
	}

	if (options.mode === EApiFunctionTransactionMode.MANDATORY && !activeEventManager) {
		const error: Error = ErrorException(`${label} transaction mode MANDATORY requires an active transaction`);

		await options.onPreflightError?.(undefined, error);

		throw error;
	}

	const eventManager: EntityManager | undefined = options.mode === EApiFunctionTransactionMode.NONE ? undefined : activeEventManager;

	if (options.mode === EApiFunctionTransactionMode.REQUIRED && !eventManager) {
		if (!options.repository) {
			const error: Error = ErrorException("Repository is not available in this context");

			await options.onPreflightError?.(undefined, error);

			throw error;
		}

		return await ApiFunctionTransactionRuntime.execute({
			callback: executeWithEventManager,
			dataSource: options.repository.manager.connection,
			owner: {
				action: options.action,
				entityName: options.entity.name,
				functionType: options.functionType,
				kind: EApiFunctionTransactionOwnerKind.FUNCTION,
				methodName: options.methodName,
			},
		});
	}

	return await executeWithEventManager(eventManager);
}
