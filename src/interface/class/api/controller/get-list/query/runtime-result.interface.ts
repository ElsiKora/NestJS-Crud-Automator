import type { EFilterOrderDirection } from "@enum/filter";

import type { IApiControllerGetListQueryAst } from "./ast";

export interface IApiControllerGetListQueryRuntimeResult {
	ast?: IApiControllerGetListQueryAst;
	filterQuery: Readonly<Record<string, unknown>>;
	limit: number;
	orderBy?: string;
	orderDirection?: EFilterOrderDirection;
	page: number;
}
