import { Inject } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

import { E2eUnknownFilterItemEntity } from "./entity";
import { E2eUnknownFilterItemService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;
const disabledRoutes = {
	[EApiRouteType.CREATE]: disabledRoute,
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;

export class E2eUnknownFilterManualDto {
	@IsIn(["cont", "eq", "isnull"])
	@IsOptional()
	public "label[operator]"?: string;

	@IsOptional()
	@IsString()
	public "label[value]"?: string;

	@IsOptional()
	@IsString({ each: true })
	public "label[values]"?: Array<string>;

	@IsInt()
	@Max(50)
	@Min(1)
	@Type(() => Number)
	public limit!: number;

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

@ApiController<E2eUnknownFilterItemEntity>({
	entity: E2eUnknownFilterItemEntity,
	name: "E2eUnknownFilterItems",
	path: "unknown-filter/items",
	routes: disabledRoutes,
})
export class E2eUnknownFilterItemController {
	@Inject(E2eUnknownFilterItemService)
	public readonly service!: E2eUnknownFilterItemService;
}

@ApiController<E2eUnknownFilterItemEntity>({
	entity: E2eUnknownFilterItemEntity,
	name: "E2eUnknownFilterManualItems",
	path: "unknown-filter/manual-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: E2eUnknownFilterManualDto } },
	},
})
export class E2eUnknownFilterManualItemController {
	@Inject(E2eUnknownFilterItemService)
	public readonly service!: E2eUnknownFilterItemService;
}

@ApiController<E2eUnknownFilterItemEntity>({
	entity: E2eUnknownFilterItemEntity,
	name: "E2eUnknownFilterTypedItems",
	path: "unknown-filter/typed-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: { rank: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.GT], isEnabled: true } },
						unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT,
					},
				},
			},
		},
	},
})
export class E2eUnknownFilterTypedItemController {
	@Inject(E2eUnknownFilterItemService)
	public readonly service!: E2eUnknownFilterItemService;
}

@ApiController<E2eUnknownFilterItemEntity>({
	entity: E2eUnknownFilterItemEntity,
	name: "E2eUnknownFilterCursorItems",
	path: "unknown-filter/cursor-items",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							code: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
							"owner.name": { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
							rank: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.GT], isEnabled: true },
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
						fields: { rank: { isEnabled: true } },
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
	},
})
export class E2eUnknownFilterCursorItemController {
	@Inject(E2eUnknownFilterItemService)
	public readonly service!: E2eUnknownFilterItemService;
}
