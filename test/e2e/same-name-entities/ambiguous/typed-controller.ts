import { ApiController, ApiServiceBase, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation } from "../../../../src/index";

import { SameNameAmbiguousHolderEntity } from "./holder";

import "./owner";
import "./owner-duplicate";

class SameNameAmbiguousTypedControllerBase {
	public service: ApiServiceBase<SameNameAmbiguousHolderEntity> = new ApiServiceBase<SameNameAmbiguousHolderEntity>();
}

export const SameNameAmbiguousTypedController: typeof SameNameAmbiguousTypedControllerBase = ApiController<SameNameAmbiguousHolderEntity>({
	entity: SameNameAmbiguousHolderEntity,
	name: "SameNameAmbiguousTypedHolders",
	path: "same-name-ambiguous-typed-holders",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { "owner.label": { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})(SameNameAmbiguousTypedControllerBase);
