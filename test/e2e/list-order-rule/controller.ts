import { Inject } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, IsOptional } from "class-validator";

import { ApiController, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType } from "../../../src/index";

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

export class E2eListOrderRuleManualQueryDto {
	@IsInt()
	@Type(() => Number)
	public limit!: number;

	@IsOptional()
	public orderBy?: string;

	@IsOptional()
	public orderDirection?: string;

	@IsInt()
	@Type(() => Number)
	public page!: number;
}

export class E2eListOrderRuleDefaultDirectionQueryDto extends E2eListOrderRuleManualQueryDto {
	@IsOptional()
	public override orderDirection?: string = "desc";
}

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

@ApiController<E2eListOrderRuleItemEntity>({
	entity: E2eListOrderRuleItemEntity,
	name: "E2eListOrderRuleManualItems",
	path: "list-order-rule/manual-items",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: E2eListOrderRuleManualQueryDto } } },
})
export class E2eListOrderRuleManualItemController {
	@Inject(E2eListOrderRuleItemService)
	public readonly service!: E2eListOrderRuleItemService;
}

@ApiController<E2eListOrderRuleItemEntity>({
	entity: E2eListOrderRuleItemEntity,
	name: "E2eListOrderRuleDefaultDirectionItems",
	path: "list-order-rule/default-direction-items",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: E2eListOrderRuleDefaultDirectionQueryDto } } },
})
export class E2eListOrderRuleDefaultDirectionItemController {
	@Inject(E2eListOrderRuleItemService)
	public readonly service!: E2eListOrderRuleItemService;
}
