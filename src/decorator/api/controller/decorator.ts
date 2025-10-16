import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { TApiControllerConstructor } from "@type/decorator/api/controller";

import { ApiControllerFactory } from "@factory/api";

/**
 * Automatically generates CRUD endpoints for an entity.
 *
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators#apicontroller | API Reference - ApiController}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/core-concepts/controllers | Core Concepts - Controllers}
 */
export const ApiController =
	<E extends IApiBaseEntity>(options: IApiControllerProperties<E>) =>
	<T extends TApiControllerConstructor>(target: T): T => {
		const factory: ApiControllerFactory<E> = new ApiControllerFactory<E>(target, options);
		factory.init();

		// eslint-disable-next-line @elsikora/typescript/no-explicit-any
		const ValidatedController: { new (...arguments_: Array<any>): {}; prototype: {} } = class extends target {
			// eslint-disable-next-line @elsikora/typescript/no-useless-constructor, @elsikora/typescript/no-explicit-any
			constructor(..._arguments: any) {
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-argument
				super(..._arguments);
			}
		};
		Object.defineProperty(ValidatedController, "name", { value: target.name });

		return ValidatedController as T;
	};
