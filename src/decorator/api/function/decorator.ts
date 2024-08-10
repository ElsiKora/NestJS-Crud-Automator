import type {BaseEntity, FindOptionsRelations, Repository} from "typeorm";
import {ApiFunctionGetList} from "./get-list.decorator";
import {EApiFunctionType} from "../../../enum";
import {ApiFunctionGet} from "./get.decorator";

export function ApiFunction<E extends BaseEntity>(options: { model: new () => E; type: EApiFunctionType; relations?: FindOptionsRelations<E> }) {
	return function (_target: any, _propertyKey: string, descriptor: PropertyDescriptor) {
		const originalMethod = descriptor.value;

		descriptor.value = function (this: { repository: Repository<E> }, ...args: Array<any>) {

			switch (options.type) {
				case EApiFunctionType.GET_LIST: {
					return ApiFunctionGetList({ model: options.model, relations: options.relations })(this, _propertyKey, { value: originalMethod }).value.apply(this, args);
				}

				case EApiFunctionType.GET: {
					return ApiFunctionGet({ model: options.model })(this, _propertyKey, { value: originalMethod }).value.apply(this, args);
				}

				default: {
					throw new Error("Unsupported function");
				}
			}

			return originalMethod.apply(this, args);
		};

		return descriptor;
	};
}
