import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType } from "../../../../../src/index";

import { E2eEntity } from "../../entity";
import { E2eService } from "../../service";

@ApiController<E2eEntity>({
	entity: E2eEntity,
	name: "E2eOrderOnlyTypedQueryEntities",
	path: "order-only-typed-items",
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
					order: {
						fields: {
							count: {
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
export class E2eOrderOnlyTypedQueryController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
