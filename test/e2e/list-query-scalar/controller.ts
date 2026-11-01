import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

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
