import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerRelationReferenceShape, EApiRouteType } from "../../../src/index";

import { RequestRelationOwnerService } from "./owner.service";
import { RequestRelationDetailEntity } from "./root.entity";
import { RequestRelationDetailService } from "./service";

import "./card.entity";

const disabledRoute = { generation: { isEnabled: false } } as const;

@ApiController<RequestRelationDetailEntity>({
	entity: RequestRelationDetailEntity,
	name: "RequestRelationDetail",
	path: "sti-request-relation-details",
	routes: {
		[EApiRouteType.CREATE]: { relations: { request: { load: { include: { owner: true } }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } } } },
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: disabledRoute,
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class RequestRelationDetailController {
	@Inject(RequestRelationOwnerService)
	public readonly ownerService!: RequestRelationOwnerService;

	@Inject(RequestRelationDetailService)
	public readonly service!: RequestRelationDetailService;
}
