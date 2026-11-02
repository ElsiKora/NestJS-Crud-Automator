import { ApiController, ApiServiceBase, EApiRouteType } from "../../../../src/index";

import { SameNameAmbiguousHolderEntity } from "./holder";

class SameNameAmbiguousHolderControllerBase {
	public service: ApiServiceBase<SameNameAmbiguousHolderEntity> = new ApiServiceBase<SameNameAmbiguousHolderEntity>();
}

export const SameNameAmbiguousHolderController: typeof SameNameAmbiguousHolderControllerBase = ApiController<SameNameAmbiguousHolderEntity>({
	entity: SameNameAmbiguousHolderEntity,
	name: "SameNameAmbiguousHolders",
	path: "same-name-ambiguous-holders",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})(SameNameAmbiguousHolderControllerBase) as typeof SameNameAmbiguousHolderControllerBase;
