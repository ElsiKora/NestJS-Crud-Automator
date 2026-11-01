import { Inject } from "@nestjs/common";

import { ApiController, EApiRouteType } from "../../../../src/index";

import { E2eDtoNameItemEntity } from "../entity";
import { E2eDtoNameItemService } from "../service";

@ApiController<E2eDtoNameItemEntity>({
	entity: E2eDtoNameItemEntity,
	path: "public/users",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class UserController {
	@Inject(E2eDtoNameItemService)
	public readonly service!: E2eDtoNameItemService;
}
