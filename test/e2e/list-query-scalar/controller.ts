import { Inject } from "@nestjs/common";
import { Type } from "class-transformer";
import { IsInt, Min } from "class-validator";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

import { E2eListScalarKeyEntity } from "./entity";
import { E2eListScalarKeyService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;
const disabledRoutes = {
	[EApiRouteType.CREATE]: disabledRoute,
	[EApiRouteType.DELETE]: disabledRoute,
	[EApiRouteType.GET]: disabledRoute,
	[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
	[EApiRouteType.UPDATE]: disabledRoute,
} as const;

const filter = {
	fields: {
		"account.id": { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN], isEnabled: true },
		accountId: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN, EFilterOperation.NE], isEnabled: true },
		amount: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.GTE, EFilterOperation.IN, EFilterOperation.NE], isEnabled: true },
		id: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN, EFilterOperation.NE], isEnabled: true },
		level: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN, EFilterOperation.NE], isEnabled: true },
		price: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.GTE, EFilterOperation.IN], isEnabled: true },
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
} as const;

@ApiController<E2eListScalarKeyEntity>({
	entity: E2eListScalarKeyEntity,
	name: "E2eListScalarDefaultKeys",
	path: "list-scalar/default-keys",
	routes: { ...disabledRoutes },
})
export class E2eListScalarDefaultKeyController {
	@Inject(E2eListScalarKeyService)
	public readonly service!: E2eListScalarKeyService;
}

// Declares no filter property, so only the route's own value parser holds the filter values the request carries.
export class E2eListScalarManualQueryDto {
	@IsInt()
	@Min(1)
	@Type(() => Number)
	public limit!: number;

	@IsInt()
	@Min(1)
	@Type(() => Number)
	public page!: number;
}

@ApiController<E2eListScalarKeyEntity>({
	entity: E2eListScalarKeyEntity,
	name: "E2eListScalarManualKeys",
	path: "list-scalar/manual-keys",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: { dto: { [EApiDtoType.QUERY]: E2eListScalarManualQueryDto } },
	},
})
export class E2eListScalarManualKeyController {
	@Inject(E2eListScalarKeyService)
	public readonly service!: E2eListScalarKeyService;
}

@ApiController<E2eListScalarKeyEntity>({
	entity: E2eListScalarKeyEntity,
	name: "E2eListScalarPageKeys",
	path: "list-scalar/page-keys",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: { request: { [EApiControllerRequestTarget.QUERY]: { filter, order: { fields: { label: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT } } } },
	},
})
export class E2eListScalarPageKeyController {
	@Inject(E2eListScalarKeyService)
	public readonly service!: E2eListScalarKeyService;
}

@ApiController<E2eListScalarKeyEntity>({
	entity: E2eListScalarKeyEntity,
	name: "E2eListScalarCursorKeys",
	path: "list-scalar/cursor-keys",
	routes: {
		...disabledRoutes,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter,
					order: { fields: {}, tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }], unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
	},
})
export class E2eListScalarCursorKeyController {
	@Inject(E2eListScalarKeyService)
	public readonly service!: E2eListScalarKeyService;
}

@ApiController<E2eListScalarKeyEntity>({
	entity: E2eListScalarKeyEntity,
	name: "E2eListScalarCreateKeys",
	path: "list-scalar/create-keys",
	routes: {
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: disabledRoute,
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2eListScalarCreateKeyController {
	@Inject(E2eListScalarKeyService)
	public readonly service!: E2eListScalarKeyService;
}
