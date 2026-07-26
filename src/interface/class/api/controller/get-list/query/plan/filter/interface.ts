import type { EApiControllerGetListQueryUnlistedFields } from "@enum/decorator/api";

import type { IApiControllerGetListQueryPlanFilterField } from "./field.interface";

export interface IApiControllerGetListQueryPlanFilter {
	fields: Readonly<Record<string, IApiControllerGetListQueryPlanFilterField>>;
	isLegacy: boolean;
	unlistedFields?: EApiControllerGetListQueryUnlistedFields;
}
