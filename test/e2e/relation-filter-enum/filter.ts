import type { IApiControllerPropertiesRouteGetListQueryFilter } from "../../../src/index";

import { ApiControllerGetListQueryLink, EApiAuthorizationMode, EApiControllerGetListQueryUnlistedFields, EFilterOperation } from "../../../src/index";

import { ERelationFilterEnumCategoryState, ERelationFilterEnumProviderState, RelationFilterEnumCategoryGameEntity, RelationFilterEnumGameEntity } from "./entity";

export const RELATION_FILTER_ENUM_MAX_VALUES: number = 3;

export const RELATION_FILTER_ENUM_IAM_NAMESPACE: string = "relation-filter-enum:game";

// Core's two filters, with their fixed conditions on enum columns of two types, and the plain state fields a client may send instead.
export const RELATION_FILTER_ENUM_FILTER: IApiControllerPropertiesRouteGetListQueryFilter<RelationFilterEnumGameEntity> = {
	fields: {
		"gameSource.provider.id": {
			allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
			isEnabled: true,
			maxValues: RELATION_FILTER_ENUM_MAX_VALUES,
			relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: ERelationFilterEnumProviderState.ACTIVE }],
		},
		"gameSource.provider.state": { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN], isEnabled: true, maxValues: RELATION_FILTER_ENUM_MAX_VALUES },
	},
	links: {
		category: ApiControllerGetListQueryLink(RelationFilterEnumCategoryGameEntity, {
			fields: {
				id: {
					allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
					isEnabled: true,
					maxValues: RELATION_FILTER_ENUM_MAX_VALUES,
					relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: ERelationFilterEnumCategoryState.ACTIVE }],
				},
				state: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN], isEnabled: true, maxValues: RELATION_FILTER_ENUM_MAX_VALUES },
			},
			source: "game",
			target: "category",
		}),
	},
	unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
};

// An IAM route whose scope can ask about the state of a game's tags, a to-many relation with a third enum type.
export const RELATION_FILTER_ENUM_IAM_AUTHORIZATION: object = {
	defaultMode: EApiAuthorizationMode.IAM,
	policyNamespace: RELATION_FILTER_ENUM_IAM_NAMESPACE,
	resourceDefinition: {
		entity: RelationFilterEnumGameEntity,
		fields: [
			{ isFilterable: true, path: "resource.region", queryPath: "region" },
			{ isFilterable: true, path: "resource.tagState", queryPath: "tags.state" },
		],
		namespace: RELATION_FILTER_ENUM_IAM_NAMESPACE,
		resourcePath: `${RELATION_FILTER_ENUM_IAM_NAMESPACE}/{id}`,
		resourceType: RELATION_FILTER_ENUM_IAM_NAMESPACE,
	},
};
