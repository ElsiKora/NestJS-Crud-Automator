import type { ObjectLiteral, Repository } from "typeorm";

import { DatabaseTypeOrmGetRepositoryGap } from "@utility/database/typeorm/get/repository-gap.utility";
import { DatabaseTypeOrmIsRepository } from "@utility/database/typeorm/is/repository.utility";
import { ErrorException } from "@utility/error/exception.utility";

/**
 * Reads the repository of a controller's service and fails with the controller named when it is not a usable TypeORM repository.
 * @param {unknown} service - The controller's service
 * @param {string} source - Controller or route named in the error
 * @param {string} consequence - End of the error message, stating what the failure blocks
 * @template E - The entity type of the repository
 * @returns {Repository<E>} The repository of the service
 * @throws {Error} When the controller has no service, or reading the repository fails, or the value is not a repository
 */
export function DatabaseTypeOrmAssertServiceRepository<E extends ObjectLiteral = ObjectLiteral>(service: unknown, source: string, consequence: string): Repository<E> {
	const createError = (gap: string): Error => ErrorException(`${source}: service.repository is not a usable TypeORM repository because ${gap}${consequence}`);

	if (!service || (typeof service !== "object" && typeof service !== "function")) {
		throw createError("the controller has no service");
	}

	let repository: unknown;

	try {
		repository = Reflect.get(service, "repository");
	} catch (error) {
		throw createError(`reading it failed (${error instanceof Error ? error.message : String(error)})`);
	}

	if (!DatabaseTypeOrmIsRepository<E>(repository)) {
		throw createError(DatabaseTypeOrmGetRepositoryGap(repository) ?? "it is unrecognized");
	}

	return repository;
}
