import type { EApiControllerGetListQueryUnlistedFields } from "@enum/decorator/api";

import type { IApiControllerGetListQueryPlanOrderEntry } from "./entry.interface";
import type { IApiControllerGetListQueryPlanOrderField } from "./field.interface";

export interface IApiControllerGetListQueryPlanOrder {
	defaultOrder?: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>;
	fields: Readonly<Record<string, IApiControllerGetListQueryPlanOrderField>>;
	isLegacy: boolean;
	// Item properties a manual list response publishes, read on first use because its lazy types may name classes that do not exist while the plan compiles. Only an enabled field it lists is orderable.
	resolvePublishedFields?: () => ReadonlySet<string>;
	tieBreakers?: ReadonlyArray<IApiControllerGetListQueryPlanOrderEntry>;
	unlistedFields?: EApiControllerGetListQueryUnlistedFields;
}
