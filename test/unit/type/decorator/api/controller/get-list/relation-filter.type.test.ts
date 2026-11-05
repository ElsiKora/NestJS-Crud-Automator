import type { FILTER_RELATION_CONSTANT } from "@constant/filter/relation.constant";
import type { IApiControllerPropertiesRouteGetListQueryFilter } from "@interface/decorator/api";
import type { TApiControllerGetListQueryFilterFields, TApiControllerGetListQueryFilterPath, TApiControllerGetListQueryRelationHops } from "@type/decorator/api/controller";

import { EApiControllerGetListQueryUnlistedFields } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
import { ApiControllerGetListQueryLink } from "@utility/api/controller/get-list/query/link.utility";
import { describe, expect, expectTypeOf, it } from "vitest";

enum EState {
	ACTIVE = "ACTIVE",
	INACTIVE = "INACTIVE",
}

class ProviderEntity {
	public code!: string;
	public id!: string;
	public state!: EState;
}

class SourceEntity {
	public id!: string;
	public provider!: null | ProviderEntity;
}

class GameEntity {
	public gameSource!: null | SourceEntity;
	public id!: string;
	public name!: string;
	public sourceHistory!: Array<SourceEntity>;
}

class CategoryEntity {
	public code!: string;
	public id!: string;
	public owner!: ProviderEntity;
	public state!: EState;
}

class CategoryGameEntity {
	public category!: CategoryEntity;
	public createdAt!: Date;
	public game!: GameEntity;
	public id!: string;
	public tags!: Array<ProviderEntity>;
}

class FeaturedCategoryEntity {
	public category!: CategoryEntity;
	public game!: GameEntity;
	public id!: string;
}

type TChainA = { id: string; next: TChainB };
type TChainB = { id: string; next: TChainC };
type TChainC = { id: string; next: TChainD };
type TChainD = { id: string; next: TChainE };
type TChainE = { id: string };

const ACTIVE_ID_FIELD = {
	allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
	isEnabled: true,
	maxValues: 50,
	relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: EState.ACTIVE }],
} as const;

describe("typed relation filter paths", () => {
	it("takes a deep to-one path and a to-many path as keys of fields", () => {
		const filter: IApiControllerPropertiesRouteGetListQueryFilter<GameEntity> = {
			fields: {
				"gameSource.provider.id": {
					allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN],
					isEnabled: true,
					maxValues: 50,
					relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: EState.ACTIVE }],
				},
				"sourceHistory.provider.code": { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			},
			unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
		};

		expect(filter.fields).toBeDefined();
	});

	it("keeps a typo in any key a compile error", () => {
		const fields: Array<TApiControllerGetListQueryFilterFields<GameEntity>> = [
			{
				// @ts-expect-error -- A typo in the last segment of a deep path.
				"gameSource.provider.idd": { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			},
			{
				// @ts-expect-error -- A typo in a one-hop path.
				"gameSource.idd": { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			},
			{
				// @ts-expect-error -- A typo in a direct column.
				namme: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			},
			{
				// @ts-expect-error -- A path that ends on a relation.
				"gameSource.provider": { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			},
		];

		expect(fields).toHaveLength(4);
	});

	it("types a fixed condition by the last entity of the key", () => {
		const filter: IApiControllerPropertiesRouteGetListQueryFilter<GameEntity> = {
			fields: {
				"gameSource.provider.id": {
					allowedOperations: [EFilterOperation.EQ],
					isEnabled: true,
					relationConditions: [
						// @ts-expect-error -- The provider has no such column.
						{ field: "stat", operator: EFilterOperation.EQ, value: EState.ACTIVE },
						// @ts-expect-error -- The value is no state.
						{ field: "state", operator: EFilterOperation.EQ, value: "ARCHIVED" },
					],
				},
			},
			unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
		};

		expect(filter.fields).toBeDefined();
	});

	it("offers no fixed condition on a direct column", () => {
		const filter: IApiControllerPropertiesRouteGetListQueryFilter<GameEntity> = {
			fields: {
				name: {
					allowedOperations: [EFilterOperation.EQ],
					isEnabled: true,
					// @ts-expect-error -- Only a key that crosses a relation holds a fixed condition.
					relationConditions: [{ field: "name", operator: EFilterOperation.EQ, value: "a" }],
				},
			},
			unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
		};

		expect(filter.fields).toBeDefined();
	});

	it("follows the runtime hop limit", () => {
		expectTypeOf<TApiControllerGetListQueryRelationHops["length"]>().toEqualTypeOf<(typeof FILTER_RELATION_CONSTANT)["MAXIMUM_HOPS"]>();
		expectTypeOf<"next.next.next.next.id">().toExtend<TApiControllerGetListQueryFilterPath<TChainA>>();
		expectTypeOf<TApiControllerGetListQueryFilterPath<{ a: TChainA }>>().not.toExtend<"a.next.next.next.next.id">();
		expectTypeOf<"a.next.next.next.next.id">().not.toExtend<TApiControllerGetListQueryFilterPath<{ a: TChainA }>>();
	});
});

describe("typed relation filter links", () => {
	it("takes two links to one target under names the developer writes", () => {
		const filter: IApiControllerPropertiesRouteGetListQueryFilter<GameEntity> = {
			fields: {},
			links: {
				category: ApiControllerGetListQueryLink(CategoryGameEntity, {
					fields: {
						id: { allowedOperations: [EFilterOperation.EQ, EFilterOperation.IN], isEnabled: true, maxValues: 50, relationConditions: [{ field: "state", operator: EFilterOperation.EQ, value: EState.ACTIVE }] },
						"owner.code": { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
					},
					source: "game",
					target: "category",
				}),
				featuredCategory: ApiControllerGetListQueryLink(FeaturedCategoryEntity, {
					fields: { id: ACTIVE_ID_FIELD },
					source: "game",
					target: "category",
				}),
			},
			unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
		};

		expect(Object.keys(filter.links ?? {})).toEqual(["category", "featuredCategory"]);
	});

	it("keeps a typo in the relations and the fields of a link a compile error", () => {
		const links = [
			ApiControllerGetListQueryLink(CategoryGameEntity, {
				fields: {},
				// @ts-expect-error -- No such relation on the link class.
				source: "gamee",
				target: "category",
			}),
			ApiControllerGetListQueryLink(CategoryGameEntity, {
				fields: {},
				source: "game",
				// @ts-expect-error -- A scalar is no relation.
				target: "createdAt",
			}),
			ApiControllerGetListQueryLink(CategoryGameEntity, {
				fields: {},
				source: "game",
				// @ts-expect-error -- A to-many relation is no owning to-one relation.
				target: "tags",
			}),
			ApiControllerGetListQueryLink(CategoryGameEntity, {
				fields: {
					// @ts-expect-error -- The target has no such column.
					idd: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
				},
				source: "game",
				target: "category",
			}),
			ApiControllerGetListQueryLink(CategoryGameEntity, {
				fields: {
					id: {
						allowedOperations: [EFilterOperation.EQ],
						isEnabled: true,
						// @ts-expect-error -- The target has no such column.
						relationConditions: [{ field: "stat", operator: EFilterOperation.EQ, value: EState.ACTIVE }],
					},
				},
				source: "game",
				target: "category",
			}),
		];

		expect(links).toHaveLength(5);
	});

	it("makes a duplicate link name a compile error", () => {
		const link = ApiControllerGetListQueryLink(CategoryGameEntity, { fields: {}, source: "game", target: "category" });
		const filter: IApiControllerPropertiesRouteGetListQueryFilter<GameEntity> = {
			fields: {},
			links: {
				category: link,
				// @ts-expect-error -- An object literal cannot have two properties of one name.
				category: link,
			},
			unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
		};

		expect(filter.links).toBeDefined();
	});

	it("gives a link two hops less to cross on its target", () => {
		class DeepLinkEntity {
			public game!: GameEntity;
			public next!: TChainA;
		}

		const link = ApiControllerGetListQueryLink(DeepLinkEntity, {
			fields: {
				"next.next.id": { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
				// @ts-expect-error -- Two hops of the link and three on its target are over the limit.
				"next.next.next.id": { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
			},
			source: "game",
			target: "next",
		});

		expect(link.target).toBe("next");
	});
});
