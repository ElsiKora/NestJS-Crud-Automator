import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../src/index";

import { TestAuthGuard } from "../app/auth-guard";

import "./bank-transfer.entity";
import "./card-transfer.entity";
import "./form-post.entity";
import "./qr.entity";
import { PaymentDetailEntity } from "./root.entity";
import { PaymentDetailService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;
const security = { authentication: { guard: TestAuthGuard, type: EApiAuthenticationType.USER } };

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<PaymentDetailEntity>({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
	entity: PaymentDetailEntity,
	name: "PaymentDetailsCursor",
	path: "payment-details-cursor",
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: disabledRoute,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "rank" }],
						fields: { rank: { isEnabled: true } },
						tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
			security,
		},
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class PaymentDetailCursorController {
	@Inject(PaymentDetailService)
	public readonly service!: PaymentDetailService;
}
