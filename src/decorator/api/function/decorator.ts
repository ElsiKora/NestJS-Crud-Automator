import { EApiFunctionType } from "../../../enum";

import { ApiFunctionCreate } from "./create.decorator";
import { ApiFunctionDelete } from "./delete.decorator";
import { ApiFunctionGetList } from "./get-list.decorator";
import { ApiFunctionGet } from "./get.decorator";
import { ApiFunctionUpdate } from "./update.decorator";

import type { BaseEntity, FindOptionsRelations, Repository } from "typeorm";

export function ApiFunction<E extends BaseEntity>(options: { model: new () => E; relations?: FindOptionsRelations<E>; type: EApiFunctionType }) {
	return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = function (this: { repository: Repository<E> }, ...arguments_: Array<any>) {
			switch (options.type) {
				case EApiFunctionType.GET_LIST: {
					return ApiFunctionGetList({ model: options.model })(this, _propertyKey, { value: originalMethod }).value.apply(this, arguments_);
				}

				case EApiFunctionType.GET: {
					return ApiFunctionGet({ model: options.model })(this, _propertyKey, { value: originalMethod }).value.apply(this, arguments_);
				}

				case EApiFunctionType.CREATE: {
					return ApiFunctionCreate({ model: options.model })(this, _propertyKey, {
						value: originalMethod,
					}).value.apply(this, arguments_);
				}

				case EApiFunctionType.UPDATE: {
					return ApiFunctionUpdate({ model: options.model })(this, _propertyKey, {
						value: originalMethod,
					}).value.apply(this, arguments_);
				}

				case EApiFunctionType.DELETE: {
					return ApiFunctionDelete({ model: options.model })(this, _propertyKey, {
						value: originalMethod,
					}).value.apply(this, arguments_);
				}

				default: {
					throw new Error("Unsupported function");
				}
			}

			return originalMethod.apply(this, arguments_);
		};

		return descriptor;
	};
}
