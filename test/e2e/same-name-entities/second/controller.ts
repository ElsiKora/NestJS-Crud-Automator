import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, EApiRouteType } from "../../../../src/index";

import { SameNameItemEntity } from "./entity";
import { SameNameSecondItemService } from "./service";

@ApiControllerObservable()
@ApiController<SameNameItemEntity>({
	entity: SameNameItemEntity,
	name: "SameNameSecondItems",
	path: "same-name-second-items",
	routes: {
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class SameNameSecondItemController {
	@Inject(SameNameSecondItemService)
	public readonly service!: SameNameSecondItemService;
}
