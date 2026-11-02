import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { EntityManager } from "typeorm";

import { Repository } from "typeorm";

/**
 * Binds the repository of a service to a transaction manager, so its overrides and its own members keep working inside the transaction.
 * Anything that is not a real repository, such as a delegating object, gets the plain repository of the entity.
 * @template E - Entity type of the repository.
 * @param {EntityManager} eventManager - Transaction manager.
 * @param {Repository<E> | undefined} repository - Repository of the service.
 * @param {new (...arguments_: Array<unknown>) => E} entity - Entity constructor.
 * @returns {Repository<E>} Repository bound to the transaction manager.
 */
export function ApiFunctionGetTransactionRepository<E extends IApiBaseEntity>(eventManager: EntityManager, repository: Repository<E> | undefined, entity: new (...arguments_: Array<unknown>) => E): Repository<E> {
	return repository instanceof Repository ? eventManager.withRepository<E, Repository<E>>(repository) : eventManager.getRepository<E>(entity);
}
