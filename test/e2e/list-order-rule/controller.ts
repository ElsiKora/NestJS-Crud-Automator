import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType } from "../../../src/index";

import { E2eListOrderRuleItemEntity } from "./item.entity";
import { E2eListOrderRuleItemService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;
const disabledRoutes = {
	[EApiRouteType.CREATE]: disabledRoute,
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;

@ApiController<E2eListOrderRuleItemEntity>({
	entity: E2eListOrderRuleItemEntity,
	name: "E2eListOrderRuleItems",
	path: "list-order-rule/items",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: {} },
})
export class E2eListOrderRuleItemController {
	@Inject(E2eListOrderRuleItemService)
	public readonly service!: E2eListOrderRuleItemService;
}

@ApiController<E2eListOrderRuleItemEntity>({
	entity: E2eListOrderRuleItemEntity,
	name: "E2eListOrderRuleTypedItems",
	path: "list-order-rule/typed-items",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT }, order: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT } } } } },
})
export class E2eListOrderRuleTypedItemController {
	@Inject(E2eListOrderRuleItemService)
	public readonly service!: E2eListOrderRuleItemService;
}
