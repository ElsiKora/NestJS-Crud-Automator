import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, EApiRouteType } from "../../../../src/index";

import { SameNameItemEntity } from "./entity";
import { SameNameFirstItemService } from "./service";

@ApiControllerObservable()
@ApiController<SameNameItemEntity>({
	entity: SameNameItemEntity,
	name: "SameNameFirstItems",
	path: "same-name-first-items",
	routes: {
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class SameNameFirstItemController {
	@Inject(SameNameFirstItemService)
	public readonly service!: SameNameFirstItemService;
}
