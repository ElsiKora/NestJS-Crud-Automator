import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOrderDirection } from "../../../src/index";

import { PaymentDetailFormFieldEntity } from "./form-field.entity";
import { PaymentDetailFormFieldService } from "./form-field.service";

const disabledRoute = { generation: { isEnabled: false } } as const;

@ApiController<PaymentDetailFormFieldEntity>({
	entity: PaymentDetailFormFieldEntity,
	name: "PaymentDetailFormFields",
	path: "payment-details/:detailId/form-fields",
	pathScope: { parameters: [{ field: "detailId", parameter: "detailId" }] },
	routes: {
		[EApiRouteType.CREATE]: disabledRoute,
		[EApiRouteType.DELETE]: disabledRoute,
		[EApiRouteType.GET]: disabledRoute,
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "name" }],
						fields: {},
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
export class PaymentDetailFormFieldController {
	@Inject(PaymentDetailFormFieldService)
	public readonly service!: PaymentDetailFormFieldService;
}
