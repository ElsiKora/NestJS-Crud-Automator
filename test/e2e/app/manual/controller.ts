import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable } from "../../../../src/index";
import { EApiAuthenticationType, EApiAuthorizationMode, EApiControllerRelationReferenceShape, EApiRouteType } from "../../../../src/index";

import { TestAuthGuard } from "../auth-guard";
import { E2eEntity } from "../entity";
import { E2eOwnerService } from "../owner";
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
	name: "ManualE2eEntities",
	path: "manual-items",
	routes: {
		[EApiRouteType.CREATE]: {
			security: { authentication },
			relations: {
				request: {
					load: {
						include: { owner: true },
						services: {
							owner: "ownerService",
						},
					},
					reference: {
						shape: EApiControllerRelationReferenceShape.SCALAR,
					},
				},
			},
		},
	},
})
export class E2eManualController {
	@Inject(E2eService)
	public readonly service!: E2eService;

	@Inject(E2eOwnerService)
	public readonly ownerService!: E2eOwnerService;
}
