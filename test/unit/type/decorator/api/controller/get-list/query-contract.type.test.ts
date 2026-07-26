import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
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

	it("rejects to-many filter paths", () => {
		const route: TApiControllerPropertiesRoute<ITypedQueryEntity, EApiRouteType.GET_LIST> = {
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					// @ts-expect-error -- To-many relation paths are not generated filter paths.
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
				[EApiControllerRequestTarget.QUERY]: {
					// @ts-expect-error -- Filter paths stop after one to-one relation hop.
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
				[EApiControllerRequestTarget.QUERY]: {
					// @ts-expect-error -- Ordering is restricted to direct scalar fields.
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
				[EApiControllerRequestTarget.QUERY]: {
					// @ts-expect-error -- Null predicates require a nullable or optional entity field.
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
				[EApiControllerRequestTarget.QUERY]: {
					// @ts-expect-error -- Scalar boolean filters do not support string exclusion operators.
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
