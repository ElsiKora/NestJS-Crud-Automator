import { Controller, HttpStatus, Inject, Query, RequestMethod } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { Expose, Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";

import { ApiController, ApiControllerObservable, ApiRouteCustom, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

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

export class E2eLegacyQuerySlimItemDto {
	@ApiProperty()
	@Expose()
	public id!: string;

	@ApiProperty()
	@Expose()
	public label!: string;

	@ApiProperty()
	@Expose()
	public status!: string;
}

export class E2eLegacyQuerySlimListDto {
	@ApiProperty()
	@Expose()
	public count!: number;

	@ApiProperty()
	@Expose()
	public currentPage!: number;

	@ApiProperty({ type: [E2eLegacyQuerySlimItemDto] })
	@Expose()
	@Type(() => E2eLegacyQuerySlimItemDto)
	public items!: Array<E2eLegacyQuerySlimItemDto>;

	@ApiProperty()
	@Expose()
	public totalCount!: number;

	@ApiProperty()
	@Expose()
	public totalPages!: number;
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

@ApiControllerObservable()
@ApiController<E2eLegacyQueryItemEntity>({
	entity: E2eLegacyQueryItemEntity,
	name: "E2eLegacyQueryTypedItems",
	path: "legacy-query/typed-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							createdAt: { allowedOperations: [EFilterOperation.GT], isEnabled: true },
							isFeatured: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
							label: { allowedOperations: [EFilterOperation.CONT, EFilterOperation.EQ, EFilterOperation.IN], isEnabled: true },
							note: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.ISNULL, EFilterOperation.NOTNULL], isEnabled: true },
							rank: { allowedOperations: [EFilterOperation.BETWEEN, EFilterOperation.EQ, EFilterOperation.GT, EFilterOperation.IN, EFilterOperation.NOTIN], isEnabled: true },
							// A date column is a string property, so the config type offers only string operations; the runtime compares it as a date.
							releasedOn: { allowedOperations: [EFilterOperation.BETWEEN, EFilterOperation.EQ, EFilterOperation.GTE, EFilterOperation.LT], isEnabled: true } as never,
							status: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN], isEnabled: true },
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						fields: { createdAt: { isEnabled: true }, label: { isEnabled: true }, note: { isEnabled: true }, rank: { isEnabled: true }, releasedOn: { isEnabled: true }, status: { isEnabled: true } },
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		},
	},
})
export class E2eLegacyQueryTypedItemController {
	@Inject(E2eLegacyQueryItemService)
	public readonly service!: E2eLegacyQueryItemService;
}

@ApiControllerObservable()
@ApiController<E2eLegacyQueryItemEntity>({
	entity: E2eLegacyQueryItemEntity,
	name: "E2eLegacyQueryCursorItems",
	path: "legacy-query/cursor-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: { fields: { rank: { isEnabled: true } }, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
	},
})
export class E2eLegacyQueryCursorItemController {
	@Inject(E2eLegacyQueryItemService)
	public readonly service!: E2eLegacyQueryItemService;
}

@ApiController<E2eLegacyQueryItemEntity>({
	entity: E2eLegacyQueryItemEntity,
	name: "E2eLegacyQuerySlimItems",
	path: "legacy-query/slim-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: E2eLegacyQuerySlimListDto } },
	},
})
export class E2eLegacyQuerySlimItemController {
	@Inject(E2eLegacyQueryItemService)
	public readonly service!: E2eLegacyQueryItemService;
}

@ApiController<E2eLegacyQueryItemEntity>({
	entity: E2eLegacyQueryItemEntity,
	name: "E2eLegacyQueryTypedSlimItems",
	path: "legacy-query/typed-slim-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: {
			dto: { [EApiDtoType.RESPONSE]: { itemType: E2eLegacyQuerySlimItemDto } },
			request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { rank: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } },
		},
	},
})
export class E2eLegacyQueryTypedSlimItemController {
	@Inject(E2eLegacyQueryItemService)
	public readonly service!: E2eLegacyQueryItemService;
}

@Controller("legacy-query/custom")
export class E2eLegacyQueryCustomSlimItemController {
	@ApiRouteCustom<E2eLegacyQueryItemEntity>({
		autoDto: { [EApiDtoType.QUERY]: {} },
		resource: { action: "legacyQuery.customSlimList", entity: E2eLegacyQueryItemEntity },
		response: { status: HttpStatus.OK, type: E2eLegacyQuerySlimListDto },
		route: { method: RequestMethod.GET, path: "slim-items", type: EApiRouteType.GET_LIST },
	})
	public list(@Query() query: Record<string, unknown>): E2eLegacyQuerySlimListDto {
		return { count: 0, currentPage: Number(query.page), items: [], totalCount: 0, totalPages: 0 };
	}
}

export class E2eLegacyQuerySummaryItemDto {
	@ApiProperty()
	@Expose()
	public summary!: string;
}

@ApiController<E2eLegacyQueryItemEntity>({
	entity: E2eLegacyQueryItemEntity,
	name: "E2eLegacyQuerySummaryItems",
	path: "legacy-query/summary-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.RESPONSE]: { itemType: E2eLegacyQuerySummaryItemDto } } },
	},
})
export class E2eLegacyQuerySummaryItemController {
	@Inject(E2eLegacyQueryItemService)
	public readonly service!: E2eLegacyQueryItemService;
}

@ApiController<E2eLegacyQueryItemEntity>({
	entity: E2eLegacyQueryItemEntity,
	name: "E2eLegacyQueryTypedSummaryItems",
	path: "legacy-query/typed-summary-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: {
			dto: { [EApiDtoType.RESPONSE]: { itemType: E2eLegacyQuerySummaryItemDto } },
			request: { [EApiControllerRequestTarget.QUERY]: { filter: { fields: { rank: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } },
		},
	},
})
export class E2eLegacyQueryTypedSummaryItemController {
	@Inject(E2eLegacyQueryItemService)
	public readonly service!: E2eLegacyQueryItemService;
}
