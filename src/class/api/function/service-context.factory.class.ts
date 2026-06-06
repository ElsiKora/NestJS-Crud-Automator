import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionContext, IApiFunctionStepContext } from "@interface/class/api/function";
import type { IApiGetListResponseResult } from "@interface/decorator/api";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateCriteria, TApiFunctionUpdateProperties } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

import { ErrorException } from "@utility/error/exception.utility";

export class ApiFunctionServiceContextFactory {
	/**
	 * Creates a service-bound ApiFunction context for custom functions and internal steps.
	 * @template E - Entity type associated with the decorated function or step.
	 * @param {object} options - Context creation options.
	 * @param {new (...arguments_: Array<unknown>) => E} options.entity - Entity constructor associated with the service context.
	 * @param {EntityManager} [options.eventManager] - Active transaction manager, when available.
	 * @param {{ repository?: Repository<E> }} options.target - Service instance that owns the decorated method.
	 * @param {Repository<E>} [options.target.repository] - Service repository used to resolve non-transactional repositories.
	 * @returns {IApiFunctionContext<E>} Service-bound function context.
	 */
	public static create<E extends IApiBaseEntity>(options: { entity: new (...arguments_: Array<unknown>) => E; eventManager?: EntityManager; target: { repository?: Repository<E> } }): IApiFunctionContext<E> {
		const repository: Repository<E> | undefined = options.eventManager?.getRepository(options.entity) ?? ApiFunctionServiceContextFactory.resolveManagerRepository(options.target, options.entity);

		if (!repository) {
			throw ErrorException("Repository is not available in this context");
		}

		return {
			entity: options.entity,
			eventManager: options.eventManager,
			getRepository: <T extends IApiBaseEntity>(repositoryEntity: new () => T): Repository<T> => options.eventManager?.getRepository(repositoryEntity) ?? ApiFunctionServiceContextFactory.getManagerRepository(options.target, repositoryEntity),
			operations: {
				create: async (properties: TApiFunctionCreateProperties<E>): Promise<E> => await (options.target as unknown as { create(properties: unknown): Promise<E> }).create(properties),
				delete: async (criteria: Array<TApiFunctionDeleteCriteria<E>> | TApiFunctionDeleteCriteria<E>): Promise<void> => {
					await (options.target as unknown as { delete(criteria: unknown): Promise<void> }).delete(criteria);
				},
				get: async (properties: TApiFunctionGetProperties<E>): Promise<E> => await (options.target as unknown as { get(properties: unknown): Promise<E> }).get(properties),
				getList: async (properties: TApiFunctionGetListProperties<E>): Promise<IApiGetListResponseResult<E>> => await (options.target as unknown as { getList(properties: unknown): Promise<IApiGetListResponseResult<E>> }).getList(properties),
				getMany: async (properties: TApiFunctionGetManyProperties<E>): Promise<Array<E>> => await (options.target as unknown as { getMany(properties: unknown): Promise<Array<E>> }).getMany(properties),
				getRepository: <T extends IApiBaseEntity>(repositoryEntity: new () => T): Repository<T> => options.eventManager?.getRepository(repositoryEntity) ?? ApiFunctionServiceContextFactory.getManagerRepository(options.target, repositoryEntity),
				update: async (criteria: Array<TApiFunctionUpdateCriteria<E>> | TApiFunctionUpdateCriteria<E>, properties: TApiFunctionUpdateProperties<E>): Promise<E> => await (options.target as unknown as { update(criteria: unknown, properties: unknown): Promise<E> }).update(criteria, properties),
			},
			repository,
		};
	}

	/**
	 * Creates a narrow service-bound ApiFunctionStep context.
	 * @template E - Entity type associated with the decorated step.
	 * @param {object} options - Context creation options.
	 * @param {new (...arguments_: Array<unknown>) => E} options.entity - Entity constructor associated with the step context.
	 * @param {EntityManager} [options.eventManager] - Active transaction manager, when available.
	 * @param {{ repository?: Repository<E> }} options.target - Service instance that owns the decorated step.
	 * @param {Repository<E>} [options.target.repository] - Service repository used to resolve non-transactional repositories.
	 * @returns {IApiFunctionStepContext<E>} Service-bound step context.
	 */
	public static createStep<E extends IApiBaseEntity>(options: { entity: new (...arguments_: Array<unknown>) => E; eventManager?: EntityManager; target: { repository?: Repository<E> } }): IApiFunctionStepContext<E> {
		const repository: Repository<E> | undefined = options.eventManager?.getRepository(options.entity) ?? ApiFunctionServiceContextFactory.resolveManagerRepository(options.target, options.entity);

		if (!repository) {
			throw ErrorException("Repository is not available in this context");
		}

		return {
			eventManager: options.eventManager,
			getRepository: <T extends IApiBaseEntity>(repositoryEntity: new () => T): Repository<T> => options.eventManager?.getRepository(repositoryEntity) ?? ApiFunctionServiceContextFactory.getManagerRepository(options.target, repositoryEntity),
			repository,
		};
	}

	/**
	 * Resolves repositories from the service repository manager when no transaction manager is active.
	 * @template T - Repository entity type.
	 * @param {{ repository?: Repository<IApiBaseEntity> }} target - Service instance with an optional repository.
	 * @param {Repository<IApiBaseEntity>} [target.repository] - Service repository used to resolve repositories.
	 * @param {new () => T} entity - Entity constructor to resolve.
	 * @returns {Repository<T>} Repository from the service manager.
	 */
	private static getManagerRepository<T extends IApiBaseEntity>(target: { repository?: Repository<IApiBaseEntity> }, entity: new () => T): Repository<T> {
		if (!target.repository) {
			throw ErrorException("Repository is not available in this context");
		}

		return target.repository.manager.getRepository(entity);
	}

	/**
	 * Resolves a repository from the service repository manager if a service repository exists.
	 * @template T - Repository entity type.
	 * @param {{ repository?: Repository<IApiBaseEntity> }} target - Service instance with an optional repository.
	 * @param {Repository<IApiBaseEntity>} [target.repository] - Service repository used to resolve repositories.
	 * @param {new () => T} entity - Entity constructor to resolve.
	 * @returns {Repository<T> | undefined} Repository from the service manager, when available.
	 */
	private static resolveManagerRepository<T extends IApiBaseEntity>(target: { repository?: Repository<IApiBaseEntity> }, entity: new () => T): Repository<T> | undefined {
		return target.repository?.manager.getRepository(entity);
	}
}
