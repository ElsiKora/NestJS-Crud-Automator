import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { TApiControllerGetListQueryCompiledPlan } from "@type/class/api/controller/get-list/compiled/plan.type";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { Repository } from "typeorm";

import { ApiControllerGetListCursorDataSourceContract } from "@class/api/controller/get-list/cursor/data-source-contract.class";
import { EApiControllerGetListQueryPaginationMode, EApiRouteType as EApiRouteTypeValue } from "@enum/decorator/api";
import { ApiControllerGetListQueryGetPaginationMode } from "@utility/api/controller/get-list/query/get-pagination-mode.utility";
import { ApiControllerGetListQueryPlanGet } from "@utility/api/controller/get-list/query/plan/get.utility";
import { ApiControllerGetMethodName } from "@utility/api/controller/get/method-name.utility";
import { ErrorException } from "@utility/error/exception.utility";

const ERROR_EXCEPTION_PREFIX_PATTERN: RegExp = /^\[NestJS-Crud-Automator\] /u;

/**
 * Validates a CURSOR GET_LIST route against the database and storage contract of the initialized data source.
 * It runs the same proof the route runs before query I/O, so a route the active database cannot serve fails at bootstrap.
 * @param {object} controllerPrototype - Prototype of the generated controller, which holds the compiled query plan
 * @param {Repository<E>} repository - Repository of the controller entity
 * @param {TApiControllerPropertiesRoute<E, EApiRouteType> | undefined} route - GET_LIST route configuration, absent for an unlisted generated route
 * @param {string} source - Route named in the error
 * @template E - The entity type
 * @throws {Error} When the route uses CURSOR pagination that the active database or storage cannot serve
 */
export function ApiControllerAssertRouteCursorDataSource<E extends IApiBaseEntity>(controllerPrototype: object, repository: Repository<E>, route: TApiControllerPropertiesRoute<E, EApiRouteType> | undefined, source: string): void {
	if (route?.generation?.isEnabled === false) {
		return;
	}

	const plan: IApiControllerGetListQueryPlan | undefined = ApiControllerGetListQueryPlanGet(controllerPrototype, ApiControllerGetMethodName(EApiRouteTypeValue.GET_LIST));

	if (!plan || ApiControllerGetListQueryGetPaginationMode(plan) !== EApiControllerGetListQueryPaginationMode.CURSOR) {
		return;
	}

	const compiledPlan: Partial<TApiControllerGetListQueryCompiledPlan> = plan as Partial<TApiControllerGetListQueryCompiledPlan>;

	if (!compiledPlan.order?.serverFields) {
		throw ErrorException(`${source}: CURSOR GET_LIST compiled query plan is unavailable`);
	}

	try {
		ApiControllerGetListCursorDataSourceContract.assertSafe(repository, plan as TApiControllerGetListQueryCompiledPlan);
	} catch (error) {
		const reason: string = error instanceof Error ? error.message.replace(ERROR_EXCEPTION_PREFIX_PATTERN, "") : String(error);

		throw ErrorException(`${source}: ${reason}`);
	}
}
