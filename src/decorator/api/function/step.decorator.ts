import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionStepProperties } from "@interface/decorator/api/function/step-properties.interface";
import type { Repository } from "typeorm";

import { ApiFunctionStepRuntime } from "@class/api/function/step-runtime.class";
import { EApiFunctionTransactionMode } from "@enum/decorator/api";

/**
 * Creates a decorator for internal transaction-aware ApiFunction steps.
 * @template E - Entity type handled by the decorated service.
 * @param {IApiFunctionStepProperties<E>} properties - Step transaction and entity configuration.
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A method decorator that wraps the original function.
 */
export function ApiFunctionStep<E extends IApiBaseEntity>(properties: IApiFunctionStepProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const transactionMode: EApiFunctionTransactionMode = properties.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;

	return function (_target: unknown, _propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		const originalMethod: (...arguments_: Array<unknown>) => Promise<unknown> = descriptor.value as (...arguments_: Array<unknown>) => Promise<unknown>;

		descriptor.value = async function (this: { repository?: Repository<E> }, ...functionArguments: Array<unknown>): Promise<unknown> {
			return await ApiFunctionStepRuntime.execute({
				functionArguments,
				originalMethod,
				properties,
				target: this,
				transactionMode,
			});
		};

		return descriptor;
	};
}
