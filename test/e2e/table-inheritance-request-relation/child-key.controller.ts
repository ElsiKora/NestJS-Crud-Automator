import type { RequestRelationCardEntity } from "./card.entity";

import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerRelationReferenceShape, EApiRouteType } from "../../../src/index";

import { RequestRelationIssuerService } from "./issuer.service";
import { RequestRelationDetailEntity } from "./root.entity";
import { RequestRelationDetailService } from "./service";

import "./card.entity";

const disabledRoute = { generation: { isEnabled: false } } as const;

@ApiController<RequestRelationDetailEntity & Partial<RequestRelationCardEntity>>({
	entity: RequestRelationDetailEntity,
	name: "RequestRelationChildKey",
	path: "sti-request-relation-child-key",
	routes: {
		[EApiRouteType.CREATE]: { relations: { request: { load: { include: { issuer: true } }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } } } },
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: disabledRoute,
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class RequestRelationChildKeyController {
	@Inject(RequestRelationIssuerService)
	public readonly issuerService!: RequestRelationIssuerService;

	@Inject(RequestRelationDetailService)
	public readonly service!: RequestRelationDetailService;
}
