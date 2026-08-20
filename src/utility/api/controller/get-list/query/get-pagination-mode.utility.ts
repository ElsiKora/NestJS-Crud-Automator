import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { TApiControllerGetListQueryCompiledPlan } from "@type/class/api/controller/get-list/compiled/plan.type";

import { EApiControllerGetListQueryPaginationMode } from "@enum/decorator/api";

/**
 * Reads the internal pagination mode while treating legacy public plans as PAGE.
 * @param {IApiControllerGetListQueryPlan} [plan] - Public or internally compiled query plan.
 * @returns {EApiControllerGetListQueryPaginationMode} Effective pagination mode.
 */
export function ApiControllerGetListQueryGetPaginationMode(plan?: IApiControllerGetListQueryPlan): EApiControllerGetListQueryPaginationMode {
	const paginationMode: unknown = (plan as Partial<TApiControllerGetListQueryCompiledPlan> | undefined)?.pagination?.mode;

	return paginationMode === EApiControllerGetListQueryPaginationMode.CURSOR ? EApiControllerGetListQueryPaginationMode.CURSOR : EApiControllerGetListQueryPaginationMode.PAGE;
}
