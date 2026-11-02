import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType } from "../../../../src/index";

import { TestAuthGuard } from "../auth-guard";
import { E2eEntity } from "../entity";
import { E2eService } from "../service";
import { E2eCustomResponseItemDto } from "./dto";

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
	name: "E2eCustomItemResponseEntities",
	path: "custom-item-response-items",
	routes: {
		[EApiRouteType.GET_LIST]: {
			security: { authentication },
			dto: {
				response: {
					itemType: E2eCustomResponseItemDto,
				},
			},
			// The item type publishes none of the entity's query fields under their names, so the route filters by none of them.
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: { fields: {}, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
				},
			},
		},
	},
})
export class E2eCustomItemResponseController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
