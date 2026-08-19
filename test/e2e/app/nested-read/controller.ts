import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../../src/index";

import { TestAuthGuard } from "../auth-guard";
import { E2eEntity } from "../entity";
import { E2eService } from "../service";

const disabledRoute = { generation: { isEnabled: false } } as const;
const authentication = {
	guard: TestAuthGuard,
	type: EApiAuthenticationType.USER,
};

@ApiController<E2eEntity>({
	entity: E2eEntity,
	name: "E2eNestedOwnerReadEntities",
	path: "nested-owner/:ownerId/items",
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
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [
							{ direction: EFilterOrderDirection.DESC, field: "count" },
							{ direction: EFilterOrderDirection.ASC, field: "name" },
							{ direction: EFilterOrderDirection.ASC, field: "id" },
						],
						fields: {
							count: { isEnabled: true },
							name: { isEnabled: true },
						},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2eNestedOwnerReadController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}

@ApiController<E2eEntity>({
	entity: E2eEntity,
	name: "E2eIdentityAliasReadEntities",
	path: "identity-alias/items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {
			identity: { parameter: "gameId" },
		},
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2eIdentityAliasReadController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<E2eEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.HOOKS,
	},
	entity: E2eEntity,
	name: "E2eSecurableIdentityAliasReadEntities",
	path: "secure-identity-alias/:ownerId/items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {
			identity: { parameter: "gameId" },
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
			security: { authentication },
		},
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2eSecurableIdentityAliasReadController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
