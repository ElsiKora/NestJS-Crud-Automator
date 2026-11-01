import { Inject } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

import { ApiController, ApiControllerObservable, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType } from "../../../src/index";

import { E2eLegacyQueryItemEntity } from "./entity";
import { E2eLegacyQueryItemService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;
const disabledRoutes = {
	[EApiRouteType.CREATE]: disabledRoute,
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;

export const E2E_LEGACY_QUERY_MANUAL_DEFAULT_LIMIT: number = 1;

export class E2eLegacyQueryManualDto {
	@IsInt()
	@IsOptional()
	@Max(50)
	@Min(1)
	@Type(() => Number)
	public limit: number = E2E_LEGACY_QUERY_MANUAL_DEFAULT_LIMIT;

	@IsIn(["label"])
	@IsOptional()
	public orderBy?: string;

	@IsIn(["asc", "desc"])
	@IsOptional()
	public orderDirection?: string;

	@IsInt()
	@Min(1)
	@Type(() => Number)
	public page!: number;
}

@ApiControllerObservable()
@ApiController<E2eLegacyQueryItemEntity>({
	entity: E2eLegacyQueryItemEntity,
	name: "E2eLegacyQueryItems",
	path: "legacy-query/items",
	routes: disabledRoutes,
})
export class E2eLegacyQueryItemController {
	@Inject(E2eLegacyQueryItemService)
	public readonly service!: E2eLegacyQueryItemService;
}

@ApiController<E2eLegacyQueryItemEntity>({
	entity: E2eLegacyQueryItemEntity,
	name: "E2eLegacyQueryManualItems",
	path: "legacy-query/manual-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: E2eLegacyQueryManualDto } },
	},
})
export class E2eLegacyQueryManualItemController {
	@Inject(E2eLegacyQueryItemService)
	public readonly service!: E2eLegacyQueryItemService;
}

@ApiController<E2eLegacyQueryItemEntity>({
	entity: E2eLegacyQueryItemEntity,
	name: "E2eLegacyQueryOrderOnlyItems",
	path: "legacy-query/order-only-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { order: { fields: { rank: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } },
	},
})
export class E2eLegacyQueryOrderOnlyItemController {
	@Inject(E2eLegacyQueryItemService)
	public readonly service!: E2eLegacyQueryItemService;
}
