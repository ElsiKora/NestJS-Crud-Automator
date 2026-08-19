import type { EFilterOrderDirection } from "@enum/filter";

import type { IApiControllerGetListQueryAst } from "./ast";
import type { IApiControllerGetListQueryPlanOrderEntry } from "./plan/order";

export interface IApiControllerGetListQueryRuntimeResult {
	ast?: IApiControllerGetListQueryAst;
	filterQuery: Readonly<Record<string, unknown>>;
	limit: number;
	order?: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>;
	orderBy?: string;
	orderDirection?: EFilterOrderDirection;
	page: number;
}
