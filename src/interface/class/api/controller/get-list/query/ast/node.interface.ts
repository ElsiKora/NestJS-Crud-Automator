import type { EFilterOperation } from "@enum/filter";

export interface IApiControllerGetListQueryAstNode {
	operation: EFilterOperation;
	path: string;
	value?: unknown;
	values?: ReadonlyArray<unknown>;
}
