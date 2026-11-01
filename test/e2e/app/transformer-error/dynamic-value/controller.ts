import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable } from "../../../../../src/index";
import { EApiAuthenticationType, EApiAuthorizationMode, EApiControllerRequestTransformerType, EApiControllerResponseTarget, EApiRouteType } from "../../../../../src/index";

import { TestAuthGuard } from "../../auth-guard";
import { E2eEntity } from "../../entity";
import { E2eService } from "../../service";

const disabledRoute = { generation: { isEnabled: false } } as const;
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
	name: "DynamicValueErrorEntities",
	path: "dynamic-value-error-items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {
			security: { authentication },
			response: {
				[EApiControllerResponseTarget.RESPONSE]: {
					transformers: [
						{
							key: "name",
							type: EApiControllerRequestTransformerType.DYNAMIC,
							value: "UNKNOWN_DYNAMIC_VALUE" as never,
						},
					],
				},
			},
		},
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2eDynamicValueErrorController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
