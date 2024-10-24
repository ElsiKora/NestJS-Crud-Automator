import { ApiControllerFactory } from "../../factory";

import type { IApiBaseEntity } from "../../interface";

import type { IApiControllerProperties } from "../../interface/decorator/api/controller-properties.interface";
import type { TApiControllerConstructor } from "../../type";

export const ApiController =
	<E extends IApiBaseEntity>(options: IApiControllerProperties<E>) =>
	<T extends TApiControllerConstructor>(target: T): T => {
		const factory: ApiControllerFactory<E> = new ApiControllerFactory<E>(target, options);
		factory.init();

		const ValidatedController: { new (...arguments_: Array<any>): {}; prototype: {} } = class extends target {
			// eslint-disable-next-line @typescript-eslint/naming-convention
			constructor(..._arguments: any) {
				// eslint-disable-next-line @typescript-eslint/no-unsafe-argument
				super(..._arguments);
			}
		};
		Object.defineProperty(ValidatedController, "name", { value: target.name });

		return ValidatedController as T;
	};
