import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation } from "../../../../src/index";

import { TestAuthGuard } from "../auth-guard";
import { E2eEntity } from "../entity";
import { E2eService } from "../service";

const authentication = {
	guard: TestAuthGuard,
	type: EApiAuthenticationType.USER,
};

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<E2eEntity>({
	authorization: {
		defaultMode: EApiAuthorizationMode.HOOKS,
	},
	entity: E2eEntity,
	name: "E2eTypedQueryEntities",
	path: "typed-items",
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
							code: {
								isEnabled: false,
							},
							count: {
								allowedOperations: [EFilterOperation.BETWEEN, EFilterOperation.EQ, EFilterOperation.GT],
								isEnabled: true,
							},
							name: {
								allowedOperations: [EFilterOperation.CONT, EFilterOperation.EQ, EFilterOperation.INL],
								isEnabled: true,
								missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.REJECT,
							},
							"owner.name": {
								allowedOperations: [EFilterOperation.EQ],
								isEnabled: true,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						fields: {
							code: {
								isEnabled: false,
							},
							count: {
								isEnabled: true,
							},
							name: {
								isEnabled: true,
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
export class E2eTypedQueryController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
