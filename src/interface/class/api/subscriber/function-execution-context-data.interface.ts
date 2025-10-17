import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { EntityManager, Repository } from "typeorm";

/**
 * Data container for function subscriber execution context.
 * Contains transaction manager and repository references.
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
	 * Entity manager for transactional operations.
	 * Available when service methods are called with a transaction manager.
	 */
	eventManager?: EntityManager;

	/**
	 * TypeORM repository instance for the entity.
	 * Provides access to database operations for the entity type.
	 */
	repository: Repository<E>;
}
