import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../../src/index";

import { E2eEntity } from "../entity";
import { E2eService } from "../service";

const disabledRoute = { generation: { isEnabled: false } } as const;

@ApiController<E2eEntity>({
	entity: E2eEntity,
	name: "E2eNestedOwnerReadEntities",
	path: "nested-owner/:ownerId/items",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: {
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		},
		[EApiRouteType.GET_LIST]: {
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [
							{ direction: EFilterOrderDirection.DESC, field: "count" },
							{ direction: EFilterOrderDirection.ASC, field: "name" },
							{ direction: EFilterOrderDirection.ASC, field: "id" },
						],
						fields: {
							count: { isEnabled: true },
							name: { isEnabled: true },
						},
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2eNestedOwnerReadController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
