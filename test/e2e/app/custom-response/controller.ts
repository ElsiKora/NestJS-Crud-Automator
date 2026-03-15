import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiRouteType } from "../../../../dist/esm/index";

import { TestAuthGuard } from "../auth-guard";
import { E2eEntity } from "../entity";
import { E2eService } from "../service";
import { E2eCustomResponseItemDto, E2eCustomResponseListDto } from "./dto";

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
	name: "E2eCustomResponseEntities",
	path: "custom-response-items",
	routes: {
		[EApiRouteType.CREATE]: {
			authentication,
			dto: {
				response: E2eCustomResponseItemDto,
			},
		},
		[EApiRouteType.GET]: {
			authentication,
			dto: {
				response: E2eCustomResponseItemDto,
			},
		},
		[EApiRouteType.GET_LIST]: {
			authentication,
			dto: {
				response: E2eCustomResponseListDto,
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: {
			authentication,
			dto: {
				response: E2eCustomResponseItemDto,
			},
		},
	},
})
export class E2eCustomResponseController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
