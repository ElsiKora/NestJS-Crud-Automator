import type { PaymentDetailCardTransferEntity } from "./card-transfer.entity";

import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

import { TestAuthGuard } from "../app/auth-guard";

import "./bank-transfer.entity";
import "./card-transfer.entity";
import "./form-post.entity";
import "./qr.entity";
import { PaymentDetailEntity } from "./root.entity";
import { PaymentDetailService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;
const security = { authentication: { guard: TestAuthGuard, type: EApiAuthenticationType.USER } };
const issuerRelation = { response: { load: { include: { issuer: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } as const;

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<PaymentDetailEntity & Partial<PaymentDetailCardTransferEntity>>({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
	entity: PaymentDetailEntity,
	name: "PaymentDetails",
	path: "payment-details",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: { relations: issuerRelation, security },
		[EApiRouteType.GET_LIST]: {
			relations: issuerRelation,
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: { kind: { allowedOperations: [EFilterOperation.EQ], isEnabled: true } },
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
						fields: { rank: { isEnabled: true } },
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
			security,
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class PaymentDetailController {
	@Inject(PaymentDetailService)
	public readonly service!: PaymentDetailService;
}
