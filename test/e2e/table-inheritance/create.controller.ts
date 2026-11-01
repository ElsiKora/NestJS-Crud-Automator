import { Inject } from "@nestjs/common";

import { ApiController, ApiControllerObservable, ApiControllerSecurable, EApiAuthenticationType, EApiAuthorizationMode, EApiRouteType } from "../../../src/index";

import { TestAuthGuard } from "../app/auth-guard";

import "./bank-transfer.entity";
import "./card-transfer.entity";
import "./form-post.entity";
import "./qr.entity";
import { PaymentDetailEntity } from "./root.entity";
import { PaymentDetailService } from "./service";

const disabledRoute = { generation: { isEnabled: false } } as const;

@ApiControllerObservable()
@ApiControllerSecurable()
@ApiController<PaymentDetailEntity>({
	authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
	entity: PaymentDetailEntity,
	name: "PaymentDetailsCreate",
	path: "payment-details-create",
	routes: {
		[EApiRouteType.CREATE]: { security: { authentication: { guard: TestAuthGuard, type: EApiAuthenticationType.USER } } },
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: disabledRoute,
		[EApiRouteType.GET_LIST]: disabledRoute,
		[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
		[EApiRouteType.UPDATE]: disabledRoute,
	},
})
export class PaymentDetailCreateController {
	@Inject(PaymentDetailService)
	public readonly service!: PaymentDetailService;
}
