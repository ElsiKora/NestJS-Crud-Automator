import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction-scope.class";
import { EApiFunctionTransactionMode } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Executes an ApiFunction callback according to its transaction mode.
 * @template E - Entity type owned by the function repository.
 * @template R - Callback result type.
 * @param {object} options - Transaction execution options.
 * @param {(eventManager: EntityManager | undefined) => Promise<R>} options.callback - Function body to run with the resolved transaction manager.
 * @param {new (...arguments_: Array<unknown>) => E} options.entity - Entity constructor associated with the function.
 * @param {EApiFunctionTransactionMode} options.mode - Transaction mode to enforce.
 * @param {Repository<E>} options.repository - Repository used to open new transactions when required.
 * @returns {Promise<R>} Callback result.
 */
export async function ApiFunctionExecuteWithTransaction<E extends IApiBaseEntity, R>(options: { callback: (eventManager: EntityManager | undefined) => Promise<R>; entity: new (...arguments_: Array<unknown>) => E; mode: EApiFunctionTransactionMode; repository: Repository<E> }): Promise<R> {
	const activeEventManager: EntityManager | undefined = ApiFunctionContextStorage.get<E>()?.eventManager;

	if (options.mode === EApiFunctionTransactionMode.NONE && activeEventManager) {
		throw ErrorException("ApiFunction transaction mode NONE cannot run inside an active transaction");
	}

	if (options.mode === EApiFunctionTransactionMode.MANDATORY && !activeEventManager) {
		throw ErrorException("ApiFunction transaction mode MANDATORY requires an active transaction");
	}

	const eventManager: EntityManager | undefined = options.mode === EApiFunctionTransactionMode.NONE ? undefined : activeEventManager;

	if (options.mode === EApiFunctionTransactionMode.REQUIRED && !eventManager) {
		return await options.repository.manager.transaction(async (transactionManager: EntityManager): Promise<R> => await ApiFunctionTransactionScope.runWithEntityManager(transactionManager, async (): Promise<R> => await options.callback(transactionManager)));
	}

	return await options.callback(eventManager);
}
