import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../../src/index";

import { SameNameFirstCursorItemDto } from "./cursor-item.dto";
import { SameNameItemEntity } from "./entity";
import { SameNameFirstItemService } from "./service";

@ApiController<SameNameItemEntity>({
	entity: SameNameItemEntity,
	name: "SameNameFirstItemCursors",
	path: "same-name-first-items-cursor",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: {
			dto: { response: { itemType: SameNameFirstCursorItemDto } },
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
export class SameNameFirstItemCursorController {
	@Inject(SameNameFirstItemService)
	public readonly service!: SameNameFirstItemService;
}
