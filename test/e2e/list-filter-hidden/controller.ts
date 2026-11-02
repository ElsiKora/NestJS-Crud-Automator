import { Inject } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";

import { ApiController, EApiAuthenticationType, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

import { E2eListHiddenUserGuard } from "./guard";
import { E2eListHiddenItemEntity } from "./entity";
import { E2eListHiddenItemService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;

export const LIST_HIDDEN_DISABLED_ROUTES = {
	[EApiRouteType.CREATE]: disabledRoute,
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;

export const LIST_HIDDEN_SECURITY = { authentication: { guard: E2eListHiddenUserGuard, type: EApiAuthenticationType.USER } } as const;

export class E2eListHiddenManualItemDto {
	@ApiProperty({ type: String })
	@Expose()
	public id!: string;

	@ApiProperty({ type: String })
	@Expose()
	public label!: string;
}

export class E2eListHiddenManualListDto {
	@ApiProperty({ type: () => [E2eListHiddenManualItemDto] })
	@Expose()
	@Type(() => E2eListHiddenManualItemDto)
	public items!: Array<E2eListHiddenManualItemDto>;
}

@ApiController<E2eListHiddenItemEntity>({
	entity: E2eListHiddenItemEntity,
	name: "E2eListHiddenItems",
	path: "list-hidden/items",
	routes: { ...LIST_HIDDEN_DISABLED_ROUTES, [EApiRouteType.GET_LIST]: { security: LIST_HIDDEN_SECURITY } },
})
export class E2eListHiddenItemController {
	@Inject(E2eListHiddenItemService)
	public readonly service!: E2eListHiddenItemService;
}

@ApiController<E2eListHiddenItemEntity>({
	entity: E2eListHiddenItemEntity,
	name: "E2eListHiddenTypedItems",
	path: "list-hidden/typed-items",
	routes: {
		...LIST_HIDDEN_DISABLED_ROUTES,
		[EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT }, order: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT } } }, security: LIST_HIDDEN_SECURITY },
	},
})
export class E2eListHiddenTypedItemController {
	@Inject(E2eListHiddenItemService)
	public readonly service!: E2eListHiddenItemService;
}

@ApiController<E2eListHiddenItemEntity>({
	entity: E2eListHiddenItemEntity,
	name: "E2eListHiddenCursorItems",
	path: "list-hidden/cursor-items",
	routes: {
		...LIST_HIDDEN_DISABLED_ROUTES,
		[EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT }, order: { fields: { rank: { isEnabled: true } }, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT }, pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR } } }, security: LIST_HIDDEN_SECURITY },
	},
})
export class E2eListHiddenCursorItemController {
	@Inject(E2eListHiddenItemService)
	public readonly service!: E2eListHiddenItemService;
}

// A manual list response that leaves out rank boots once its filter lists only what the response publishes.
@ApiController<E2eListHiddenItemEntity>({
	entity: E2eListHiddenItemEntity,
	name: "E2eListHiddenManualResponseItems",
	path: "list-hidden/manual-response-items",
	routes: {
		...LIST_HIDDEN_DISABLED_ROUTES,
		[EApiRouteType.GET_LIST]: {
			dto: { [EApiDtoType.RESPONSE]: E2eListHiddenManualListDto },
			request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { label: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } },
			security: LIST_HIDDEN_SECURITY,
		},
	},
})
export class E2eListHiddenManualResponseItemController {
	@Inject(E2eListHiddenItemService)
	public readonly service!: E2eListHiddenItemService;
}
