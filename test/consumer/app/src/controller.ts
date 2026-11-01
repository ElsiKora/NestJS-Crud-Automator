import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "@elsikora/nestjs-crud-automator";
import { Inject } from "@nestjs/common";

import { SmokeItemEntity } from "./entity.js";
import { SmokeAuthGuard } from "./guard.js";
import { SmokeItemService } from "./service.js";

const authentication: { guard: typeof SmokeAuthGuard; type: EApiAuthenticationType } = { guard: SmokeAuthGuard, type: EApiAuthenticationType.USER };
const disabled: { generation: { isEnabled: boolean } } = { generation: { isEnabled: false } };

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<SmokeItemEntity>({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
	entity: SmokeItemEntity,
	name: "SmokeItems",
	path: "items",
	routes: {
		[EApiRouteType.CREATE]: { security: { authentication } },
		[EApiRouteType.DELETE]: { security: { authentication } },
		[EApiRouteType.GET]: { security: { authentication } },
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: { name: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } },
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "count" }],
						fields: { count: { isEnabled: true } },
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
			security: { authentication },
		},
		[EApiRouteType.PARTIAL_UPDATE]: { security: { authentication } },
		[EApiRouteType.UPDATE]: disabled,
	},
})
export class SmokeItemController {
	@Inject(SmokeItemService)
	public readonly service!: SmokeItemService;
}

@ApiController<SmokeItemEntity>({
	entity: SmokeItemEntity,
	name: "SmokeCursorItems",
	path: "cursor-items",
	routes: {
		[EApiRouteType.CREATE]: disabled,
		[EApiRouteType.DELETE]: disabled,
		[EApiRouteType.GET]: disabled,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						fields: {},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabled,
		[EApiRouteType.UPDATE]: disabled,
	},
})
export class SmokeCursorController {
	@Inject(SmokeItemService)
	public readonly service!: SmokeItemService;
}

@ApiControllerSecurable()
@ApiController<SmokeItemEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.IAM,
		policyNamespace: "smoke:item",
		resourceDefinition: {
			entity: SmokeItemEntity,
			fields: [{ isFilterable: true, path: "resource.ownerId", queryPath: "ownerId" }],
			namespace: "smoke:item",
			resourcePath: "smoke:item/{id}",
			resourceType: "smoke:item",
		},
	},
	entity: SmokeItemEntity,
	name: "SmokeIamItems",
	path: "iam-items",
	routes: {
		[EApiRouteType.CREATE]: disabled,
		[EApiRouteType.DELETE]: disabled,
		[EApiRouteType.GET]: disabled,
		[EApiRouteType.GET_LIST]: { security: { authentication } },
		[EApiRouteType.PARTIAL_UPDATE]: disabled,
		[EApiRouteType.UPDATE]: disabled,
	},
})
export class SmokeIamController {
	@Inject(SmokeItemService)
	public readonly service!: SmokeItemService;
}
