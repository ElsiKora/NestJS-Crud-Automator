import type { FindOptionsRelations } from "typeorm";

import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerRelationReferenceShape, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

import { E2eTemporalEagerLedgerEntity } from "./eager-ledger.entity";
import { E2eTemporalLedgerEntity } from "./ledger.entity";
import { E2eTemporalEagerLedgerService, E2eTemporalLedgerService } from "./service";

type TLedgerControllerOptions = {
	include?: FindOptionsRelations<E2eTemporalLedgerEntity>;
	isEager: boolean;
	mode: EApiControllerGetListQueryPaginationMode;
	path: string;
	relationLoadStrategy?: "join" | "query";
};

/**
 * Creates a GET_LIST controller over a ledger with a composite timestamptz primary key.
 * @param {TLedgerControllerOptions} options - Route variant
 * @returns {new () => unknown} The controller class
 */
export const createLedgerController = (options: TLedgerControllerOptions): new () => unknown => {
	const isCursor: boolean = options.mode === EApiControllerGetListQueryPaginationMode.CURSOR;
	const entity: typeof E2eTemporalEagerLedgerEntity | typeof E2eTemporalLedgerEntity = options.isEager ? E2eTemporalEagerLedgerEntity : E2eTemporalLedgerEntity;
	const service: typeof E2eTemporalEagerLedgerService | typeof E2eTemporalLedgerService = options.isEager ? E2eTemporalEagerLedgerService : E2eTemporalLedgerService;

	@ApiController<E2eTemporalLedgerEntity>({
		entity,
		name: `E2eTemporal${options.path.replaceAll("-", "")}`,
		path: options.path,
		routes: {
			[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
			[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
			[EApiRouteType.GET]: { generation: { isEnabled: false } },
			[EApiRouteType.GET_LIST]: {
				...(options.include ? { relations: { response: { load: { include: options.include, ...(options.relationLoadStrategy ? { relationLoadStrategy: options.relationLoadStrategy } : {}) }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } } : {}),
				request: {
					[EApiControllerRequestTarget.QUERY]: {
						filter: {
							fields: {
								...(options.isEager ? {} : { "account.id": { allowedOperations: [EFilterOperation.EQ], isEnabled: true } }),
								bookedAt: { allowedOperations: [EFilterOperation.GTE, EFilterOperation.LT], isEnabled: true },
							},
							unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
						},
						order: isCursor
							? {
									fields: {},
									tieBreakers: [
										{ direction: EFilterOrderDirection.ASC, field: "postedAt" },
										{ direction: EFilterOrderDirection.ASC, field: "id" },
									],
									unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
								}
							: { fields: { sequence: { isEnabled: true } }, unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT },
						pagination: { mode: options.mode },
					},
				},
			},
			[EApiRouteType.PARTIAL_UPDATE]: { generation: { isEnabled: false } },
			[EApiRouteType.UPDATE]: { generation: { isEnabled: false } },
		},
	} as never)
	class E2eTemporalLedgerController {
		@Inject(service)
		public readonly service!: E2eTemporalEagerLedgerService | E2eTemporalLedgerService;
	}

	return E2eTemporalLedgerController;
};
