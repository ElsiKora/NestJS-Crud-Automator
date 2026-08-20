import type { IApiBaseEntity, IApiControllerProperties, IApiControllerPropertiesRouteGetListQueryOrderEntry, IApiControllerPropertiesRouteIdentity, IApiControllerPropertiesRouteReadScope, IApiControllerPropertiesRouteWithAutoDto, IApiEntity, TApiControllerMethodMap, TApiControllerPropertiesRoute, TApiControllerTransformDataData, TApiControllerTransformDataObjectToTransform, TApiPropertyDescribeProperties, TApiRequestTransformer } from "../../../../../../src";

import {
	ApiControllerApplyDecorators,
	ApiControllerApplyMetadata,
	ApiControllerGetDto,
	ApiControllerSerializeRouteResponse,
	ApiControllerTransformData,
	ApiControllerValidateRequest,
	ApiControllerWriteDtoSwagger,
	CONTROLLER_API_DECORATOR_CONSTANT,
	EApiControllerGetListQueryUnlistedFields,
	EApiControllerRequestTarget,
	EApiControllerRequestTransformerType,
	EApiControllerResponseTarget,
	EApiDtoType,
	EApiPropertyDescribeType,
	EApiRouteType,
	EFilterOrderDirection,
} from "../../../../../../src";
import { describe, expect, it } from "vitest";

type TUuid = string & { readonly __uuidBrand: unique symbol };

interface IPublicGeneratedReadEntity {
	id: TUuid;
	label: string;
	owner: { id: TUuid };
	ownerId: TUuid;
	sequence: number;
}

interface IPublicGeneratedReadResponse {
	ok: boolean;
}

type TTypeEqual<L, R> = (<T>() => T extends L ? 1 : 2) extends <T>() => T extends R ? 1 : 2 ? true : false;

class PublicGeneratedReadParametersDto {}
class PublicGeneratedReadQueryDto {}
class PublicGeneratedReadResponseDto {}

describe("public generated read type contract", () => {
	it("accepts read scope on GET and compound server order on GET_LIST", () => {
		const readScope: IApiControllerPropertiesRouteReadScope<IPublicGeneratedReadEntity> = {
			parameters: [{ field: "ownerId", parameter: "ownerId" }],
		};
		const uuidTieBreaker: IApiControllerPropertiesRouteGetListQueryOrderEntry<IPublicGeneratedReadEntity> = {
			direction: EFilterOrderDirection.ASC,
			field: "id",
		};
		const getRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = {
			read: {
				scope: readScope,
			},
		};
		const getListRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = {
			read: {
				scope: readScope,
			},
			request: {
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [
							{ direction: EFilterOrderDirection.DESC, field: "sequence" },
							{ direction: EFilterOrderDirection.ASC, field: "id" },
						],
						fields: {
							label: { isEnabled: true },
							sequence: { isEnabled: true },
						},
						tieBreakers: [uuidTieBreaker],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		};

		expect(getRoute.read?.scope?.parameters).toEqual([{ field: "ownerId", parameter: "ownerId" }]);
		expect(getListRoute.request?.[EApiControllerRequestTarget.QUERY]?.order?.defaultOrder).toHaveLength(2);
	});

	it("accepts a GET primary identity alias with or without inherited scope", () => {
		const identity: IApiControllerPropertiesRouteIdentity = { parameter: "gameId" };
		const identityOnlyRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = {
			identity,
		};
		const identityAndScopeRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = {
			identity,
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
			request: {
				[EApiControllerRequestTarget.PARAMETERS]: {
					transformers: [
						{
							key: "gameId",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
						},
					],
				},
			},
		};

		expect(identityOnlyRoute.identity?.parameter).toBe("gameId");
		expect(identityAndScopeRoute.read?.scope?.parameters).toEqual([{ field: "ownerId", parameter: "ownerId" }]);
	});

	it("rejects GET identity grammar on GET_LIST for fresh and non-fresh values", () => {
		const freshRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = {
			// @ts-expect-error -- GET_LIST has no primary identity path segment to alias.
			identity: { parameter: "gameId" },
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		};
		const nonFreshRouteValue = {
			identity: { parameter: "gameId" },
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		} as const;
		// @ts-expect-error -- Non-fresh values cannot add identity grammar to GET_LIST.
		const nonFreshRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = nonFreshRouteValue;

		expect(freshRoute).toBeDefined();
		expect(nonFreshRoute).toBeDefined();
	});

	it("rejects manual PARAMETERS DTO ownership on an identity-aliased GET", () => {
		// @ts-expect-error -- Generated read identity owns the route PARAMETERS DTO.
		const route: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = {
			dto: {
				[EApiDtoType.PARAMETERS]: PublicGeneratedReadParametersDto,
			},
			identity: { parameter: "gameId" },
		};

		expect(route).toBeDefined();
	});

	it("rejects invalid identity grammar and manual PARAMETERS DTOs from non-fresh GET values", () => {
		const invalidIdentityValue = { identity: { parameter: 1 } } as const;
		const manualParametersValue = {
			dto: { [EApiDtoType.PARAMETERS]: PublicGeneratedReadParametersDto },
			identity: { parameter: "gameId" },
		} as const;
		// @ts-expect-error -- Non-fresh identity grammar still requires a string parameter.
		const invalidIdentityRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = invalidIdentityValue;
		// @ts-expect-error -- Non-fresh identity routes still cannot own a manual PARAMETERS DTO.
		const manualParametersRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = manualParametersValue;

		expect(invalidIdentityRoute).toBeDefined();
		expect(manualParametersRoute).toBeDefined();
	});

	it("accepts aliased GET_LIST PARAMETERS transformers and property metadata", () => {
		const parameterProperty: TApiPropertyDescribeProperties = {
			description: "owner id",
			properties: {
				[EApiRouteType.GET_LIST]: {
					[EApiDtoType.PARAMETERS]: {
						isRequired: true,
					},
				},
			},
			type: EApiPropertyDescribeType.UUID,
		};
		const route: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = {
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerAlias" }],
				},
			},
			request: {
				[EApiControllerRequestTarget.PARAMETERS]: {
					transformers: [
						{
							key: "ownerAlias",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
						},
					],
					validators: [],
				},
			},
		};
		const queryTransformerRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = {
			request: {
				// @ts-expect-error -- Aliased string transformer keys are scoped to inherited PARAMETERS.
				[EApiControllerRequestTarget.QUERY]: {
					transformers: [
						{
							key: "ownerAlias",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
						},
					],
				},
			},
		};

		expect(parameterProperty.properties?.[EApiRouteType.GET_LIST]?.[EApiDtoType.PARAMETERS]?.isRequired).toBe(true);
		expect(route.request?.[EApiControllerRequestTarget.PARAMETERS]?.transformers?.[0]?.key).toBe("ownerAlias");
		expect(queryTransformerRoute).toBeDefined();
	});

	it("accepts aliased PARAMETERS transformers only on configured-read GET routes", () => {
		const configuredReadRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = {
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "externalOwner" }],
				},
			},
			request: {
				[EApiControllerRequestTarget.PARAMETERS]: {
					transformers: [
						{
							key: "externalOwner",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
						},
					],
				},
			},
		};
		const legacyGetRoute: IApiControllerPropertiesRouteWithAutoDto<IPublicGeneratedReadEntity, EApiRouteType.GET> = {
			request: {
				[EApiControllerRequestTarget.PARAMETERS]: {
					transformers: [
						{
							// @ts-expect-error -- Legacy GET transformer keys remain entity keys.
							key: "externalOwner",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
						},
					],
				},
			},
		};

		expect(configuredReadRoute.request?.[EApiControllerRequestTarget.PARAMETERS]?.transformers?.[0]?.key).toBe("externalOwner");
		expect(legacyGetRoute).toBeDefined();
	});

	it("preserves manual response/query DTOs and auto PARAMETERS validators on configured reads", () => {
		const getWithManualResponse: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = {
			dto: {
				[EApiDtoType.RESPONSE]: PublicGeneratedReadResponseDto,
			},
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		};
		const getListWithManualQuery: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = {
			dto: {
				[EApiDtoType.QUERY]: PublicGeneratedReadQueryDto,
				[EApiDtoType.RESPONSE]: PublicGeneratedReadResponseDto,
			},
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		};
		const getListWithAutoParametersValidators: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = {
			autoDto: {
				[EApiDtoType.PARAMETERS]: {
					validators: [],
				},
			},
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		};

		expect(getWithManualResponse.dto?.[EApiDtoType.RESPONSE]).toBe(PublicGeneratedReadResponseDto);
		expect(getListWithManualQuery.dto?.[EApiDtoType.QUERY]).toBe(PublicGeneratedReadQueryDto);
		expect(getListWithAutoParametersValidators.autoDto?.[EApiDtoType.PARAMETERS]?.validators).toEqual([]);
	});

	it("rejects manual PARAMETERS DTOs on configured reads", () => {
		// @ts-expect-error -- Configured read owns the generated PARAMETERS DTO.
		const getRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = {
			dto: {
				[EApiDtoType.PARAMETERS]: PublicGeneratedReadParametersDto,
			},
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		};
		// @ts-expect-error -- Configured read owns the generated PARAMETERS DTO.
		const getListRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = {
			dto: {
				[EApiDtoType.PARAMETERS]: PublicGeneratedReadParametersDto,
			},
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		};

		expect(getRoute).toBeDefined();
		expect(getListRoute).toBeDefined();
	});

	it("rejects manual PARAMETERS DTOs on non-fresh configured-read values", () => {
		const nonFreshGetRoute = {
			dto: {
				[EApiDtoType.PARAMETERS]: PublicGeneratedReadParametersDto,
			},
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		} as const;
		const nonFreshGetListRoute = {
			dto: {
				[EApiDtoType.PARAMETERS]: PublicGeneratedReadParametersDto,
			},
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		} as const;
		// @ts-expect-error -- A non-fresh value cannot bypass generated PARAMETERS DTO ownership.
		const getRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = nonFreshGetRoute;
		// @ts-expect-error -- A non-fresh value cannot bypass generated PARAMETERS DTO ownership.
		const getListRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = nonFreshGetListRoute;

		expect(getRoute).toBeDefined();
		expect(getListRoute).toBeDefined();
	});

	it("preserves explicit 3.0.2 root-export generic calls", () => {
		const entityResponse: IPublicGeneratedReadEntity = {
			id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" as TUuid,
			label: "entity",
			owner: { id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as TUuid },
			ownerId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb" as TUuid,
			sequence: 1,
		};
		const entityMetadata = {} as IApiEntity<IPublicGeneratedReadEntity>;
		const controllerProperties = { entity: {}, routes: {} } as IApiControllerProperties<IPublicGeneratedReadEntity>;
		const targetMethod = (async (): Promise<IPublicGeneratedReadEntity> => entityResponse) as TApiControllerMethodMap<IPublicGeneratedReadEntity>[EApiRouteType.GET];
		const route: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = {};
		const response: IPublicGeneratedReadResponse = { ok: true };
		const sourceCompatibilityProbe = (): IPublicGeneratedReadResponse => {
			ApiControllerApplyDecorators<IPublicGeneratedReadEntity>(targetMethod, entityMetadata, controllerProperties, EApiRouteType.GET, "get", route, []);
			ApiControllerApplyMetadata<IPublicGeneratedReadEntity>({}, {}, entityMetadata, controllerProperties, EApiRouteType.GET, "get", route);
			ApiControllerGetDto<IPublicGeneratedReadEntity, EApiRouteType.GET>(controllerProperties, entityMetadata, EApiRouteType.GET, EApiDtoType.PARAMETERS, route, undefined);
			ApiControllerWriteDtoSwagger<IPublicGeneratedReadEntity>({}, entityMetadata, controllerProperties, EApiRouteType.GET, route, entityMetadata);

			return ApiControllerSerializeRouteResponse<IPublicGeneratedReadEntity, IPublicGeneratedReadResponse>(route, undefined, response);
		};

		expect(sourceCompatibilityProbe).toBeTypeOf("function");
	});

	it("preserves the exact 3.0.2 low-level facade arities", () => {
		const exactArities: [TTypeEqual<Parameters<typeof ApiControllerApplyDecorators>["length"], 7 | 8>, TTypeEqual<Parameters<typeof ApiControllerApplyMetadata>["length"], 7 | 8>, TTypeEqual<Parameters<typeof ApiControllerGetDto>["length"], 5 | 6>, TTypeEqual<Parameters<typeof ApiControllerWriteDtoSwagger>["length"], 6 | 7>] = [true, true, true, true];

		expect(exactArities).toEqual([true, true, true, true]);
	});

	it("preserves the exact 3.0.2 public controller metadata key set", () => {
		const legacyControllerMetadataKeys: Record<keyof typeof CONTROLLER_API_DECORATOR_CONSTANT, string> = {
			ENTITY_METADATA_KEY: "entity",
			GET_LIST_QUERY_PLAN_METADATA_KEY: "get-list-query-plan",
			OBSERVABLE_METADATA_KEY: "observable",
			PROPERTIES_METADATA_KEY: "properties",
			RESERVED_METHOD_PREFIX: "reserved-method-prefix",
			SECURABLE_METADATA_KEY: "securable",
		};

		expect(Object.keys(legacyControllerMetadataKeys)).toHaveLength(6);
	});

	it("preserves the exact 3.0.2 ApiControllerTransformData implementation contract", () => {
		const legacyImplementation = <E extends IApiBaseEntity>(targets: Partial<Record<EApiControllerRequestTarget | EApiControllerResponseTarget, { transformers?: Array<TApiRequestTransformer<E>> }>> | undefined, properties: IApiControllerProperties<E>, objectToTransform: TApiControllerTransformDataObjectToTransform<E>, data: TApiControllerTransformDataData): void => {
			void targets;
			void properties;
			void objectToTransform;
			void data;
		};
		const publicImplementation: typeof ApiControllerTransformData = legacyImplementation;

		expect(publicImplementation).toBe(legacyImplementation);
	});

	it("preserves the exact 3.0.2 ApiControllerValidateRequest target contract", () => {
		const controllerProperties = { entity: {}, routes: {} } as IApiControllerProperties<IPublicGeneratedReadEntity>;
		const validation = ApiControllerValidateRequest<IPublicGeneratedReadEntity>({ transformers: [] }, controllerProperties, {});

		expect(validation).toBeInstanceOf(Promise);
	});

	it("preserves generic 3.0.2 auto DTO route wrappers", () => {
		const preserveRouteWrapper = <E, R extends EApiRouteType>(route: IApiControllerPropertiesRouteWithAutoDto<E, R>): TApiControllerPropertiesRoute<E, R> => route;

		expect(preserveRouteWrapper).toBeTypeOf("function");
	});

	it("rejects generated read scope on write and delete routes", () => {
		const createRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.CREATE> = {
			// @ts-expect-error -- Generated read scope is available only to GET and GET_LIST.
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		};
		const deleteRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.DELETE> = {
			// @ts-expect-error -- Generated read scope is available only to GET and GET_LIST.
			read: {
				scope: {
					parameters: [{ field: "ownerId", parameter: "ownerId" }],
				},
			},
		};

		expect(createRoute).toBeDefined();
		expect(deleteRoute).toBeDefined();
	});

	it("rejects generated identity aliases on every non-GET route", () => {
		const createRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.CREATE> = {
			// @ts-expect-error -- Only generated GET owns an identity path alias.
			identity: { parameter: "gameId" },
		};
		const deleteRouteValue = { identity: { parameter: "gameId" } } as const;
		// @ts-expect-error -- Non-fresh values cannot add identity grammar to DELETE.
		const deleteRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.DELETE> = deleteRouteValue;
		const partialUpdateRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.PARTIAL_UPDATE> = {
			// @ts-expect-error -- Only generated GET owns an identity path alias.
			identity: { parameter: "gameId" },
		};
		const updateRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.UPDATE> = {
			// @ts-expect-error -- Only generated GET owns an identity path alias.
			identity: { parameter: "gameId" },
		};

		expect(createRoute).toBeDefined();
		expect(deleteRoute).toBeDefined();
		expect(partialUpdateRoute).toBeDefined();
		expect(updateRoute).toBeDefined();
	});

	it("rejects relation-valued read scope fields", () => {
		const route: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET> = {
			read: {
				scope: {
					parameters: [
						{
							// @ts-expect-error -- Read scope fields must be direct scalar entity properties.
							field: "owner",
							parameter: "ownerId",
						},
					],
				},
			},
		};

		expect(route).toBeDefined();
	});

	it("rejects relation and nested paths in compound server order", () => {
		const relationDefaultRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = {
			request: {
				// @ts-expect-error -- Compound server default order accepts only direct scalar fields.
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						defaultOrder: [
							{
								direction: EFilterOrderDirection.ASC,
								field: "owner",
							},
						],
						fields: {},
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		};
		const nestedTieBreakerRoute: TApiControllerPropertiesRoute<IPublicGeneratedReadEntity, EApiRouteType.GET_LIST> = {
			request: {
				// @ts-expect-error -- Compound server tie-breakers reject nested paths.
				[EApiControllerRequestTarget.QUERY]: {
					order: {
						fields: {},
						tieBreakers: [
							{
								direction: EFilterOrderDirection.ASC,
								field: "owner.id",
							},
						],
						unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
					},
				},
			},
		};

		expect(relationDefaultRoute).toBeDefined();
		expect(nestedTieBreakerRoute).toBeDefined();
	});
});
