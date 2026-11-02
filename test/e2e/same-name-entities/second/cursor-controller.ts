import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../../src/index";

import { SameNameSecondCursorItemDto } from "./cursor-item.dto";
import { SameNameItemEntity } from "./entity";
import { SameNameSecondItemService } from "./service";

@ApiController<SameNameItemEntity>({
	entity: SameNameItemEntity,
	name: "SameNameSecondItemCursors",
	path: "same-name-second-items-cursor",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: {
			dto: { response: { itemType: SameNameSecondCursorItemDto } },
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						fields: {},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class SameNameSecondItemCursorController {
	@Inject(SameNameSecondItemService)
	public readonly service!: SameNameSecondItemService;
}
