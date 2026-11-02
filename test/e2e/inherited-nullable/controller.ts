import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

import { E2eInheritedNullableItemEntity } from "./item.entity";
import { E2eInheritedNullableItemService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;
const disabledRoutes = {
	[EApiRouteType.CREATE]: disabledRoute,
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;
const nullChecks = { allowedOperations: [EFilterOperation.ISNULL, EFilterOperation.NOTNULL], isEnabled: true } as const;
const filter = { fields: { archivedAt: nullChecks, deletedAt: nullChecks }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } as const;

@ApiController<E2eInheritedNullableItemEntity>({
	entity: E2eInheritedNullableItemEntity,
	name: "E2eInheritedNullableItems",
	path: "inherited-nullable/items",
	routes: { ...disabledRoutes, [EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter } } } },
})
export class E2eInheritedNullableItemController {
	@Inject(E2eInheritedNullableItemService)
	public readonly service!: E2eInheritedNullableItemService;
}

@ApiController<E2eInheritedNullableItemEntity>({
	entity: E2eInheritedNullableItemEntity,
	name: "E2eInheritedNullableCursorItems",
	path: "inherited-nullable/cursor-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter,
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "position" }],
						fields: { position: { isEnabled: true } },
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
	},
})
export class E2eInheritedNullableCursorItemController {
	@Inject(E2eInheritedNullableItemService)
	public readonly service!: E2eInheritedNullableItemService;
}
