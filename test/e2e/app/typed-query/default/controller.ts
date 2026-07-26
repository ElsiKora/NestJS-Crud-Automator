import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation } from "../../../../../src/index";

import { TestAuthGuard } from "../../auth-guard";
import { E2eEntity } from "../../entity";
import { E2eService } from "../../service";

const authentication = {
	guard: TestAuthGuard,
	type: EApiAuthenticationType.USER,
};

@ApiControllerSecurable()
@ApiController<E2eEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.HOOKS,
	},
	entity: E2eEntity,
	name: "E2eDefaultTypedQueryEntities",
	path: "default-typed-items",
	routes: {
		[EApiRouteType.CREATE]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.DELETE]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.GET]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							count: {
								allowedOperations: [EFilterOperation.EQ],
								defaultCondition: {
									operator: EFilterOperation.EQ,
									value: 7,
								},
								isEnabled: true,
								missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
			security: { authentication },
		},
		[EApiRouteType.PARTIAL_UPDATE]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.UPDATE]: {
			generation: { isEnabled: false },
		},
	},
})
export class E2eDefaultTypedQueryController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
