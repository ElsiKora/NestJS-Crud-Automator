import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiControllerPropertiesRouteBaseRelationsResponseLoad } from "@interface/decorator/api/controller/properties/route/base/relations/response/load.interface";
import type { TApiControllerConstructor } from "@type/decorator/api/controller";

import { ApiFunctionKeyPageLoader } from "@class/api/function/key-page-loader.class";
import { ApiControllerFactory } from "@factory/api-controller.factory";
import { Repository } from "typeorm";

/**
 * Automatically generates CRUD endpoints for an entity.
 * @param {IApiControllerProperties<E>} options - The controller properties
 * @returns {TApiControllerConstructor} The controller constructor
 * @template E - The entity type
 * @example
 * ```typescript
 * @ApiController<UserEntity>({
 *   entity: UserEntity,
 *   name: "Users",
 *   routes: {
 *     [EApiRouteType.CREATE]: {},
 *     [EApiRouteType.GET]: {},
 *     [EApiRouteType.GET_LIST]: {},
 *     [EApiRouteType.UPDATE]: {},
 *     [EApiRouteType.DELETE]: {},
 *   },
 * })
 * export class UserController {}
 * ```
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/api-reference/decorators/api-controller/api-controller | API Reference - ApiController}
 * @see {@link https://elsikora.com/docs/nestjs-crud-automator/core-concepts/controllers | Core Concepts - Controllers}
 */
export const ApiController =
	<E extends IApiBaseEntity>(options: IApiControllerProperties<E>) =>
	<T extends TApiControllerConstructor>(target: T): T => {
		const factory: ApiControllerFactory<E, EApiControllerGetListQueryPaginationMode> = new ApiControllerFactory<E, EApiControllerGetListQueryPaginationMode>(target, options);
		factory.init();

		// eslint-disable-next-line @elsikora/typescript/no-explicit-any
		const ValidatedController: { new (...arguments_: Array<any>): {}; prototype: {} } = class extends target {
			// eslint-disable-next-line @elsikora/typescript/no-explicit-any
			constructor(..._arguments: any) {
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-argument
				super(..._arguments);
				factory.assertTableInheritanceChildren();
			}

			/**
			 * Validates response relation loads against the initialized data source, then runs the controller's own hook.
			 * @returns {Promise<void>} Resolves when the controller bootstrap finished
			 */
			public async onApplicationBootstrap(): Promise<void> {
				const repository: unknown = (this as { service?: { repository?: unknown } }).service?.repository;

				if (repository instanceof Repository) {
					for (const [routeType, route] of Object.entries(options.routes) as Array<[string, { generation?: { isEnabled?: boolean }; relations?: { response?: { load?: IApiControllerPropertiesRouteBaseRelationsResponseLoad<E> } } } | undefined]>) {
						const load: IApiControllerPropertiesRouteBaseRelationsResponseLoad<E> | undefined = route?.relations?.response?.load;

						if (route?.generation?.isEnabled !== false && load?.include) {
							ApiFunctionKeyPageLoader.assertRelationLoad(repository, load.include, load.relationLoadStrategy, `Controller "${target.name}" route "${routeType}"`);
						}
					}
				}

				const controllerHook: (() => unknown) | undefined = (target.prototype as { onApplicationBootstrap?: () => unknown }).onApplicationBootstrap;

				if (controllerHook) {
					await controllerHook.call(this);
				}
			}
		};
		Object.defineProperty(ValidatedController, "name", { value: target.name });

		return ValidatedController as T;
	};
