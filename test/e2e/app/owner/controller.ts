import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable } from "../../../../dist/esm/index";
import { EApiAuthenticationType, EApiRouteType } from "../../../../dist/esm/index";

import { TestAuthGuard } from "../auth-guard";
import { E2eOwnerEntity } from "./entity";
import { E2eOwnerService } from "./service";

const authentication = {
	guard: TestAuthGuard,
	type: EApiAuthenticationType.USER,
};

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<E2eOwnerEntity>({
	entity: E2eOwnerEntity,
	name: "E2eOwners",
	path: "owners",
	routes: {
		[EApiRouteType.DELETE]: { authentication },
	},
})
export class E2eOwnerController {
	@Inject(E2eOwnerService)
	public readonly service!: E2eOwnerService;
}
