import { ApiController, ApiServiceBase, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType, EFilterOperation } from "../../../../src/index";

import { SameNameImportOrderHolderEntity } from "./holder";

import "./plugin-owner";

const disabledRoutes = {
	[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
	[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
	[EApiRouteType.GET]: { generation: { isEnabled: false } },
	[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
	[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
} as const;

class SameNameImportOrderQueryDto {
	public limit?: number;

	public page?: number;
}

class SameNameImportOrderControllerBase {
	public service: ApiServiceBase<SameNameImportOrderHolderEntity> = new ApiServiceBase<SameNameImportOrderHolderEntity>();
}

class SameNameImportOrderGeneratedBase extends SameNameImportOrderControllerBase {}

class SameNameImportOrderManualBase extends SameNameImportOrderControllerBase {}

class SameNameImportOrderTypedBase extends SameNameImportOrderControllerBase {}

export const SameNameImportOrderGeneratedController: typeof SameNameImportOrderControllerBase = ApiController<SameNameImportOrderHolderEntity>({
	entity: SameNameImportOrderHolderEntity,
	name: "SameNameImportOrderGenerated",
	path: "same-name-import-order-generated",
	routes: disabledRoutes,
})(SameNameImportOrderGeneratedBase);

export const SameNameImportOrderManualController: typeof SameNameImportOrderControllerBase = ApiController<SameNameImportOrderHolderEntity>({
	entity: SameNameImportOrderHolderEntity,
	name: "SameNameImportOrderManual",
	path: "same-name-import-order-manual",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: SameNameImportOrderQueryDto } } },
})(SameNameImportOrderManualBase);

export const SameNameImportOrderTypedController: typeof SameNameImportOrderControllerBase = ApiController<SameNameImportOrderHolderEntity>({
	entity: SameNameImportOrderHolderEntity,
	name: "SameNameImportOrderTyped",
	path: "same-name-import-order-typed",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { "owner.pluginOnly": { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } },
	},
})(SameNameImportOrderTypedBase);
