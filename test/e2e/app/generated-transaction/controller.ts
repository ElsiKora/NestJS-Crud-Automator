import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiRouteType } from "../../../../src/index";

import { TestAuthGuard } from "../auth-guard";
import { E2eEntity } from "../entity";
import { E2eGeneratedTransactionService } from "./service";

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
	name: "E2eGeneratedTransactionEntities",
	path: "generated-transaction-items",
	routes: {
		[EApiRouteType.CREATE]: {
			security: { authentication },
		},
		[EApiRouteType.DELETE]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.GET]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.GET_LIST]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.PARTIAL_UPDATE]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.UPDATE]: {
			generation: { isEnabled: false },
		},
	},
})
export class E2eGeneratedTransactionController {
	@Inject(E2eGeneratedTransactionService)
	public readonly service!: E2eGeneratedTransactionService;
}
