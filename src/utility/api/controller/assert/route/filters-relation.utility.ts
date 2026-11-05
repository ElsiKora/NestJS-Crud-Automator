import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { Repository } from "typeorm";

import { ApiControllerGetListQueryRelationFilterSubquery } from "@class/api/controller/get-list/query/relation-filter";
import { EApiRouteType as EApiRouteTypeValue } from "@enum/decorator/api";
import { ApiControllerGetListQueryPlanGet } from "@utility/api/controller/get-list/query/plan/get.utility";
import { ApiControllerGetMethodName } from "@utility/api/controller/get/method-name.utility";

/**
 * Validates the relation filters of a GET_LIST route against the entity metadata of the initialized data source, so a filter the route cannot read exactly fails at bootstrap and not on a request.
 * A data source the application starts later, and a request-scoped controller, learn the same on the first request that uses the filter.
 * @param {object} controllerPrototype - Prototype of the generated controller, which holds the compiled query plan
 * @param {Repository<E>} repository - Repository of the controller entity
 * @param {TApiControllerPropertiesRoute<E, EApiRouteType> | undefined} route - GET_LIST route configuration, absent for an unlisted generated route
 * @param {string} source - Route named in the error
 * @template E - The entity type
 * @throws {Error} When a relation filter of the route cannot read exactly
 */
export function ApiControllerAssertRouteRelationFilters<E extends IApiBaseEntity>(controllerPrototype: object, repository: Repository<E>, route: TApiControllerPropertiesRoute<E, EApiRouteType> | undefined, source: string): void {
	if (route?.generation?.isEnabled === false) {
		return;
	}

	const plan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanGet(controllerPrototype, ApiControllerGetMethodName(EApiRouteTypeValue.GET_LIST));

	if (plan) {
		ApiControllerGetListQueryRelationFilterSubquery.assertPlan(plan, repository, source);
	}
}
