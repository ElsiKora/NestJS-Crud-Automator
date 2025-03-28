import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { TApiControllerConstructor } from "@type/decorator/api/controller";

import { ApiControllerFactory } from "@factory/api";

export const ApiController =
	<E extends IApiBaseEntity>(options: IApiControllerProperties<E>) =>
	<T extends TApiControllerConstructor>(target: T): T => {
		const factory: ApiControllerFactory<E> = new ApiControllerFactory<E>(target, options);
		factory.init();

		const ValidatedController: { new (...arguments_: Array<any>): {}; prototype: {} } = class extends target {
			// eslint-disable-next-line @elsikora/typescript/no-useless-constructor
			constructor(..._arguments: any) {
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-argument
				super(..._arguments);
			}
		};
		Object.defineProperty(ValidatedController, "name", { value: target.name });

		return ValidatedController as T;
	};
