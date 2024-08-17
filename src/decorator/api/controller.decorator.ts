import { ApiControllerFactory } from "../../factory";

import type { BaseApiService } from "../../class";
import type { IApiControllerProperties } from "../../interface/decorator/api/controller-properties.interface";

import type { BaseEntity } from "typeorm";

type TConstructor = new (...arguments_: Array<any>) => { service: BaseApiService<any> };

export const ApiController =
	<E extends BaseEntity>(options: IApiControllerProperties<E>) =>
	<T extends TConstructor>(target: T): T => {
		const factory: ApiControllerFactory<E> = new ApiControllerFactory<E>(target, options);
		factory.init();

		const ValidatedController: { new (...arguments_: Array<any>): {}; prototype: {} } = class extends target {
			constructor(...properties: any) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				super(...properties);
			}
		};
		Object.defineProperty(ValidatedController, "name", { value: target.name });

		return ValidatedController as T;
	};
