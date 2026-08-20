import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

import { CursorPaginationEntity } from "./entity";
import { CursorPaginationService } from "./service";

@ApiController<CursorPaginationEntity>({
	entity: CursorPaginationEntity,
	name: "CursorPaginationItems",
	path: "cursor-items",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							group: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
							rank: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						defaultOrder: [
							{ direction: EFilterOrderDirection.ASC, field: "active" },
							{ direction: EFilterOrderDirection.ASC, field: "rank" },
						],
						fields: {
							generation: { isEnabled: true },
							generatedBigint: { isEnabled: true },
							generatedInteger: { isEnabled: true },
							rank: { isEnabled: true },
							smallRank: { isEnabled: true },
							state: { isEnabled: true },
						},
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
export class CursorPaginationController {
	@Inject(CursorPaginationService)
	public readonly service!: CursorPaginationService;
}
