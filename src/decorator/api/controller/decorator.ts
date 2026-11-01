import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { TApiControllerConstructor } from "@type/decorator/api/controller";
import type { Repository } from "typeorm";

import { CONTROLLER_STARTUP_CHECK_METADATA_KEY } from "@constant/decorator/api/controller-startup-check.constant";
import { EApiRouteType } from "@enum/decorator/api";
import { ApiControllerFactory } from "@factory/api-controller.factory";
import { ApiControllerAssertRepositoryEntity } from "@utility/api/controller/assert-repository-entity.utility";
import { ApiControllerAssertRouteRelationLoads } from "@utility/api/controller/assert/route-relation-loads.utility";
import { DatabaseTypeOrmIsRepository } from "@utility/database/typeorm/is/repository.utility";

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

		let isStartupChecked: boolean = false;

		const runStartupCheck: () => void = (): void => {
			factory.assertTableInheritanceChildren();
			factory.assertListResponseOrder();
			factory.assertGetListRelationTargets();
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
				}
			}

			/**
			 * Validates response relation loads against the initialized data source, then runs the controller's own hook.
			 * @returns {Promise<void>} Resolves when the controller bootstrap finished
			 */
			public async onApplicationBootstrap(): Promise<void> {
				const repository: unknown = (this as { service?: { repository?: unknown } }).service?.repository;

				if (!DatabaseTypeOrmIsRepository(repository)) {
					throw new Error(`Controller "${target.name}": service has no TypeORM repository`);
				}

				if (Object.values(EApiRouteType).some((routeType: EApiRouteType): boolean => options.routes[routeType]?.generation?.isEnabled !== false)) {
					ApiControllerAssertRepositoryEntity(options.entity, repository, target.name);
				}

				for (const routeType of Object.values(EApiRouteType)) {
					ApiControllerAssertRouteRelationLoads(repository as Repository<E>, options.routes[routeType], `Controller "${target.name}" route "${routeType}"`);
				}

				const controllerHook: (() => unknown) | undefined = (target.prototype as { onApplicationBootstrap?: () => unknown }).onApplicationBootstrap;

				if (controllerHook) {
					await controllerHook.call(this);
				}
			}
		};
		Object.defineProperty(ValidatedController, "name", { value: target.name });
		Reflect.defineMetadata(
			CONTROLLER_STARTUP_CHECK_METADATA_KEY,
			(isConstructedPerRequest: boolean): void => {
				runStartupCheck();
				isStartupChecked = isConstructedPerRequest;
			},
			ValidatedController,
		);

		return ValidatedController as T;
	};
