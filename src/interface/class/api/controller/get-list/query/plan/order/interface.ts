import type { EApiControllerGetListQueryUnlistedFields } from "@enum/decorator/api";

import type { IApiControllerGetListQueryPlanOrderField } from "./field.interface";

export interface IApiControllerGetListQueryPlanOrder {
	fields: Readonly<Record<string, IApiControllerGetListQueryPlanOrderField>>;
	isLegacy: boolean;
	unlistedFields?: EApiControllerGetListQueryUnlistedFields;
}
