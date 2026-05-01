import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiRouteType } from "../../../../dist/esm/index";

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
			authentication,
			dto: {
				response: {
					itemType: E2eCustomResponseItemDto,
				},
			},
		},
	},
})
export class E2eCustomItemResponseController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
