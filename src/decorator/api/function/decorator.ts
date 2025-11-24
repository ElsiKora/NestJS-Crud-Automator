import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionProperties } from "@type/decorator/api/function";
import type { Repository } from "typeorm";

import { EApiFunctionType } from "@enum/decorator/api";
import { ErrorException } from "@utility/error-exception.utility";

import { ApiFunctionCreate } from "./create.decorator";
import { ApiFunctionDelete } from "./delete.decorator";
import { ApiFunctionGetList } from "./get-list.decorator";
import { ApiFunctionGetMany } from "./get-many.decorator";
import { ApiFunctionGet } from "./get.decorator";
import { ApiFunctionUpdate } from "./update.decorator";

/**
 * Main decorator factory for API service functions that selects and applies the appropriate function decorator
 * based on the specified type (create, update, delete, get, getList, getMany)
 * @param {TApiFunctionProperties<E>} properties - Configuration properties for the API function
 * @returns {(target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor} A decorator function that applies the appropriate function decorator
 * @template E - The entity type for the API function
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-function/api-function | API Reference - ApiFunction}
 */
// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function ApiFunction<E extends IApiBaseEntity, R>(properties: TApiFunctionProperties<E>): (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor {
	const { entity, type }: TApiFunctionProperties<E> = properties;

	return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		const originalMethod: unknown = descriptor.value;

		// eslint-disable-next-line @elsikora/typescript/naming-convention
		descriptor.value = function (this: { repository: Repository<E> }, ...arguments_: Array<unknown>): unknown {
			let decoratorFunction: (target: unknown, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;

			switch (type) {
				case EApiFunctionType.CREATE: {
					decoratorFunction = ApiFunctionCreate({ entity });

					break;
				}

				case EApiFunctionType.DELETE: {
					decoratorFunction = ApiFunctionDelete({ entity });

					break;
				}

				case EApiFunctionType.GET: {
					decoratorFunction = ApiFunctionGet({ entity });

					break;
				}

				case EApiFunctionType.GET_LIST: {
					decoratorFunction = ApiFunctionGetList({ entity });

					break;
				}

				case EApiFunctionType.GET_MANY: {
					decoratorFunction = ApiFunctionGetMany({ entity });

					break;
				}

				case EApiFunctionType.UPDATE: {
					decoratorFunction = ApiFunctionUpdate({ entity });

					break;
				}

				default: {
					throw ErrorException("Unsupported function");
				}
			}

			const modifiedDescriptor: PropertyDescriptor = decoratorFunction(this, propertyKey, { value: originalMethod });
			const modifiedMethod: (...arguments__: Array<unknown>) => R = modifiedDescriptor.value as (...arguments__: Array<unknown>) => R;

			return modifiedMethod.apply(this, arguments_);
		};

		return descriptor;
	};
}
