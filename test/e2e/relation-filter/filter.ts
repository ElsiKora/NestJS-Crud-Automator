import type { IApiControllerPropertiesRouteGetListQueryFilter } from "../../../src/index";
import type { RelationFilterColumnGameEntity, RelationFilterGameEntity, RelationFilterInverseGameEntity, RelationFilterOfferEntity, RelationFilterTaggedGameEntity } from "./entity";

import { ApiControllerGetListQueryLink, EApiControllerGetListQueryFilterMissingBehavior, EApiControllerGetListQueryUnlistedFields, EFilterOperation } from "../../../src/index";

import { ERelationFilterState, RelationFilterCategoryGameEntity, RelationFilterColumnLinkEntity, RelationFilterFeaturedCategoryEntity, RelationFilterGameSourceLinkEntity } from "./entity";

export const RELATION_FILTER_DEFAULT_CATEGORY_ID: string = "b0000000-0000-4000-8000-000000000002";

export const RELATION_FILTER_MAX_VALUES: number = 3;

export const RELATION_FILTER_SOME_LINK_ID: string = "e0000000-0000-4000-8000-000000000001";

export const RELATION_FILTER_SOME_SOURCE_ID: string = "d0000000-0000-4000-8000-000000000001";

// Core's two filters, as Core would declare them.
export const RELATION_FILTER_GAME_FILTER: IApiControllerPropertiesRouteGetListQueryFilter<RelationFilterGameEntity> = {
	fields: {
		"gameSource.provider.id": {
			allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
			isEnabled: true,
			maxValues: RELATION_FILTER_MAX_VALUES,
			relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: ERelationFilterState.ACTIVE }],
		},
	},
	links: {
		category: ApiControllerGetListQueryLink(RelationFilterCategoryGameEntity, {
			fields: {
				id: {
					allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
					isEnabled: true,
					maxValues: RELATION_FILTER_MAX_VALUES,
					relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: ERelationFilterState.ACTIVE }],
				},
			},
			source: "game",
			target: "category",
		}),
		featuredCategory: ApiControllerGetListQueryLink(RelationFilterFeaturedCategoryEntity, {
			fields: {
				id: {
					allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
					isEnabled: true,
					maxValues: RELATION_FILTER_MAX_VALUES,
					relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: ERelationFilterState.ACTIVE }],
				},
			},
			source: "game",
			target: "category",
		}),
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
};

export const RELATION_FILTER_INVERSE_FILTER: IApiControllerPropertiesRouteGetListQueryFilter<RelationFilterInverseGameEntity> = {
	fields: {
		"categoryLinks.category.id": {
			allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
			isEnabled: true,
			maxValues: RELATION_FILTER_MAX_VALUES,
			relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: ERelationFilterState.ACTIVE }],
		},
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
};

export const RELATION_FILTER_TAGGED_FILTER: IApiControllerPropertiesRouteGetListQueryFilter<RelationFilterTaggedGameEntity> = {
	fields: {
		"categories.id": {
			allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
			isEnabled: true,
			maxValues: RELATION_FILTER_MAX_VALUES,
			relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: ERelationFilterState.ACTIVE }],
		},
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
};

export const RELATION_FILTER_COLUMN_FILTER: IApiControllerPropertiesRouteGetListQueryFilter<RelationFilterColumnGameEntity> = {
	fields: {
		categoryId: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
		id: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN], isEnabled: true },
	},
	links: {
		category: ApiControllerGetListQueryLink(RelationFilterColumnLinkEntity, {
			fields: {
				id: {
					allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
					isEnabled: true,
					maxValues: RELATION_FILTER_MAX_VALUES,
					relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: ERelationFilterState.ACTIVE }],
				},
			},
			source: "game",
			target: "category",
		}),
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
};

// Every positive operator a leaf type allows.
export const RELATION_FILTER_OPERATOR_FILTER: IApiControllerPropertiesRouteGetListQueryFilter<RelationFilterGameEntity> = {
	fields: {
		"gameSource.provider.code": {
			allowedOperations: [EFilterOperation.CONT, EFilterOperation.CONTL, EFilterOperation.ENDS, EFilterOperation.ENDSL, EFilterOperation.EQ, EFilterOperation.EQL, EFilterOperation.IN, EFilterOperation.INL, EFilterOperation.STARTS, EFilterOperation.STARTSL],
			isEnabled: true,
			maxValues: RELATION_FILTER_MAX_VALUES,
		},
		"gameSource.provider.foundedAt": { allowedOperations: [EFilterOperation.BETWEEN, EFilterOperation.GT, EFilterOperation.GTE, EFilterOperation.LT, EFilterOperation.LTE], isEnabled: true },
		"gameSource.provider.score": {
			allowedOperations: [EFilterOperation.BETWEEN, EFilterOperation.EQ, EFilterOperation.GT, EFilterOperation.GTE, EFilterOperation.IN, EFilterOperation.LT, EFilterOperation.LTE],
			isEnabled: true,
			maxValues: RELATION_FILTER_MAX_VALUES,
		},
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
};

// Fixed conditions on the entities along a path, not only the last.
export const RELATION_FILTER_CONDITION_FILTER: IApiControllerPropertiesRouteGetListQueryFilter<RelationFilterGameEntity> = {
	fields: {
		"gameSource.provider.id": {
			allowedOperations: [EFilterOperation.EQ],
			isEnabled: true,
			relationConditions: [{ field: "id", operator: EFilterOperation.EQ, relation: "gameSource", value: RELATION_FILTER_SOME_SOURCE_ID }],
		},
	},
	links: {
		category: ApiControllerGetListQueryLink(RelationFilterCategoryGameEntity, {
			fields: {
				id: {
					allowedOperations: [EFilterOperation.EQ],
					isEnabled: true,
					relationConditions: [{ field: "id", operator: EFilterOperation.IN, relation: "game", values: [RELATION_FILTER_SOME_LINK_ID] }],
				},
			},
			source: "game",
			target: "category",
		}),
		sourceLink: ApiControllerGetListQueryLink(RelationFilterGameSourceLinkEntity, {
			fields: {
				"provider.id": {
					allowedOperations: [EFilterOperation.EQ],
					isEnabled: true,
					relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: ERelationFilterState.ACTIVE }],
				},
			},
			source: "game",
			target: "source",
		}),
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
};

// What happens when a query leaves a relation filter out.
export const RELATION_FILTER_MISSING_FILTER: IApiControllerPropertiesRouteGetListQueryFilter<RelationFilterGameEntity> = {
	fields: {},
	links: {
		category: ApiControllerGetListQueryLink(RelationFilterCategoryGameEntity, {
			fields: {
				id: {
					allowedOperations: [EFilterOperation.EQ],
					defaultCondition: { operator: EFilterOperation.EQ, value: RELATION_FILTER_DEFAULT_CATEGORY_ID },
					isEnabled: true,
					missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.USE_DEFAULT,
				},
			},
			source: "game",
			target: "category",
		}),
		featuredCategory: ApiControllerGetListQueryLink(RelationFilterFeaturedCategoryEntity, {
			fields: {
				id: {
					allowedOperations: [EFilterOperation.EQ],
					isEnabled: true,
					missingBehavior: EApiControllerGetListQueryFilterMissingBehavior.REJECT,
				},
			},
			source: "game",
			target: "category",
		}),
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
};

// A one-hop path with fixed conditions, which is an EXISTS path.
export const RELATION_FILTER_OFFER_FILTER: IApiControllerPropertiesRouteGetListQueryFilter<RelationFilterOfferEntity> = {
	fields: {
		"provider.id": {
			allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
			isEnabled: true,
			maxValues: RELATION_FILTER_MAX_VALUES,
			relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: ERelationFilterState.ACTIVE }],
		},
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
};

// The same path without them, which keeps its left join and may ask about a value it is not.
export const RELATION_FILTER_PLAIN_OFFER_FILTER: IApiControllerPropertiesRouteGetListQueryFilter<RelationFilterOfferEntity> = {
	fields: {
		"provider.id": { allowedOperations: [EFilterOperation.EQ, EFilterOperation.NE], isEnabled: true },
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
};
