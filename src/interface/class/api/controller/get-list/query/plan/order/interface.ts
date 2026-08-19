import type { EApiControllerGetListQueryUnlistedFields } from "@enum/decorator/api";

import type { IApiControllerGetListQueryPlanOrderEntry } from "./entry.interface";
import type { IApiControllerGetListQueryPlanOrderField } from "./field.interface";

export interface IApiControllerGetListQueryPlanOrder {
	defaultOrder?: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>;
	fields: Readonly<Record<string, IApiControllerGetListQueryPlanOrderField>>;
	isLegacy: boolean;
	tieBreakers?: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>;
	unlistedFields?: EApiControllerGetListQueryUnlistedFields;
}
