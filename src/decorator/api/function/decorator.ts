import type { Repository } from "typeorm";

import type { IApiBaseEntity } from "../../../interface";
import type { TApiFunctionProperties } from "../../../type";

import { EApiFunctionType } from "../../../enum";
import { ErrorException } from "../../../utility/error-exception.utility";

import { ApiFunctionCreate } from "./create.decorator";
import { ApiFunctionDelete } from "./delete.decorator";
import { ApiFunctionGetList } from "./get-list.decorator";
import { ApiFunctionGetMany } from "./get-many.decorator";
import { ApiFunctionGet } from "./get.decorator";
import { ApiFunctionUpdate } from "./update.decorator";

type TDecoratorFunction = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;

// eslint-disable-next-line @elsikora/typescript/no-unnecessary-type-parameters
export function ApiFunction<E extends IApiBaseEntity, R>(properties: TApiFunctionProperties<E>) {
	const { entity, type }: TApiFunctionProperties<E> = properties;

	return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		const originalMethod: unknown = descriptor.value;

		// eslint-disable-next-line @elsikora/typescript/naming-convention
		descriptor.value = function (this: { repository: Repository<E> }, ...arguments_: Array<any>): any {
			let decoratorFunction: TDecoratorFunction;

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
			const modifiedMethod: (...arguments__: Array<any>) => R = modifiedDescriptor.value as (...arguments__: Array<any>) => R;

			return modifiedMethod.apply(this, arguments_);
		};

		return descriptor;
	};
}
