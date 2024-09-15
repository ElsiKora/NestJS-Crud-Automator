import { EApiFunctionType } from "../../../enum";

import { ErrorException } from "../../../utility";

import { ApiFunctionCreate } from "./create.decorator";
import { ApiFunctionDelete } from "./delete.decorator";
import { ApiFunctionGetList } from "./get-list.decorator";
import { ApiFunctionGet } from "./get.decorator";
import { ApiFunctionUpdate } from "./update.decorator";

import type { IApiBaseEntity } from "../../../interface";
import type { TApiFunctionProperties } from "../../../type/decorator/api/function/properties.type";
import type { Repository } from "typeorm";

type TDecoratorFunction = (target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;

export function ApiFunction<E extends IApiBaseEntity, R>(properties: TApiFunctionProperties<E>) {
	const { entity, type }: TApiFunctionProperties<E> = properties;

	// eslint-disable-next-line @typescript-eslint/naming-convention
	return function (_target: unknown, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor {
		const originalMethod: unknown = descriptor.value;

		// eslint-disable-next-line @typescript-eslint/naming-convention
		descriptor.value = function (this: { repository: Repository<E> }, ...arguments_: Array<any>): any {
			let decoratorFunction: TDecoratorFunction;

			switch (type) {
				case EApiFunctionType.GET_LIST: {
					decoratorFunction = ApiFunctionGetList({ model: entity });

					break;
				}

				case EApiFunctionType.GET: {
					decoratorFunction = ApiFunctionGet({ model: entity });

					break;
				}

				case EApiFunctionType.CREATE: {
					decoratorFunction = ApiFunctionCreate({ entity: entity });

					break;
				}

				case EApiFunctionType.UPDATE: {
					decoratorFunction = ApiFunctionUpdate({ model: entity });

					break;
				}

				case EApiFunctionType.DELETE: {
					decoratorFunction = ApiFunctionDelete({ model: entity });

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
