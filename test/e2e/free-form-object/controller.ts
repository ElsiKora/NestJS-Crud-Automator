import { Inject } from "@nestjs/common";

import { ApiController, EApiRouteType } from "../../../src/index";

import { E2eFreeFormRecordEntity } from "./entity";
import { E2eFreeFormRecordService } from "./service";

@ApiController<E2eFreeFormRecordEntity>({
	entity: E2eFreeFormRecordEntity,
	name: "E2eFreeFormRecords",
	path: "free-form-object/records",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: { generation: { isEnabled: false } },
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class E2eFreeFormRecordController {
	@Inject(E2eFreeFormRecordService)
	public readonly service!: E2eFreeFormRecordService;
}
