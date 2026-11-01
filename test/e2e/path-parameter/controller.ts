import { Inject } from "@nestjs/common";

import { ApiController, EApiRouteType } from "../../../src/index";

import { E2ePathParameterIntItemEntity, E2ePathParameterUuidItemEntity } from "./entity";
import { E2ePathParameterIntItemService, E2ePathParameterUuidItemService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;

@ApiController<E2ePathParameterUuidItemEntity>({
	entity: E2ePathParameterUuidItemEntity,
	name: "E2ePathParameterUuidItems",
	path: "path-parameter/uuid-items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.GET_LIST]: disabledRoute,
	},
})
export class E2ePathParameterUuidItemController {
	@Inject(E2ePathParameterUuidItemService)
	public readonly service!: E2ePathParameterUuidItemService;
}

@ApiController<E2ePathParameterIntItemEntity>({
	entity: E2ePathParameterIntItemEntity,
	name: "E2ePathParameterIntItems",
	path: "path-parameter/int-items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.GET_LIST]: disabledRoute,
	},
})
export class E2ePathParameterIntItemController {
	@Inject(E2ePathParameterIntItemService)
	public readonly service!: E2ePathParameterIntItemService;
}

@ApiController<E2ePathParameterUuidItemEntity>({
	entity: E2ePathParameterUuidItemEntity,
	name: "E2ePathParameterOwnerUuidItems",
	path: "path-parameter/owners/:ownerId/uuid-items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		},
		[EApiRouteType.GET_LIST]: {
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2ePathParameterOwnerUuidItemController {
	@Inject(E2ePathParameterUuidItemService)
	public readonly service!: E2ePathParameterUuidItemService;
}

@ApiController<E2ePathParameterIntItemEntity>({
	entity: E2ePathParameterIntItemEntity,
	name: "E2ePathParameterGroupIntItems",
	path: "path-parameter/groups/:group/int-items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {
			read: {
				scope: {
					parameters: [{ field: "groupNumber", parameter: "group" }],
				},
			},
		},
		[EApiRouteType.GET_LIST]: {
			read: {
				scope: {
					parameters: [{ field: "groupNumber", parameter: "group" }],
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2ePathParameterGroupIntItemController {
	@Inject(E2ePathParameterIntItemService)
	public readonly service!: E2ePathParameterIntItemService;
}
