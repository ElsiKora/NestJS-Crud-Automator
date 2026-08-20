import type { TApiControllerGetListQuery, TApiControllerPropertiesRoute } from "@type/decorator/api/controller";
import type { IApiControllerGetListQueryPlan, IApiControllerGetListQueryPlanOrder, IApiControllerGetListQueryPlanOrderField, IApiControllerGetListQueryRuntimeResult } from "@interface/class/api/controller/get-list/query";

import { EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { EFilterOperation } from "@enum/filter";
import { describe, expect, it } from "vitest";

import { type ITypedQueryEntity, ManualQueryDto, ManualResponseDto } from "./fixture";

describe("typed GET_LIST query public contract", () => {
	it("accepts metadata overlays with a manual response DTO", () => {
		const route: TApiControllerPropertiesRoute<ITypedQueryEntity, EApiRouteType.GET_LIST> = {
			dto: {
				[EApiDtoType.RESPONSE]: ManualResponseDto,
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							count: {
								allowedOperations: [EFilterOperation.BETWEEN, EFilterOperation.EQ],
								isEnabled: true,
							},
							name: {
								allowedOperations: [EFilterOperation.EQ],
								isEnabled: true,
							},
							nullableName: {
								allowedOperations: [EFilterOperation.ISNULL, EFilterOperation.NOTNULL],
								isEnabled: true,
							},
							"owner.name": {
								allowedOperations: [EFilterOperation.EQ],
								isEnabled: true,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
					order: {
						fields: {
							count: { isEnabled: true },
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		};

		expect(route.request?.[EApiControllerRequestTarget.QUERY]).toBeDefined();
	});

	it("keeps a manual QUERY DTO valid when generated query config is omitted", () => {
		const route: TApiControllerPropertiesRoute<ITypedQueryEntity, EApiRouteType.GET_LIST> = {
			dto: {
				[EApiDtoType.QUERY]: ManualQueryDto,
			},
		};

		expect(route.dto?.[EApiDtoType.QUERY]).toBe(ManualQueryDto);
	});

	it("models PAGE and mutually exclusive CURSOR query inputs", () => {
		const page: TApiControllerGetListQuery<ITypedQueryEntity> = { limit: 10, page: 1 };
		const pageWithCursorNamedFilters: TApiControllerGetListQuery<{ after: string; before: string }> = {
			after: { operator: EFilterOperation.EQ, value: "after-value" },
			before: { operator: EFilterOperation.EQ, value: "before-value" },
			limit: 10,
			page: 1,
		};
		const first: TApiControllerGetListQuery<ITypedQueryEntity, EApiControllerGetListQueryPaginationMode.CURSOR> = { limit: 10 };
		const after: TApiControllerGetListQuery<ITypedQueryEntity, EApiControllerGetListQueryPaginationMode.CURSOR> = { after: "next", limit: 10 };
		const before: TApiControllerGetListQuery<ITypedQueryEntity, EApiControllerGetListQueryPaginationMode.CURSOR> = { before: "previous", limit: 10 };
		// @ts-expect-error -- CURSOR accepts at most one direction.
		const twoDirections: TApiControllerGetListQuery<ITypedQueryEntity, EApiControllerGetListQueryPaginationMode.CURSOR> = { after: "next", before: "previous", limit: 10 };
		// @ts-expect-error -- CURSOR has no page parameter.
		const cursorPage: TApiControllerGetListQuery<ITypedQueryEntity, EApiControllerGetListQueryPaginationMode.CURSOR> = { limit: 10, page: 1 };
		// @ts-expect-error -- The source-compatible default remains PAGE.
		const pageCursor: TApiControllerGetListQuery<ITypedQueryEntity> = { after: "next", limit: 10, page: 1 };

		expect([page, pageWithCursorNamedFilters, first, after, before, twoDirections, cursorPage, pageCursor]).toHaveLength(8);
	});

	it("keeps HEAD-era public PAGE plan and runtime literals source-compatible", () => {
		const orderField: IApiControllerGetListQueryPlanOrderField = { isEnabled: true, path: "id" };
		const order: IApiControllerGetListQueryPlanOrder = { fields: { id: orderField }, isLegacy: true };
		const plan: IApiControllerGetListQueryPlan = {
			controllerName: "LegacyController",
			filter: { fields: {}, isLegacy: true },
			order,
			schemaName: "LegacyControllerGetListQueryDTO",
			signature: "legacy",
		};
		const result: IApiControllerGetListQueryRuntimeResult = { filterQuery: {}, limit: 10, page: 1 };
		const page: number = result.page;
		const planKeys: Record<keyof IApiControllerGetListQueryPlan, true> = {
			controllerName: true,
			filter: true,
			order: true,
			schemaName: true,
			signature: true,
		};
		const runtimeKeys: Record<keyof IApiControllerGetListQueryRuntimeResult, true> = {
			ast: true,
			filterQuery: true,
			limit: true,
			order: true,
			orderBy: true,
			orderDirection: true,
			page: true,
		};
		// @ts-expect-error -- The existing compiler plan remains deliberately non-generic.
		const genericPlan: IApiControllerGetListQueryPlan<EApiControllerGetListQueryPaginationMode.PAGE> = plan;
		// @ts-expect-error -- The existing runtime result remains deliberately non-generic.
		const genericResult: IApiControllerGetListQueryRuntimeResult<EApiControllerGetListQueryPaginationMode.PAGE> = result;

		expect([genericPlan, genericResult, page, plan, planKeys, runtimeKeys]).toHaveLength(6);
	});

	it("rejects manual QUERY DTO and generated query config together", () => {
		// @ts-expect-error -- Manual QUERY DTOs and generated typed query config are mutually exclusive.
		const route: TApiControllerPropertiesRoute<ITypedQueryEntity, EApiRouteType.GET_LIST> = {
			dto: {
				[EApiDtoType.QUERY]: ManualQueryDto,
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.INHERIT,
					},
				},
			},
		};

		expect(route).toBeDefined();
	});

	it("rejects a manual QUERY DTO with generated pagination", () => {
		// @ts-expect-error -- Generated pagination owns the QUERY DTO.
		const route: TApiControllerPropertiesRoute<ITypedQueryEntity, EApiRouteType.GET_LIST> = {
			dto: {
				[EApiDtoType.QUERY]: ManualQueryDto,
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					pagination: { mode: EApiControllerGetListQueryPaginationMode.PAGE },
				},
			},
		};

		expect(route).toBeDefined();
	});

	it("rejects to-many filter paths", () => {
		const route: TApiControllerPropertiesRoute<ITypedQueryEntity, EApiRouteType.GET_LIST> = {
			request: {
				// @ts-expect-error -- To-many relation paths are not generated filter paths.
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							"tags.name": {
								allowedOperations: [EFilterOperation.EQ],
								isEnabled: true,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		};

		expect(route).toBeDefined();
	});

	it("rejects deeper filter paths", () => {
		const route: TApiControllerPropertiesRoute<ITypedQueryEntity, EApiRouteType.GET_LIST> = {
			request: {
				// @ts-expect-error -- Filter paths stop after one to-one relation hop.
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							"owner.name.deep": {
								allowedOperations: [EFilterOperation.EQ],
								isEnabled: true,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		};

		expect(route).toBeDefined();
	});

	it("rejects relation order paths", () => {
		const route: TApiControllerPropertiesRoute<ITypedQueryEntity, EApiRouteType.GET_LIST> = {
			request: {
				// @ts-expect-error -- Ordering is restricted to direct scalar fields.
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						fields: {
							"owner.name": { isEnabled: true },
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		};

		expect(route).toBeDefined();
	});

	it("rejects null predicates for non-nullable fields", () => {
		const route: TApiControllerPropertiesRoute<ITypedQueryEntity, EApiRouteType.GET_LIST> = {
			request: {
				// @ts-expect-error -- Null predicates require a nullable or optional entity field.
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							name: {
								allowedOperations: [EFilterOperation.ISNULL],
								isEnabled: true,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		};

		expect(route).toBeDefined();
	});

	it("rejects legacy boolean exclusion operations that runtime cannot compile", () => {
		const route: TApiControllerPropertiesRoute<ITypedQueryEntity, EApiRouteType.GET_LIST> = {
			request: {
				// @ts-expect-error -- Scalar boolean filters do not support string exclusion operators.
				[EApiControllerRequestTarget.QUERY]: {
					filter: {
						fields: {
							enabled: {
								allowedOperations: [EFilterOperation.EXCL],
								isEnabled: true,
							},
						},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		};

		expect(route).toBeDefined();
	});
});
