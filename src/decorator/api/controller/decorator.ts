import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { TApiControllerConstructor } from "@type/decorator/api/controller";

import { CONTROLLER_STARTUP_CHECK_METADATA_KEY } from "@constant/decorator/api/controller-startup-check.constant";
import { ApiControllerFactory } from "@factory/api-controller.factory";
import { ApiControllerApplyGuardResponses } from "@utility/api/controller/apply/guard-responses.utility";
import { ApiControllerApplySecurableResponses } from "@utility/api/controller/apply/securable-responses.utility";

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
		factory.installBootstrapChecks();
		ApiControllerApplySecurableResponses(target);
		ApiControllerApplyGuardResponses(target);

		let isStartupChecked: boolean = false;

		const runStartupCheck: () => void = (): void => {
			factory.assertTableInheritanceChildren();
			factory.assertListResponseOrder();
			factory.assertListResponseFilters();
			factory.assertGetListRelationTargets();
			factory.assertGetListPublishedFilters();
		};

		// eslint-disable-next-line @elsikora/typescript/no-explicit-any
		const ValidatedController: { new (...arguments_: Array<any>): {}; prototype: {} } = class extends target {
			// eslint-disable-next-line @elsikora/typescript/no-explicit-any
			constructor(..._arguments: any) {
				// eslint-disable-next-line @elsikora/typescript/no-unsafe-argument
				super(..._arguments);

				// A REQUEST-scoped controller is constructed per request, after startup has checked it, so a request never fails this check.
				if (!isStartupChecked) {
					runStartupCheck();
					// A guard decorator above this one writes to the class this decorator returns, so it only shows from here on, before Swagger reads the routes
					ApiControllerApplyGuardResponses(new.target);
				}
			}
		};
		Object.defineProperty(ValidatedController, "name", { value: target.name });
		// On the decorated class, which the returned class inherits, so that discarding the return value keeps the check.
		Reflect.defineMetadata(
			CONTROLLER_STARTUP_CHECK_METADATA_KEY,
			(isConstructedPerRequest: boolean): void => {
				runStartupCheck();
				ApiControllerApplyGuardResponses(ValidatedController);
				isStartupChecked = isConstructedPerRequest;
			},
			target,
		);

		return ValidatedController as T;
	};
