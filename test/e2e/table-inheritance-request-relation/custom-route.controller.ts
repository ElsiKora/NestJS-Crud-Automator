import { Body, Controller, HttpStatus, Inject, RequestMethod } from "@nestjs/common";

import { ApiRouteCustom, EApiAction, EApiControllerRelationReferenceShape } from "../../../src/index";

import { RequestRelationOwnerService } from "./owner.service";
import { RequestRelationDetailEntity } from "./root.entity";

import "./card.entity";

@Controller("sti-request-relation-custom")
export class RequestRelationCustomRouteController {
	@Inject(RequestRelationOwnerService)
	public readonly ownerService!: RequestRelationOwnerService;

	@ApiRouteCustom<RequestRelationDetailEntity>({
		relations: { request: { load: { include: { owner: { bogus: true } as never } }, reference: { shape: EApiControllerRelationReferenceShape.SCALAR } } },
		resource: { action: EApiAction.CREATE, entity: RequestRelationDetailEntity },
		response: { status: HttpStatus.NO_CONTENT, type: undefined },
		route: { method: RequestMethod.POST, path: "" },
	})
	public create(@Body() _body: Partial<RequestRelationDetailEntity>): void {}
}
