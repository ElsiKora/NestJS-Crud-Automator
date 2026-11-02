import type { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiControllerPropertiesRouteBaseRelationsRequestLoad } from "@interface/decorator/api/controller/properties/route/base/relations/request/load.interface";
import type { IApiControllerPropertiesRouteBaseRelationsResponseLoad } from "@interface/decorator/api/controller/properties/route/base/relations/response/load.interface";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { TApiControllerConstructor } from "@type/decorator/api/controller";
import type { RelationMetadata } from "typeorm";

import { ApiFunctionKeyPageLoader } from "@class/api/function/key-page-loader.class";
import { CONTROLLER_STARTUP_CHECK_METADATA_KEY } from "@constant/decorator/api/controller-startup-check.constant";
import { EApiRouteType } from "@enum/decorator/api";
import { ApiControllerFactory } from "@factory/api-controller.factory";
import { ApiControllerAssertRepositoryEntity } from "@utility/api/controller/assert-repository-entity.utility";
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

				if (Object.values(EApiRouteType).some((routeType: EApiRouteType): boolean => options.routes[routeType]?.generation?.isEnabled !== false)) {
					ApiControllerAssertRepositoryEntity(options.entity, repository, target.name);
				}

				if (repository instanceof Repository) {
					for (const routeType of Object.values(EApiRouteType)) {
						assertRouteRelationLoads(repository as Repository<E>, options.routes[routeType], `Controller "${target.name}" route "${routeType}"`);
					}
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

/**
 * Validates the relation loads of a generated route against the initialized data source.
 * The response load reads the route entity; each request relation load reads its related entity through that entity's service.
 * @param {Repository<E>} repository - Repository of the controller entity
 * @param {TApiControllerPropertiesRoute<E, EApiRouteType> | undefined} route - Route configuration, absent for an unlisted generated route
 * @param {string} source - Route named in the error
 * @template E - The entity type
 * @throws {Error} When a relation load of the route binds a PostgreSQL date or timestamp column
 */
function assertRouteRelationLoads<E extends IApiBaseEntity>(repository: Repository<E>, route: TApiControllerPropertiesRoute<E, EApiRouteType> | undefined, source: string): void {
	if (route?.generation?.isEnabled === false) {
		return;
	}

	const responseLoad: IApiControllerPropertiesRouteBaseRelationsResponseLoad<E> | undefined = route?.relations?.response?.load;

	ApiFunctionKeyPageLoader.assertRelationLoad(repository, { relationLoadStrategy: responseLoad?.relationLoadStrategy, relations: responseLoad?.include }, source);

	const requestLoad: IApiControllerPropertiesRouteBaseRelationsRequestLoad<E> | undefined = route?.relations?.request?.load;

	for (const [propertyName, include] of Object.entries(requestLoad?.include ?? {})) {
		const relation: RelationMetadata | undefined = repository.metadata.findRelationWithPropertyPath(propertyName);

		if (!include || !relation) {
			continue;
		}

		ApiFunctionKeyPageLoader.assertRelationLoad(
			repository.manager.getRepository(relation.inverseEntityMetadata.target),
			{
				// Request relation reads with a lock skip eager relations.
				// eslint-disable-next-line @elsikora/typescript/naming-convention -- TypeORM owns this fixed FindOptions field.
				loadEagerRelations: (requestLoad?.locks as Record<string, unknown> | undefined)?.[propertyName] ? false : undefined,
				relationLoadStrategy: requestLoad?.relationLoadStrategy,
				relations: include === true ? undefined : include,
			},
			`${source} request relation "${propertyName}"`,
		);
	}
}
