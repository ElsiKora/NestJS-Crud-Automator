import { Inject } from "@nestjs/common";

import { ApiController, EApiRouteType } from "../../../src/index";

import { E2eFreeFormRecordEntity, E2eFreeFormUndeclaredRecordEntity } from "./entity";
import { E2eFreeFormRecordService, E2eFreeFormUndeclaredRecordService } from "./service";

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

@ApiController<E2eFreeFormUndeclaredRecordEntity>({
	entity: E2eFreeFormUndeclaredRecordEntity,
	name: "E2eFreeFormUndeclaredRecords",
	path: "free-form-object/undeclared-records",
	routes: {
		[EApiRouteType.CREATE]: {},
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: {},
		[EApiRouteType.GET_LIST]: {},
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class E2eFreeFormUndeclaredRecordController {
	@Inject(E2eFreeFormUndeclaredRecordService)
	public readonly service!: E2eFreeFormUndeclaredRecordService;
}
