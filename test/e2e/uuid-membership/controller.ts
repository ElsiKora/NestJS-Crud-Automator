import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation } from "../../../src/index";

import { E2eUuidTransactionEntity } from "./entity";
import { E2eUuidTransactionService } from "./service";

@ApiController<E2eUuidTransactionEntity>({
	entity: E2eUuidTransactionEntity,
	name: "E2eUuidMembershipTransactions",
	path: "uuid-membership-transactions",
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
							"currency.id": {
								allowedOperations: [EFilterOperation.IN, EFilterOperation.NOTIN],
								isEnabled: true,
							},
							id: {
								allowedOperations: [EFilterOperation.IN],
								isEnabled: true,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						fields: {
							label: {
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
export class E2eUuidMembershipController {
	@Inject(E2eUuidTransactionService)
	public readonly service!: E2eUuidTransactionService;
}
