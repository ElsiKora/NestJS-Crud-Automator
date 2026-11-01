import type { StiTemporalDebitEntryEntity } from "./debit.entity";

import { Inject } from "@nestjs/common";

import { ApiController, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRelationReferenceShape, EApiControllerRequestTarget, EApiRouteType, EFilterOperation, EFilterOrderDirection } from "../../../src/index";

import "./credit.entity";
import "./debit.entity";
import { StiTemporalEntryEntity } from "./root.entity";
import { StiTemporalEntryService } from "./service";

type TEntry = Partial<StiTemporalDebitEntryEntity> & StiTemporalEntryEntity;

type TEntryControllerOptions = {
	isIncluded: boolean;
	mode: EApiControllerGetListQueryPaginationMode;
	path: string;
};

/**
 * Creates GET and GET_LIST routes over a single-table inheritance root with a composite timestamptz primary key.
 * @param {TEntryControllerOptions} options - Route variant
 * @returns {new () => unknown} The controller class
 */
export const createEntryController = (options: TEntryControllerOptions): new () => unknown => {
	const isCursor: boolean = options.mode === EApiControllerGetListQueryPaginationMode.CURSOR;
	const relations = options.isIncluded ? { response: { load: { include: { account: true, counterparty: true, watchers: true } }, reference: { key: "id", shape: EApiControllerRelationReferenceShape.OBJECT } } } : undefined;

	@ApiController<TEntry>({
		entity: StiTemporalEntryEntity,
		name: `StiTemporal${options.path.replaceAll("-", "")}`,
		path: options.path,
		routes: {
			[EApiRouteType.CREATE]: { generation: { isEnabled: false } },
			[EApiRouteType.DELETE]: { generation: { isEnabled: false } },
			[EApiRouteType.GET]: { generation: { isEnabled: false } },
			[EApiRouteType.GET_LIST]: {
				...(relations ? { relations } : {}),
				request: {
					[EApiControllerRequestTarget.QUERY]: {
						filter: {
							fields: {
								"account.id": { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
								bookedAt: { allowedOperations: [EFilterOperation.GTE, EFilterOperation.LT], isEnabled: true },
								kind: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
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
	class StiTemporalEntryController {
		@Inject(StiTemporalEntryService)
		public readonly service!: StiTemporalEntryService;
	}

	return StiTemporalEntryController;
};
