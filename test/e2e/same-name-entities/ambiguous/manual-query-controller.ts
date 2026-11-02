import { ApiController, ApiServiceBase, EApiDtoType, EApiRouteType } from "../../../../src/index";

import { SameNameAmbiguousHolderEntity } from "./holder";

import "./owner";
import "./owner-duplicate";

class SameNameAmbiguousManualQueryDto {
	public limit?: number;

	public page?: number;
}

class SameNameAmbiguousManualQueryControllerBase {
	public service: ApiServiceBase<SameNameAmbiguousHolderEntity> = new ApiServiceBase<SameNameAmbiguousHolderEntity>();
}

// The manual QUERY DTO skips generated query DTOs and plans, leaving the ambiguous relation target to the request filter.
export const SameNameAmbiguousManualQueryController: typeof SameNameAmbiguousManualQueryControllerBase = ApiController<SameNameAmbiguousHolderEntity>({
	entity: SameNameAmbiguousHolderEntity,
	name: "SameNameAmbiguousManualQueryHolders",
	path: "same-name-ambiguous-manual-query-holders",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: SameNameAmbiguousManualQueryDto } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})(SameNameAmbiguousManualQueryControllerBase) as typeof SameNameAmbiguousManualQueryControllerBase;
