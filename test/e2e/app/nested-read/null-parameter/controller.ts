import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiRouteType } from "../../../../../src/index";

import { E2eEntity } from "../../entity";
import { E2eService } from "../../service";

const disabledRoute = { generation: { isEnabled: false } } as const;

@ApiController<E2eEntity>({
	entity: E2eEntity,
	name: "E2eNullParameterReadEntities",
	path: "null-parameter-owner/:ownerId/items",
	pathScope: { parameters: [{ field: "ownerId", parameter: "ownerId" }] },
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: disabledRoute,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.PARAMETERS]: {
					transformers: [
						{
							key: "ownerId" as never,
							shouldSetValueEvenIfMissing: true,
							type: EApiControllerRequestTransformerType.STATIC,
							value: null as never,
						},
					],
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class E2eNullParameterReadController {
	@Inject(E2eService)
	public readonly service!: E2eService;
}
