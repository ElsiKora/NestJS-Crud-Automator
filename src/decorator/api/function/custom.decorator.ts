import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiFunctionCustomProperties } from "@interface/decorator/api/function";
import type { Repository } from "typeorm";

import { ApiFunctionCustomRuntime } from "@class/api/function/custom-runtime.class";
import { EApiFunctionTransactionMode } from "@enum/decorator/api";

/**
 * Creates a decorator that executes custom service functions through the ApiFunction runtime.
 * @template E - Entity type handled by the decorated service.
 * @param {IApiFunctionCustomProperties<E>} properties - Custom function configuration and lifecycle metadata.
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A method decorator that wraps the original function.
 */
export function ApiFunctionCustom<E extends IApiBaseEntity>(properties: IApiFunctionCustomProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const transactionMode: EApiFunctionTransactionMode = properties.transaction?.mode ?? EApiFunctionTransactionMode.SUPPORTS;

	return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		const originalMethod: (...arguments_: Array<unknown>) => Promise<unknown> = descriptor.value as (...arguments_: Array<unknown>) => Promise<unknown>;

		descriptor.value = async function (this: { repository: Repository<E> }, ...functionArguments: Array<unknown>): Promise<unknown> {
			return await ApiFunctionCustomRuntime.execute({
				functionArguments,
				methodName: propertyKey,
				originalMethod,
				properties,
				target: this,
				transactionMode,
			});
		};

		return descriptor;
	};
}
