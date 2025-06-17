import { IApiBaseEntity } from "@interface/api-base-entity.interface";

export interface IApiSubscriberExecutionContext<E extends IApiBaseEntity, Result = unknown, Input = unknown> {
	/**
	 * An immutable container for metadata (e.g., transaction manager, HTTP headers)
	 */
	readonly data: Input;

	/**
	 * The entity instance the operation is being performed on.
	 */
	readonly entity: E;

	/**
	 * The mutable data payload that subscribers can modify.
	 */
	result?: Result;
} 