import type { EFilterOrderDirection } from "@enum/filter";

export interface IApiControllerGetListQueryPlanOrderEntry {
	direction: EFilterOrderDirection;
	field: string;
}
