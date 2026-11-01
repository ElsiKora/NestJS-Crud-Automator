import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

import { E2eCursorTransactionEntity } from "./entity";
import { E2eCursorTransactionService } from "./service";

@ApiController<E2eCursorTransactionEntity>({
	entity: E2eCursorTransactionEntity,
	name: "E2eCursorTransactions",
	path: "cursor-transactions",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							walletId: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN], isEnabled: true },
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						fields: {},
						tieBreakers: [
							{ direction: EFilterOrderDirection.DESC, field: "createdAt" },
							{ direction: EFilterOrderDirection.ASC, field: "id" },
						],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class E2eCursorTransactionController {
	@Inject(E2eCursorTransactionService)
	public readonly service!: E2eCursorTransactionService;
}

@ApiController<E2eCursorTransactionEntity>({
	entity: E2eCursorTransactionEntity,
	name: "E2eCursorSettlements",
	path: "cursor-settlements",
	routes: {
		[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
		[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
		[EApiRouteType.GET]: { generation: { isEnabled: false } },
		[EApiRouteType.GET_LIST]: {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "settledAt" }],
						fields: { settledAt: { isEnabled: true } },
						tieBreakers: [
							{ direction: EFilterOrderDirection.ASC, field: "id" },
							{ direction: EFilterOrderDirection.DESC, field: "createdAt" },
						],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
				},
			},
		},
		[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
		[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
	},
})
export class E2eCursorSettlementController {
	@Inject(E2eCursorTransactionService)
	public readonly service!: E2eCursorTransactionService;
}
