import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionCreateProperties, TApiFunctionDeleteCriteria, TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties, TApiFunctionUpdateCriteria } from "@type/decorator/api/function";
import type { EntityManager, Repository } from "typeorm";

/**
 * Data container for function subscriber execution context.
 * Contains transaction manager, repository references, and operation payload metadata.
 * This interface provides typed access to the DATA field in function execution contexts.
 * @example
 * ```typescript
 * async onBeforeCreate(
 *   context: IApiSubscriberFunctionExecutionContext<
 *     User,
 *     TApiFunctionCreateProperties<User>,
 *     IApiSubscriberFunctionExecutionContextData<User>
 *   >
 * ): Promise<TApiFunctionCreateProperties<User>> {
 *   const manager = context.DATA.eventManager;
 *   const repository = context.DATA.repository;
 *
 *   if (manager) {
 *     await manager.save(RelatedEntity, { ... });
 *   }
 *
 *   return context.result;
 * }
 * ```
 */
export interface IApiSubscriberFunctionExecutionContextData<E extends IApiBaseEntity> {
	/**
	 * Criteria used for update/delete operations.
	 */
	criteria?: TApiFunctionDeleteCriteria<E> | TApiFunctionUpdateCriteria<E>;

	/**
	 * Entity manager for transactional operations.
	 * Available when service methods are called with a transaction manager.
	 */
	eventManager?: EntityManager;

	/**
	 * Input payload for get list operations (before hooks).
	 */
	getListProperties?: TApiFunctionGetListProperties<E>;

	/**
	 * Input payload for get many operations (before hooks).
	 */
	getManyProperties?: TApiFunctionGetManyProperties<E>;

	/**
	 * Input payload for get operations (before hooks).
	 */
	getProperties?: TApiFunctionGetProperties<E>;

	/**
	 * Properties used in function executor contexts (create/get/getList/getMany).
	 */
	properties?: TApiFunctionCreateProperties<E> | TApiFunctionGetListProperties<E> | TApiFunctionGetManyProperties<E> | TApiFunctionGetProperties<E>;

	/**
	 * TypeORM repository instance for the entity.
	 * Provides access to database operations for the entity type.
	 */
	repository: Repository<E>;
}
