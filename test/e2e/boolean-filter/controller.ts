import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation } from "../../../src/index";

import { E2eBooleanFilterItemEntity } from "./entity";
import { E2eBooleanFilterItemService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;
const disabledRoutes = {
	[EApiRouteType.CREATE]: disabledRoute,
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;

@ApiController<E2eBooleanFilterItemEntity>({
	entity: E2eBooleanFilterItemEntity,
	name: "E2eBooleanFilterLegacyItems",
	path: "boolean-filter/legacy-items",
	routes: disabledRoutes,
})
export class E2eBooleanFilterLegacyItemController {
	@Inject(E2eBooleanFilterItemService)
	public readonly service!: E2eBooleanFilterItemService;
}

@ApiController<E2eBooleanFilterItemEntity>({
	entity: E2eBooleanFilterItemEntity,
	name: "E2eBooleanFilterTypedItems",
	path: "boolean-filter/typed-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: { isFeatured: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.NE, EFilterOperation.IN, EFilterOperation.NOTIN], isEnabled: true } },
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						fields: { label: { isEnabled: true } },
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		},
	},
})
export class E2eBooleanFilterTypedItemController {
	@Inject(E2eBooleanFilterItemService)
	public readonly service!: E2eBooleanFilterItemService;
}
