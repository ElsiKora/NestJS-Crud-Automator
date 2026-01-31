import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable } from "../../../../dist/esm/index";
import { EApiAuthenticationType, EApiControllerRequestTransformerType, EApiDtoType, EApiRouteType } from "../../../../dist/esm/index";

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
	entity: E2eEntity,
	name: "TransformErrorEntities",
	path: "transform-error-items",
	routes: {
		[EApiRouteType.GET]: {
			authentication,
			response: {
				transformers: {
					[EApiDtoType.RESPONSE]: [
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
