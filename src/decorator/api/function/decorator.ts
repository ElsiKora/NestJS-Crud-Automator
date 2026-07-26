import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiFunctionProperties } from "@type/decorator/api/function";
import type { Repository } from "typeorm";

import { ApiFunctionCreate } from "@decorator/api/function/create.decorator";
import { ApiFunctionCustom } from "@decorator/api/function/custom.decorator";
import { ApiFunctionDelete } from "@decorator/api/function/delete.decorator";
import { ApiFunctionGet } from "@decorator/api/function/get/decorator";
import { ApiFunctionGetList } from "@decorator/api/function/get/list.decorator";
import { ApiFunctionGetMany } from "@decorator/api/function/get/many.decorator";
import { ApiFunctionUpdate } from "@decorator/api/function/update.decorator";
import { EApiFunctionType } from "@enum/decorator/api";
import { ErrorException } from "@utility/error/exception.utility";

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
					decoratorFunction = ApiFunctionCreate({ entity, transaction: properties.transaction });

					break;
				}

				case EApiFunctionType.CUSTOM: {
					decoratorFunction = ApiFunctionCustom({ action: properties.action ?? propertyKey, entity, transaction: properties.transaction });

					break;
				}

				case EApiFunctionType.DELETE: {
					decoratorFunction = ApiFunctionDelete({ entity, transaction: properties.transaction });

					break;
				}

				case EApiFunctionType.GET: {
					decoratorFunction = ApiFunctionGet({ entity, transaction: properties.transaction });

					break;
				}

				case EApiFunctionType.GET_LIST: {
					decoratorFunction = ApiFunctionGetList({ entity, transaction: properties.transaction });

					break;
				}

				case EApiFunctionType.GET_MANY: {
					decoratorFunction = ApiFunctionGetMany({ entity, transaction: properties.transaction });

					break;
				}

				case EApiFunctionType.UPDATE: {
					decoratorFunction = ApiFunctionUpdate({ entity, transaction: properties.transaction });

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
