import { Inject } from "@nestjs/common";
import { Expose, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional } from "class-validator";

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

export class E2eListOrderRuleAllowHiddenQueryDto extends E2eListOrderRuleManualQueryDto {
	@IsIn(["secret"])
	@IsOptional()
	public override orderBy?: string = undefined;
}

export class E2eListOrderRuleDefaultOrderQueryDto extends E2eListOrderRuleManualQueryDto {
	@IsOptional()
	public override orderBy?: string = "secret";

	@IsOptional()
	public override orderDirection?: string = "asc";
}

export class E2eListOrderRuleAliasQueryDto {
	@IsInt()
	@Type(() => Number)
	public limit!: number;

	@Expose({ name: "sort" })
	@IsOptional()
	public orderBy?: string;

	@Expose({ name: "dir" })
	@IsOptional()
	public orderDirection?: string;

	@IsInt()
	@Type(() => Number)
	public page!: number;
}

export class E2eListOrderRuleAliasDefaultQueryDto {
	@IsInt()
	@Type(() => Number)
	public limit!: number;

	@Expose({ name: "sort" })
	@IsOptional()
	public orderBy?: string = "secret";

	@Expose({ name: "dir" })
	@IsOptional()
	public orderDirection?: string = "asc";

	@IsInt()
	@Type(() => Number)
	public page!: number;
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

@ApiController<E2eListOrderRuleItemEntity>({
	entity: E2eListOrderRuleItemEntity,
	name: "E2eListOrderRuleAllowHiddenItems",
	path: "list-order-rule/allow-hidden-items",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: E2eListOrderRuleAllowHiddenQueryDto } } },
})
export class E2eListOrderRuleAllowHiddenItemController {
	@Inject(E2eListOrderRuleItemService)
	public readonly service!: E2eListOrderRuleItemService;
}

@ApiController<E2eListOrderRuleItemEntity>({
	entity: E2eListOrderRuleItemEntity,
	name: "E2eListOrderRuleDefaultOrderItems",
	path: "list-order-rule/default-order-items",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: E2eListOrderRuleDefaultOrderQueryDto } } },
})
export class E2eListOrderRuleDefaultOrderItemController {
	@Inject(E2eListOrderRuleItemService)
	public readonly service!: E2eListOrderRuleItemService;
}

@ApiController<E2eListOrderRuleItemEntity>({
	entity: E2eListOrderRuleItemEntity,
	name: "E2eListOrderRuleAliasItems",
	path: "list-order-rule/alias-items",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: E2eListOrderRuleAliasQueryDto } } },
})
export class E2eListOrderRuleAliasItemController {
	@Inject(E2eListOrderRuleItemService)
	public readonly service!: E2eListOrderRuleItemService;
}

@ApiController<E2eListOrderRuleItemEntity>({
	entity: E2eListOrderRuleItemEntity,
	name: "E2eListOrderRuleAliasDefaultItems",
	path: "list-order-rule/alias-default-items",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: E2eListOrderRuleAliasDefaultQueryDto } } },
})
export class E2eListOrderRuleAliasDefaultItemController {
	@Inject(E2eListOrderRuleItemService)
	public readonly service!: E2eListOrderRuleItemService;
}
