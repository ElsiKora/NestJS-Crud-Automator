import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable } from "../../../../src/index";
import { EApiAuthenticationType, EApiAuthorizationMode, EApiControllerRequestTransformerType, EApiControllerResponseTarget, EApiRouteType } from "../../../../src/index";

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
	name: "TransformErrorEntities",
	path: "transform-error-items",
	routes: {
		[EApiRouteType.GET]: {
			security: { authentication },
			response: {
				[EApiControllerResponseTarget.RESPONSE]: {
					transformers: [
						{
							key: "missingField" as keyof E2eEntity,
							type: EApiControllerRequestTransformerType.STATIC,
							value: "boom",
						},
					],
				},
			},
		},
	},
})
export class E2eTransformerErrorController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
