import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

/**
 * Execution context for subscriber callbacks.
 * Contains entity, input data, and mutable result field.
 */
export interface IApiSubscriberExecutionContext<E extends IApiBaseEntity, Result = unknown, Input = unknown> {
	/**
	 * An immutable container for metadata (e.g., transaction manager, HTTP headers)
	 */
	readonly DATA: Input;

	/**
	 * The entity instance the operation is being performed on.
	 */
	readonly ENTITY: E;

	/**
	 * The mutable data payload that subscribers can modify.
	 */
	result: Result;
}
