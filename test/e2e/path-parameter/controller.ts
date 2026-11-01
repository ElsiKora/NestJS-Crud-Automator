import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiDtoType, EApiRouteType } from "../../../src/index";

import { E2ePathParameterDayItemEntity, E2ePathParameterIntItemEntity, E2ePathParameterManualUuidParametersDto, E2ePathParameterUuidItemEntity } from "./entity";
import { E2ePathParameterDayItemService, E2ePathParameterIntItemService, E2ePathParameterUuidItemService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;

export const E2E_PATH_PARAMETER_TRANSFORMED_ID: string = "not-a-uuid";

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

@ApiControllerObservable()
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

@ApiController<E2ePathParameterDayItemEntity>({
	entity: E2ePathParameterDayItemEntity,
	name: "E2ePathParameterDayItems",
	path: "path-parameter/days/:day/day-items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {
			read: {
				scope: {
					parameters: [{ field: "day", parameter: "day" }],
				},
			},
		},
		[EApiRouteType.GET_LIST]: {
			read: {
				scope: {
					parameters: [{ field: "day", parameter: "day" }],
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2ePathParameterDayItemController {
	@Inject(E2ePathParameterDayItemService)
	public readonly service!: E2ePathParameterDayItemService;
}

@ApiController<E2ePathParameterUuidItemEntity>({
	entity: E2ePathParameterUuidItemEntity,
	name: "E2ePathParameterTransformedUuidItems",
	path: "path-parameter/transformed-uuid-items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {
			request: {
				[EApiControllerRequestTarget.PARAMETERS]: {
					transformers: [{ key: "id", shouldSetValueEvenIfMissing: true, type: EApiControllerRequestTransformerType.STATIC, value: E2E_PATH_PARAMETER_TRANSFORMED_ID }],
				},
			},
		},
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2ePathParameterTransformedUuidItemController {
	@Inject(E2ePathParameterUuidItemService)
	public readonly service!: E2ePathParameterUuidItemService;
}

@ApiController<E2ePathParameterUuidItemEntity>({
	entity: E2ePathParameterUuidItemEntity,
	name: "E2ePathParameterManualUuidItems",
	path: "path-parameter/manual-uuid-items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {
			dto: {
				[EApiDtoType.PARAMETERS]: E2ePathParameterManualUuidParametersDto,
			},
		},
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2ePathParameterManualUuidItemController {
	@Inject(E2ePathParameterUuidItemService)
	public readonly service!: E2ePathParameterUuidItemService;
}
