import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

/**
 * Execution context for error subscriber callbacks.
 * Contains only entity and input data, without result field.
 */
export interface IApiSubscriberErrorExecutionContext<E extends IApiBaseEntity, Input = unknown> {
	/**
	 * An immutable container for metadata (e.g., transaction manager, HTTP headers)
	 */
	readonly DATA: Input;

	/**
	 * The entity instance the operation is being performed on.
	 */
	readonly ENTITY: E;
}
