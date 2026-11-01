import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation } from "../../../../../src/index";

import { E2eEntity } from "../../entity";
import { E2eService } from "../../service";

@ApiController<E2eEntity>({
	entity: E2eEntity,
	name: "E2eNarrowTypedQueryEntities",
	path: "narrow-typed-items",
	routes: {
		[EApiRouteType.CREATE]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.DELETE]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.GET]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							name: {
								allowedOperations: [EFilterOperation.EQ],
								isEnabled: true,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						fields: {
							name: {
								isEnabled: true,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: {
			generation: { isEnabled: false },
		},
		[EApiRouteType.UPDATE]: {
			generation: { isEnabled: false },
		},
	},
})
export class E2eNarrowTypedQueryController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
