import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiSubscriberFunctionExecutionContextData } from "@interface/class/api/subscriber/function/execution/context/data.interface";
import type { FindOptionsWhere } from "typeorm";

/**
 * Data exposed to function subscribers before an entity update or delete.
 * @template E - Entity type being written.
 */
export interface IApiSubscriberFunctionExecutionContextWriteData<E extends IApiBaseEntity> extends IApiSubscriberFunctionExecutionContextData<E> {
	/**
	 * Adds a condition the written row must meet, judged on the row as stored when the write runs. Every condition is ANDed into the write scope, the authorization scope included, so it can only narrow it; an array is an OR of branches inside the one condition.
	 * A row the conditions exclude answers the resource's `404` `{ENTITY}_NOT_FOUND`, as a row outside the scope does. The function must run in a transaction (`REQUIRED`), and only BEFORE subscribers of update and delete may call it.
	 * @param {Array<FindOptionsWhere<E>> | FindOptionsWhere<E>} where - Condition on the written row.
	 * @throws {Error} When the function runs without a transaction, the BEFORE subscribers have finished, or the condition is empty or holds a value TypeORM would drop.
	 */
	addCondition(where: Array<FindOptionsWhere<E>> | FindOptionsWhere<E>): void;
}
