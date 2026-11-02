import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { EntityManager } from "typeorm";

import { Repository } from "typeorm";

/**
 * Binds the repository of a service to a transaction manager, so its overrides and its own members keep working inside the transaction.
 * The bound repository inherits from the service repository and only replaces its manager and query runner: a repository class may build itself from its own constructor arguments, such as a NestJS provider that takes the DataSource, so its constructor never runs again.
 * Anything that is not a real repository, such as a delegating object, gets the plain repository of the entity.
 * @template E - Entity type of the repository.
 * @param {EntityManager} eventManager - Transaction manager.
 * @param {Repository<E> | undefined} repository - Repository of the service.
 * @param {new (...arguments_: Array<unknown>) => E} entity - Entity constructor.
 * @returns {Repository<E>} Repository bound to the transaction manager.
 */
export function ApiFunctionGetTransactionRepository<E extends IApiBaseEntity>(eventManager: EntityManager, repository: Repository<E> | undefined, entity: new (...arguments_: Array<unknown>) => E): Repository<E> {
	if (!(repository instanceof Repository)) {
		return eventManager.getRepository<E>(entity);
	}

	return Object.assign(Object.create(repository) as Repository<E>, { manager: eventManager, queryRunner: eventManager.queryRunner });
}
