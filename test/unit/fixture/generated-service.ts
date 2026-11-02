import type { Repository } from "typeorm";

import { ApiServiceBase } from "@class/api/service-base.class";
import { ApiService } from "@decorator/api/service/decorator";

/**
 * Builds a service over the given repository whose generated functions `@ApiService` defines, so a controller with generated routes passes the startup check of the functions each route calls.
 * @param {Function} entity - Entity of the service.
 * @param {unknown} repository - Repository the service exposes.
 * @returns {ApiServiceBase<E>} The service.
 * @template E - The entity type
 */
export function createGeneratedServiceDouble<E extends object>(entity: Function, repository: unknown): ApiServiceBase<E> {
	class GeneratedServiceDouble extends ApiServiceBase<E> {
		public readonly repository: Repository<E> = repository as Repository<E>;
	}

	const DecoratedService: new () => ApiServiceBase<E> = ApiService({ entity } as never)(GeneratedServiceDouble) as new () => ApiServiceBase<E>;

	return new DecoratedService();
}
