import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context/data.interface";

/**
 * Data exposed to function subscribers before an entity update.
 * @template E - Entity type being updated.
 */
export interface IApiSubscriberFunctionExecutionContextUpdateData<E extends IApiBaseEntity> extends IApiSubscriberFunctionExecutionContextData<E> {
	/**
	 * Detached, top-level frozen snapshot loaded before update subscribers run.
	 */
	get currentEntity(): Readonly<E>;
}
