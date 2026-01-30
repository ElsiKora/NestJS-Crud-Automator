import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable } from "../../../../dist/esm/index";
import { EApiAuthenticationType, EApiControllerLoadRelationsStrategy, EApiRouteType } from "../../../../dist/esm/index";

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
	entity: E2eEntity,
	name: "ManualE2eEntities",
	path: "manual-items",
	routes: {
		[EApiRouteType.CREATE]: {
			authentication,
			request: {
				relations: {
					relationsLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
					relationsToLoad: ["owner"],
					relationsServices: {
						owner: "ownerService",
					},
					servicesLoadStrategy: EApiControllerLoadRelationsStrategy.MANUAL,
					shouldLoadRelations: true,
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
