import type { IApiAuthenticationRequest } from "@interface/api";
import type { IApiControllerPathPlan } from "@interface/class/api/controller/path";
import type { IApiGetListCursorResponseResult, IApiGetListResponseResult } from "@interface/decorator/api";
import type { Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { TApiControllerGetListQuery } from "@type/decorator/api/controller";
import type { TApiFunctionGetListProperties, TApiFunctionGetManyProperties, TApiFunctionGetProperties } from "@type/decorator/api/function";
import type { Repository } from "typeorm";

import { ApiServiceBase } from "@class/api";
import { ApiControllerGeneratedReadScopeStorage } from "@class/api/controller/generated";
import { ApiControllerGeneratedFunctionCapability } from "@class/api/controller/generated/function-capability.class";
import { ApiControllerGetListQueryRuntime } from "@class/api/controller/get-list/query";
import { ApiSubscriberExecutor } from "@class/api/subscriber/executor.class";
import { ApiController } from "@decorator/api/controller/decorator";
import { ApiPropertyDescribe } from "@decorator/api/property/describe.decorator";
import { EApiAuthenticationType, EApiControllerGetListQueryPaginationMode, EApiControllerGetListQueryUnlistedFields, EApiControllerRequestTarget, EApiControllerRequestTransformerType, EApiControllerResponseTarget, EApiDtoType, EApiFunctionType, EApiPropertyDateIdentifier, EApiPropertyDateType, EApiPropertyDescribeType, EApiPropertyNumberType, EApiPropertyStringType, EApiRouteType, EApiSubscriberOnType } from "@enum/decorator/api";
import { EFilterOperation, EFilterOrderDirection } from "@enum/filter";
import { EErrorStringAction } from "@enum/utility";
import { BadRequestException } from "@nestjs/common";
import { PARAMTYPES_METADATA, PATH_METADATA, ROUTE_ARGS_METADATA, RouteParamtypes } from "@nestjs/common/internal";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { ApiControllerApplyDecorators } from "@utility/api/controller/apply/decorators.utility";
import { ApiControllerApplyMetadata } from "@utility/api/controller/apply/metadata.utility";
import { ApiControllerGetListQueryPlanGet } from "@utility/api/controller/get-list/query";
import { ApiControllerGetDto } from "@utility/api/controller/get/dto.utility";
import { ApiControllerIdentityPlanGet } from "@utility/api/controller/identity";
import { ApiControllerPathPlanGet, ApiControllerPathWhere } from "@utility/api/controller/path";
import { ApiControllerWriteDtoSwagger } from "@utility/api/controller/write/dto-swagger.utility";
import { DtoGeneratePathParameters } from "@utility/dto/generate/path-parameters.utility";
import { createTypeOrmRepositoryStub } from "@test/unit/fixture";
import { GenerateEntityInformation } from "@utility/generate-entity-information.utility";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { Column, Entity, Equal, Like, ManyToOne, PrimaryColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";

import { GeneratedCursorAliasedItemDto } from "./fixture/generated-cursor-aliased-item.dto";
import { GeneratedCursorItemDto } from "./fixture/generated-cursor-item.dto";
import { GeneratedCursorResponseDto } from "./fixture/generated-cursor-response.dto";
import { GeneratedCursorTransformedItemDto } from "./fixture/generated-cursor-transformed-item.dto";

import "reflect-metadata";

const ENTITY_ID: string = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const SECOND_ENTITY_ID: string = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const EFFECTIVE_AT: string = "2026-08-19T10:00:00.000Z";
const PATH_TENANT_ID: string = "11111111-1111-4111-8111-111111111111";
const QUERY_TENANT_ID: string = "22222222-2222-4222-8222-222222222222";
const SCOPE_TENANT_ID: string = "33333333-3333-4333-8333-333333333333";
const SECOND_SCOPE_TENANT_ID: string = "44444444-4444-4444-8444-444444444444";

interface IGeneratedCursorReadContractController {
	getList: (parameters: Record<string, unknown>, query: Record<string, unknown>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<IApiGetListCursorResponseResult<GeneratedReadContractEntity>>;
	service: GeneratedReadContractService;
}
interface IGeneratedReadContractController {
	get: (parameters: Record<string, unknown>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<GeneratedReadContractEntity>;
	getList: (parameters: Record<string, unknown>, query: Record<string, unknown>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<IApiGetListResponseResult<GeneratedReadContractEntity>>;
	service: GeneratedReadContractService;
}

interface ILegacyGeneratedReadContractController {
	get: (parameters: Record<string, unknown>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<GeneratedReadContractEntity>;
	getList: (query: Record<string, unknown>, headers: Record<string, string>, ip: string, authenticationRequest?: IApiAuthenticationRequest) => Promise<IApiGetListResponseResult<GeneratedReadContractEntity>>;
	service: GeneratedReadContractService;
}

@Entity("generated_read_contract_owners")
class GeneratedReadContractOwnerEntity {
	@ApiPropertyDescribe({
		description: "owner id",
		type: EApiPropertyDescribeType.UUID,
	})
	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}

@Entity("generated_read_hidden_identity_entities")
class GeneratedReadHiddenIdentityEntity {
	@ApiPropertyDescribe({
		description: "hidden identity",
		isAutoDtoEnabled: false,
		type: EApiPropertyDescribeType.UUID,
	})
	@PrimaryColumn({ type: "uuid" })
	public id!: string;
}

class GeneratedReadHiddenIdentityService extends ApiServiceBase<GeneratedReadHiddenIdentityEntity> {}

class ReadScopeGuardA {}

@Entity("generated_read_contract_entities")
class GeneratedReadContractEntity {
	@ApiPropertyDescribe({
		format: EApiPropertyDateType.DATE_TIME,
		identifier: EApiPropertyDateIdentifier.DATE,
		type: EApiPropertyDescribeType.DATE,
	})
	@Column({ type: "datetime" })
	public effectiveAt!: Date;

	@ApiPropertyDescribe({
		description: "id",
		type: EApiPropertyDescribeType.UUID,
	})
	@PrimaryColumn({ type: "uuid" })
	public id!: string;

	@ApiPropertyDescribe({
		description: "label",
		exampleValue: "label",
		format: EApiPropertyStringType.STRING,
		maxLength: 64,
		minLength: 1,
		pattern: "/^.+$/",
		properties: {
			[EApiRouteType.GET]: {
				[EApiDtoType.PARAMETERS]: {
					isEnabled: false,
				},
			},
		},
		type: EApiPropertyDescribeType.STRING,
	})
	@Column({ type: "varchar" })
	public label!: string;

	@ApiPropertyDescribe({
		description: "owner",
		type: EApiPropertyDescribeType.RELATION,
	} as never)
	@ManyToOne(() => GeneratedReadContractOwnerEntity)
	public owner?: GeneratedReadContractOwnerEntity;

	@ApiPropertyDescribe({
		description: "sequence",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		type: EApiPropertyDescribeType.NUMBER,
	})
	@Column({ type: "int" })
	public sequence!: number;

	@ApiPropertyDescribe({
		description: "internal sequence",
		exampleValue: 1,
		format: EApiPropertyNumberType.INTEGER,
		isAutoDtoEnabled: false,
		maximum: 100,
		minimum: 0,
		multipleOf: 1,
		properties: {
			[EApiRouteType.GET]: {
				[EApiDtoType.PARAMETERS]: { isEnabled: true },
			},
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.QUERY]: { isEnabled: true },
				[EApiDtoType.RESPONSE]: { isEnabled: true },
			},
		},
		type: EApiPropertyDescribeType.NUMBER,
	})
	@Column({ type: "int" })
	public internalSequence?: number;

	@ApiPropertyDescribe({
		description: "tenant id",
		properties: {
			[EApiRouteType.GET]: {
				[EApiDtoType.PARAMETERS]: {
					guard: {
						guards: ReadScopeGuardA as Type<IAuthGuard>,
					},
				},
			},
			[EApiRouteType.GET_LIST]: {
				[EApiDtoType.PARAMETERS]: {
					guard: {
						guards: ReadScopeGuardA as Type<IAuthGuard>,
					},
				},
			},
		},
		type: EApiPropertyDescribeType.UUID,
	})
	@Column({ type: "uuid" })
	public tenantId!: string;
}

class GeneratedReadContractService extends ApiServiceBase<GeneratedReadContractEntity> {
	public readonly repository: Repository<GeneratedReadContractEntity> = createTypeOrmRepositoryStub<GeneratedReadContractEntity>(
		{
			driver: {
				normalizeType: (column: { type?: unknown }): string => (column.type === "int" ? "integer" : String(column.type ?? "")),
				postgres: {
					types: {
						getTypeParser: (oid: number): ((value: string) => boolean | number | string) => {
							if (oid === 16) return (value: string): boolean => value === "t";
							if (oid === 21 || oid === 23) return (value: string): number => Number(value);

							return (value: string): string => value;
						},
					},
				},
			},
			options: { type: "postgres" },
			subscribers: [],
		},
		{
			afterLoadListeners: [],
			columns: [
				{ isArray: false, isNullable: false, isSelect: true, isVirtual: false, isVirtualProperty: false, length: "", precision: undefined, propertyPath: "id", scale: undefined, transformer: undefined, type: "uuid", unsigned: false },
				{ isArray: false, isNullable: false, isSelect: true, isVirtual: false, isVirtualProperty: false, length: "", precision: undefined, propertyPath: "sequence", scale: undefined, transformer: undefined, type: "int", unsigned: false },
			],
			primaryColumns: [{ propertyPath: "id" }],
			findColumnWithPropertyPath(this: { columns: Array<{ propertyPath: string }> }, path: string): unknown {
				return this.columns.find((column: { propertyPath: string }) => column.propertyPath === path);
			},
			findRelationWithPropertyPath: (): undefined => undefined,
			target: GeneratedReadContractEntity,
		},
	);

	public constructor() {
		super();
		ApiControllerGeneratedFunctionCapability.mark(this.get, EApiFunctionType.GET, GeneratedReadContractEntity);
		ApiControllerGeneratedFunctionCapability.mark(this.getList, EApiFunctionType.GET_LIST, GeneratedReadContractEntity);
		ApiControllerGeneratedFunctionCapability.mark(this.getMany, EApiFunctionType.GET_MANY, GeneratedReadContractEntity);
	}

	public override get = vi.fn(async (properties: TApiFunctionGetProperties<GeneratedReadContractEntity>): Promise<GeneratedReadContractEntity> => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET, properties);

		return {
			effectiveAt: new Date(EFFECTIVE_AT),
			id: ENTITY_ID,
			label: "entity",
			sequence: 1,
			tenantId: PATH_TENANT_ID,
		};
	});

	public override getList = vi.fn(async (properties: TApiFunctionGetListProperties<GeneratedReadContractEntity>): Promise<IApiGetListResponseResult<GeneratedReadContractEntity>> => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET_LIST, properties);

		return {
			count: 1,
			currentPage: 1,
			items: [
				{
					effectiveAt: new Date(EFFECTIVE_AT),
					id: ENTITY_ID,
					label: "entity",
					sequence: 1,
					tenantId: PATH_TENANT_ID,
				},
			],
			totalCount: 1,
			totalPages: 1,
		};
	});

	public override getMany = vi.fn(async (properties: TApiFunctionGetManyProperties<GeneratedReadContractEntity>): Promise<Array<GeneratedReadContractEntity>> => {
		ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET_MANY, properties);

		return [
			{
				effectiveAt: new Date(EFFECTIVE_AT),
				id: ENTITY_ID,
				label: "entity-a",
				sequence: 1,
				tenantId: PATH_TENANT_ID,
			},
			{
				effectiveAt: new Date(EFFECTIVE_AT),
				id: SECOND_ENTITY_ID,
				label: "entity-b",
				sequence: 2,
				tenantId: PATH_TENANT_ID,
			},
		];
	});
}

class ManualGeneratedReadParametersDto {}

let testControllerCount: number = 0;

/**
 * Gives a controller class created by a test helper its own name, because every decorated controller class needs its own schema prefix.
 * @param {T} target - Controller class created by a helper.
 * @returns {T} The same class with a numbered name.
 * @template T - Controller class type.
 */
function withUniqueControllerName<T extends object>(target: T): T {
	testControllerCount++;
	Object.defineProperty(target, "name", { value: `${(target as { name: string }).name}${String(testControllerCount)}` });

	return target;
}

class ReadScopeGuardB {}

const disabledRoute = { generation: { isEnabled: false } } as const;

/**
 *
 */
function compileGetListParametersWithoutPathScope(): void {
	class ParametersWithoutPathScopeControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		path: "parameters-without-path-scope",
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: disabledRoute,
			[EApiRouteType.GET_LIST]: {
				request: {
					[EApiControllerRequestTarget.PARAMETERS]: {
						validators: [],
					},
				},
			} as never,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(ParametersWithoutPathScopeControllerBase));
}

/**
 * Compiles a generated identity against a globally auto-DTO-hidden primary key.
 */
function compileHiddenIdentity(): void {
	class HiddenIdentityControllerBase {
		public readonly service: GeneratedReadHiddenIdentityService = new GeneratedReadHiddenIdentityService();
	}

	ApiController<GeneratedReadHiddenIdentityEntity>({
		entity: GeneratedReadHiddenIdentityEntity,
		path: "hidden-identity",
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: { identity: { parameter: "entityId" } },
			[EApiRouteType.GET_LIST]: disabledRoute,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(HiddenIdentityControllerBase));
}

/**
 * Compiles a GET_LIST query target against the generated-read fixture.
 * @param queryTarget Generated query configuration under test.
 * @returns Compiled controller type.
 */
function compileHiddenQueryConfiguration(queryTarget: unknown): object {
	class HiddenQueryControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	return ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		path: "hidden-query",
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: disabledRoute,
			[EApiRouteType.GET_LIST]: {
				request: {
					[EApiControllerRequestTarget.QUERY]: queryTarget,
				},
			} as never,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(HiddenQueryControllerBase));
}

/**
 *
 * @param identity
 */
function compileInvalidGetListIdentityConfiguration(identity: unknown): void {
	class InvalidGetListReadControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		path: "invalid-get-list-read",
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: disabledRoute,
			[EApiRouteType.GET_LIST]: { identity } as never,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(InvalidGetListReadControllerBase));
}

/**
 *
 * @param path
 * @param identity
 * @param hasManualParametersDto
 * @param pathScope
 */
function compileInvalidIdentityConfiguration(path: string, identity: unknown, hasManualParametersDto: boolean = false, pathScope?: unknown): void {
	class InvalidGeneratedIdentityControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		path,
		...(pathScope === undefined ? {} : { pathScope: pathScope as never }),
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: {
				...(hasManualParametersDto ? { dto: { [EApiDtoType.PARAMETERS]: ManualGeneratedReadParametersDto } } : {}),
				identity,
			} as never,
			[EApiRouteType.GET_LIST]: disabledRoute,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(InvalidGeneratedIdentityControllerBase));
}

/**
 *
 * @param defaultOrder
 * @param tieBreakers
 */
function compileInvalidOrder(defaultOrder: unknown, tieBreakers: unknown): void {
	class InvalidGeneratedOrderControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		path: "invalid-generated-order",
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: disabledRoute,
			[EApiRouteType.GET_LIST]: {
				request: {
					[EApiControllerRequestTarget.QUERY]: {
						order: {
							defaultOrder,
							fields: {
								label: { isEnabled: true },
							},
							tieBreakers,
							unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
						} as never,
					},
				},
			},
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(InvalidGeneratedOrderControllerBase));
}

/**
 *
 * @param path
 * @param pathScope
 * @param hasManualParametersDto
 * @param currentGuard
 */
function compileInvalidPathScopeConfiguration(path: string, pathScope: unknown, hasManualParametersDto: boolean = false, currentGuard?: Type<IAuthGuard>): void {
	class InvalidGeneratedReadControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		path,
		pathScope: pathScope as never,
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: {
				...(hasManualParametersDto ? { dto: { [EApiDtoType.PARAMETERS]: ManualGeneratedReadParametersDto } } : {}),
				...(currentGuard
					? {
							security: {
								authentication: {
									guard: currentGuard,
									type: EApiAuthenticationType.USER,
								},
							},
						}
					: {}),
			} as never,
			[EApiRouteType.GET_LIST]: disabledRoute,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(InvalidGeneratedReadControllerBase));
}

/**
 *
 * @param path
 * @param parameters
 */
function compileInvalidScopeParameters(path: string, parameters: unknown): void {
	compileInvalidPathScopeConfiguration(path, { parameters });
}

/**
 *
 * @param parameterValidator
 */
function createAliasedReadController(parameterValidator: (parameters: Partial<GeneratedReadContractEntity> | TApiControllerGetListQuery<GeneratedReadContractEntity>) => boolean | Promise<boolean>): { controller: IGeneratedReadContractController; type: object } {
	class AliasedReadControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	const Controller = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		path: "tenant/:tenantAlias/sequence/:sequenceAlias/aliased-read",
		pathScope: {
			parameters: [
				{ field: "tenantId", parameter: "tenantAlias" },
				{ field: "sequence", parameter: "sequenceAlias" },
			],
		},
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: {
				request: {
					[EApiControllerRequestTarget.PARAMETERS]: {
						transformers: [
							{
								key: "tenantAlias",
								type: EApiControllerRequestTransformerType.STATIC,
								value: PATH_TENANT_ID,
							},
						],
					},
				},
			},
			[EApiRouteType.GET_LIST]: {
				request: {
					[EApiControllerRequestTarget.PARAMETERS]: {
						transformers: [
							{
								key: "tenantAlias",
								type: EApiControllerRequestTransformerType.STATIC,
								value: PATH_TENANT_ID,
							},
						],
						validators: [
							{
								errorType: EErrorStringAction.BAD_REQUEST,
								exception: BadRequestException,
								validationFunction: parameterValidator,
							},
						],
					},
				},
			},
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(AliasedReadControllerBase));

	return {
		controller: new Controller() as unknown as IGeneratedReadContractController,
		type: Controller,
	};
}

/**
 *
 * @param scopeWhere
 * @param transform
 */
function createAuthenticationRequest(scopeWhere: Record<string, unknown>, transform?: (result: unknown) => Promise<unknown> | unknown): IApiAuthenticationRequest {
	return {
		authorizationDecision: {
			scope: { where: scopeWhere },
			transforms: transform ? [transform] : [],
		},
	} as unknown as IApiAuthenticationRequest;
}

/**
 *
 * @param controllerName
 */
function createCacheIsolationController(controllerName: string): object {
	class CacheIsolationControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	Object.defineProperty(CacheIsolationControllerBase, "name", { value: controllerName });

	return ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		path: "tenant/:tenantId/cache-isolation",
		pathScope: { parameters: [{ field: "tenantId", parameter: "tenantId" }] },
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: disabledRoute,
			[EApiRouteType.GET_LIST]: {},
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(CacheIsolationControllerBase);
}

/**
 *
 */
function createDateScopedReadController(): { controller: IGeneratedReadContractController; type: object } {
	class DateScopedReadControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	const Controller = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		path: "effective/:effectiveAt/date-scoped-read",
		pathScope: { parameters: [{ field: "effectiveAt", parameter: "effectiveAt" }] },
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: {},
			[EApiRouteType.GET_LIST]: disabledRoute,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(DateScopedReadControllerBase));

	return {
		controller: new Controller() as unknown as IGeneratedReadContractController,
		type: Controller,
	};
}

/**
 *
 */
function createFilterOnlyQueryController(): { controller: IGeneratedReadContractController; type: object } {
	class FilterOnlyQueryControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	const Controller = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		path: "tenant/:tenantId/filter-only-query",
		pathScope: { parameters: [{ field: "tenantId", parameter: "tenantId" }] },
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: disabledRoute,
			[EApiRouteType.GET_LIST]: {
				request: {
					[EApiControllerRequestTarget.QUERY]: {
						filter: {
							fields: {
								label: {
									allowedOperations: [EFilterOperation.EQ],
									isEnabled: true,
								},
							},
							unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
						},
					},
				},
			},
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(FilterOnlyQueryControllerBase));

	return {
		controller: new Controller() as unknown as IGeneratedReadContractController,
		type: Controller,
	};
}

/**
 *
 * @param options
 * @param options.responseDto
 * @param options.responseTransformer
 * @param options.responseTransformer.key
 * @param options.responseTransformer.value
 */
function createGeneratedCursorReadController(options?: { responseDto?: { itemType: Type<unknown> } | Type<unknown>; responseTransformer?: { key: "nextCursor" | "previousCursor"; value: string } }): { controller: IGeneratedCursorReadContractController; type: object } {
	class GeneratedCursorReadControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	const Controller = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		name: "GeneratedCursorReadContract",
		path: "tenant/:tenantId/generated-cursor-read-contract",
		pathScope: { parameters: [{ field: "tenantId", parameter: "tenantId" }] },
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: disabledRoute,
			[EApiRouteType.GET_LIST]: {
				dto: options?.responseDto === undefined ? undefined : { [EApiDtoType.RESPONSE]: options.responseDto },
				request: {
					[EApiControllerRequestTarget.QUERY]: {
						filter: {
							// A manual item DTO leaves out tenantId, and a column the list response hides is never filterable.
							fields: {
								tenantId: options?.responseDto === undefined ? { allowedOperations: [EFilterOperation.EQ], isEnabled: true } : { isEnabled: false },
							},
							unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
						},
						order: {
							defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "sequence" }],
							fields: { sequence: { isEnabled: true } },
							tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
							unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
						},
						pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
					},
				},
				response:
					options?.responseTransformer === undefined
						? undefined
						: {
								[EApiControllerResponseTarget.RESPONSE]: {
									transformers: [{ key: options.responseTransformer.key, type: EApiControllerRequestTransformerType.STATIC, value: options.responseTransformer.value }],
								},
							},
			},
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(GeneratedCursorReadControllerBase));

	return {
		controller: new Controller() as unknown as IGeneratedCursorReadContractController,
		type: Controller,
	};
}

/**
 *
 */
function createGeneratedReadController(): { controller: IGeneratedReadContractController; type: object } {
	class GeneratedReadControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	const Controller = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		name: "GeneratedReadContract",
		path: "tenant/:tenantId/generated-read-contract",
		pathScope: { parameters: [{ field: "tenantId", parameter: "tenantId" }] },
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: {},
			[EApiRouteType.GET_LIST]: {
				request: {
					[EApiControllerRequestTarget.QUERY]: {
						order: {
							defaultOrder: [
								{ direction: EFilterOrderDirection.DESC, field: "sequence" },
								{ direction: EFilterOrderDirection.ASC, field: "label" },
								{ direction: EFilterOrderDirection.ASC, field: "id" },
							],
							fields: {
								label: { isEnabled: true },
								sequence: { isEnabled: true },
							},
							tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
							unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
						},
					},
				},
			},
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(GeneratedReadControllerBase));

	return {
		controller: new Controller() as unknown as IGeneratedReadContractController,
		type: Controller,
	};
}

/**
 *
 * @param hasOwnerScope
 * @param identityParameter
 */
function createIdentityAliasController(hasOwnerScope: boolean = false, identityParameter: string = "gameId"): { controller: IGeneratedReadContractController; type: object } {
	class IdentityAliasControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	const Controller = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		name: "IdentityAliasGeneratedReadContract",
		path: hasOwnerScope ? "tenant/:tenantId/identity-alias" : "identity-alias",
		...(hasOwnerScope ? { pathScope: { parameters: [{ field: "tenantId", parameter: "tenantId" }] } } : {}),
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: {
				identity: { parameter: identityParameter },
			},
			[EApiRouteType.GET_LIST]: disabledRoute,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(IdentityAliasControllerBase));

	return {
		controller: new Controller() as unknown as IGeneratedReadContractController,
		type: Controller,
	};
}

/**
 *
 */
function createIdentityInheritanceControllers(): {
	aliased: { controller: IGeneratedReadContractController; type: object };
	canonicalDerived: { controller: IGeneratedReadContractController; type: object };
	differentAliasDerived: { controller: IGeneratedReadContractController; type: object };
} {
	class AliasedBaseControllerTarget {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	const AliasedController = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		name: "IdentityInheritanceAliasedBase",
		path: "identity-inheritance-aliased",
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: { identity: { parameter: "gameId" } },
			[EApiRouteType.GET_LIST]: disabledRoute,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(AliasedBaseControllerTarget));

	class CanonicalDerivedControllerTarget extends AliasedController {}

	Object.defineProperty(CanonicalDerivedControllerTarget.prototype, "get", {
		configurable: true,
		value: undefined,
		writable: true,
	});

	const CanonicalDerivedController = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		name: "IdentityInheritanceCanonicalDerived",
		path: "identity-inheritance-canonical",
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: {},
			[EApiRouteType.GET_LIST]: disabledRoute,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(CanonicalDerivedControllerTarget));

	class DifferentAliasDerivedControllerTarget extends AliasedController {}

	Object.defineProperty(DifferentAliasDerivedControllerTarget.prototype, "get", {
		configurable: true,
		value: undefined,
		writable: true,
	});

	const DifferentAliasDerivedController = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		name: "IdentityInheritanceDifferentAliasDerived",
		path: "identity-inheritance-different",
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: { identity: { parameter: "itemId" } },
			[EApiRouteType.GET_LIST]: disabledRoute,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(DifferentAliasDerivedControllerTarget));

	return {
		aliased: {
			controller: new AliasedController() as unknown as IGeneratedReadContractController,
			type: AliasedController,
		},
		canonicalDerived: {
			controller: new CanonicalDerivedController() as unknown as IGeneratedReadContractController,
			type: CanonicalDerivedController,
		},
		differentAliasDerived: {
			controller: new DifferentAliasDerivedController() as unknown as IGeneratedReadContractController,
			type: DifferentAliasDerivedController,
		},
	};
}

/**
 *
 */
function createLegacyGeneratedReadController(): { controller: ILegacyGeneratedReadContractController; type: object } {
	class LegacyGeneratedReadControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	const Controller = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		name: "LegacyGeneratedReadContract",
		path: "legacy-generated-read-contract",
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: {},
			[EApiRouteType.GET_LIST]: {},
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(LegacyGeneratedReadControllerBase));

	return {
		controller: new Controller() as unknown as ILegacyGeneratedReadContractController,
		type: Controller,
	};
}

/**
 *
 * @param path
 * @param routeConfig
 */
function createRawIdentityRouteController(path: string, routeConfig: unknown): { controller: IGeneratedReadContractController; type: object } {
	class RawIdentityRouteControllerBase {
		public readonly service: GeneratedReadContractService = new GeneratedReadContractService();
	}

	const Controller = ApiController<GeneratedReadContractEntity>({
		entity: GeneratedReadContractEntity,
		name: "RawIdentityRouteGeneratedReadContract",
		path,
		routes: {
			[EApiRouteType.CREATE]: disabledRoute,
			[EApiRouteType.DELETE]: disabledRoute,
			[EApiRouteType.GET]: routeConfig as never,
			[EApiRouteType.GET_LIST]: disabledRoute,
			[EApiRouteType.PARTIAL_UPDATE]: disabledRoute,
			[EApiRouteType.UPDATE]: disabledRoute,
		},
	})(withUniqueControllerName(RawIdentityRouteControllerBase));

	return {
		controller: new Controller() as unknown as IGeneratedReadContractController,
		type: Controller,
	};
}

describe("generated path scope contract", () => {
	it.each([
		[
			"a configured parameter missing from the controller path",
			"tenant/:tenantId/generated-read-contract",
			[
				{ field: "tenantId", parameter: "tenantId" },
				{ field: "label", parameter: "missingTenantId" },
			],
			"not declared by the controller path",
		],
		["an inherited owner parameter omitted from the mapping", "tenant/:tenantId/brand/:brandAccountId/generated-read-contract", [{ field: "tenantId", parameter: "tenantId" }], "is not bound to an entity field for the generated get route"],
		["a controller path parameter left unbound", "tenant/:tenantId/generated-read-contract/:id", [{ field: "tenantId", parameter: "tenantId" }], 'path parameter "id" is not bound to an entity field for the generated get route'],
		["a scope parameter named like the row path", "tenant/:id/generated-read-contract", [{ field: "tenantId", parameter: "id" }], 'path parameter "id" conflicts with the row path of the generated get route'],
		["a non-direct entity path", "tenant/:tenantId/generated-read-contract", [{ field: "owner.id", parameter: "tenantId" }], "described direct scalar entity field"],
		["a non-scalar entity field", "tenant/:tenantId/generated-read-contract", [{ field: "owner", parameter: "tenantId" }], "described direct scalar entity field"],
		[
			"duplicate parameter mappings",
			"tenant/:tenantId/generated-read-contract",
			[
				{ field: "tenantId", parameter: "tenantId" },
				{ field: "label", parameter: "tenantId" },
			],
			"bound more than once",
		],
		[
			"duplicate entity-field mappings",
			"tenant/:tenantId/brand/:brandAccountId/generated-read-contract",
			[
				{ field: "tenantId", parameter: "tenantId" },
				{ field: "tenantId", parameter: "brandAccountId" },
			],
			"bound more than once",
		],
		["a wildcard inherited path parameter", "tenant/:tenantId/files/*splat", [{ field: "tenantId", parameter: "tenantId" }], 'path parameter "splat" is a wildcard, which the generated get route cannot bind'],
		["an optional inherited path parameter", "tenant/:tenantId/items{/:optionalId}", [{ field: "tenantId", parameter: "tenantId" }], 'path parameter "optionalId" is optional, which the generated get route cannot bind'],
		["an unsafe inherited path parameter", "tenant/:constructor/generated-read-contract", [{ field: "tenantId", parameter: "constructor" }], "must declare a safe path parameter"],
		["an unsafe mapped entity field", "tenant/:tenantId/generated-read-contract", [{ field: "__proto__", parameter: "tenantId" }], 'parameter "tenantId" must bind a safe entity field'],
	])("rejects %s at controller bootstrap", (_label, path, parameters, expectedMessage) => {
		expect(() => {
			compileInvalidScopeParameters(path, parameters);
		}).toThrow(expectedMessage);
	});

	it("accepts a quoted required scalar inherited path parameter", () => {
		expect(() => {
			compileInvalidScopeParameters('tenant/:"tenant-id"/generated-read-contract', [{ field: "tenantId", parameter: "tenant-id" }]);
		}).not.toThrow();
	});

	it.each([
		["a null identity", null, "Generated identity configuration must be a plain object"],
		["a non-object identity", "gameId", "Generated identity configuration must be a plain object"],
		["an empty identity parameter", { parameter: "" }, "Generated identity parameter must be a safe simple identifier"],
		["a non-string identity parameter", { parameter: 1 }, "Generated identity parameter must be a safe simple identifier"],
		["an identity parameter with surrounding whitespace", { parameter: " gameId " }, "Generated identity parameter must be a safe simple identifier"],
		["an identity parameter containing a slash", { parameter: "game/id" }, "Generated identity parameter must be a safe simple identifier"],
		["an identity parameter containing a control character", { parameter: "game\nid" }, "Generated identity parameter must be a safe simple identifier"],
		["a non-identifier identity parameter", { parameter: "game-id" }, "Generated identity parameter must be a safe simple identifier"],
		["an unsupported identity key", { parameter: "gameId", unsupported: true }, "Generated identity configuration must contain exactly one string key: parameter"],
		["an unsafe identity parameter", { parameter: "constructor" }, "Generated identity parameter must be a safe simple identifier"],
	])("rejects %s at controller bootstrap", (_label, identity, expectedMessage) => {
		expect(() => {
			compileInvalidIdentityConfiguration("identity-alias", identity);
		}).toThrow(expectedMessage);
	});

	it("rejects a generated GET identity that collides with an inherited path parameter", () => {
		expect(() => {
			compileInvalidIdentityConfiguration("tenant/:gameId/identity-alias", { parameter: "gameId" }, false, {
				parameters: [{ field: "tenantId", parameter: "gameId" }],
			});
		}).toThrow('Generated identity parameter "gameId" conflicts with a controller path parameter');
	});

	it("rejects generated identity when the primary entity field is globally hidden from auto DTOs", () => {
		expect(() => compileHiddenIdentity()).toThrow("Generated identity requires a described direct scalar primary entity field");
	});

	it("rejects an inherited primary field when GET uses a different identity alias", () => {
		expect(() => {
			compileInvalidIdentityConfiguration("tenant/:id/identity-alias", { parameter: "gameId" }, false, {
				parameters: [{ field: "tenantId", parameter: "id" }],
			});
		}).toThrow('path parameter "id" conflicts with the row path of the generated get route');
	});

	it("requires pathScope whenever an identity route sits under controller path parameters", () => {
		expect(() => {
			compileInvalidIdentityConfiguration("tenant/:tenantId/identity-alias", { parameter: "gameId" });
		}).toThrow('path parameter "tenantId" is not bound to an entity field for the generated get route');
		expect(() => {
			compileInvalidIdentityConfiguration("tenant/:tenantId/identity-alias", { parameter: "gameId" }, false, {
				parameters: [{ field: "tenantId", parameter: "tenantId" }],
			});
		}).not.toThrow();
	});

	it("rejects generated identity grammar on GET_LIST", () => {
		expect(() => {
			compileInvalidGetListIdentityConfiguration({ parameter: "gameId" });
		}).toThrow("Generated identity configuration is supported only for GET routes");
	});

	it("accepts a null-prototype identity record", () => {
		const identity = Object.assign(Object.create(null) as Record<string, unknown>, { parameter: "gameId" });

		expect(() => {
			compileInvalidIdentityConfiguration("identity-alias", identity);
		}).not.toThrow();
	});

	it("rejects identity symbols, non-enumerable fields, accessors, and custom prototypes without invoking getters", () => {
		const symbolIdentity: Record<PropertyKey, unknown> = { parameter: "gameId" };
		const nonEnumerableIdentity: Record<string, unknown> = {};
		const getter = vi.fn((): string => "gameId");
		const accessorIdentity: Record<string, unknown> = {};
		const customPrototypeIdentity = Object.create({ inherited: true }) as Record<string, unknown>;

		symbolIdentity[Symbol("extra")] = true;
		Object.defineProperty(nonEnumerableIdentity, "parameter", { enumerable: false, value: "gameId" });
		Object.defineProperty(accessorIdentity, "parameter", { enumerable: true, get: getter });
		customPrototypeIdentity.parameter = "gameId";

		expect(() => {
			compileInvalidIdentityConfiguration("identity-alias", symbolIdentity);
		}).toThrow("Generated identity configuration must contain exactly one string key: parameter");
		expect(() => {
			compileInvalidIdentityConfiguration("identity-alias", nonEnumerableIdentity);
		}).toThrow("Generated identity parameter must be an enumerable data property");
		expect(() => {
			compileInvalidIdentityConfiguration("identity-alias", accessorIdentity);
		}).toThrow("Generated identity parameter must be an enumerable data property");
		expect(() => {
			compileInvalidIdentityConfiguration("identity-alias", customPrototypeIdentity);
		}).toThrow("Generated identity configuration must be a plain object");
		expect(getter).not.toHaveBeenCalled();
	});

	it("reads top-level identity only from an own enumerable data descriptor without invoking accessors", () => {
		const inheritedGetter = vi.fn((): { parameter: string } => ({ parameter: "inheritedGameId" }));
		const inheritedPrototype: Record<string, unknown> = {};
		const inheritedRoute = Object.create(inheritedPrototype) as Record<PropertyKey, unknown>;
		const nonEnumerableRoute: Record<string, unknown> = {};
		const accessorGetter = vi.fn((): { parameter: string } => ({ parameter: "accessorGameId" }));
		const accessorRoute: Record<string, unknown> = {};
		const symbolRoute: Record<PropertyKey, unknown> = { identity: { parameter: "gameId" } };
		const customPrototypeRoute = Object.create({ custom: true }) as Record<string, unknown>;
		const nullPrototypeRoute = Object.assign(Object.create(null) as Record<string, unknown>, { identity: { parameter: "gameId" } });

		Object.defineProperty(inheritedPrototype, "identity", { enumerable: true, get: inheritedGetter });
		Object.defineProperty(nonEnumerableRoute, "identity", { enumerable: false, value: { parameter: "gameId" } });
		Object.defineProperty(accessorRoute, "identity", { enumerable: true, get: accessorGetter });
		symbolRoute[Symbol("extra")] = true;
		customPrototypeRoute.identity = { parameter: "gameId" };

		const nullPrototypeController = createRawIdentityRouteController("null-prototype-identity-route", nullPrototypeRoute).type as { prototype: { get: object } };

		expect(Reflect.getMetadata(PATH_METADATA, nullPrototypeController.prototype.get)).toBe(":gameId");
		expect(() => createRawIdentityRouteController("inherited-identity-route", inheritedRoute)).toThrow("Generated identity must be an own property on the route configuration");
		expect(() => createRawIdentityRouteController("non-enumerable-identity-route", nonEnumerableRoute)).toThrow("Generated identity must be an enumerable data property on the route configuration");
		expect(() => createRawIdentityRouteController("accessor-identity-route", accessorRoute)).toThrow("Generated identity must be an enumerable data property on the route configuration");
		expect(() => createRawIdentityRouteController("symbol-identity-route", symbolRoute)).toThrow("Generated identity route configuration must not contain symbol keys");
		expect(() => createRawIdentityRouteController("custom-prototype-identity-route", customPrototypeRoute)).toThrow("Generated identity route configuration must be a plain object");
		expect(inheritedGetter).not.toHaveBeenCalled();
		expect(accessorGetter).not.toHaveBeenCalled();
	});

	it("does not treat an own undefined top-level identity descriptor as absent", () => {
		expect(() => createRawIdentityRouteController("undefined-identity-route", { identity: undefined })).toThrow("Generated identity configuration must be a plain object");
	});

	it("fails closed when legacy low-level controller facades receive an uncompiled identity", () => {
		const entityMetadata = GenerateEntityInformation(GeneratedReadContractEntity);
		const routeConfig = { identity: { parameter: "gameId" } } as never;

		const properties = {
			entity: GeneratedReadContractEntity,
			routes: { [EApiRouteType.GET]: routeConfig },
		} as never;

		class LowLevelIdentityController {}

		const handler = function get() {};

		const invocations: Array<() => unknown> = [
			() => {
				ApiControllerApplyDecorators(handler as never, entityMetadata, properties, EApiRouteType.GET, "get", routeConfig, [], "TestController");
			},
			() => {
				ApiControllerApplyMetadata(LowLevelIdentityController, LowLevelIdentityController.prototype, entityMetadata, properties, EApiRouteType.GET, "get", routeConfig);
			},
			() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET, EApiDtoType.PARAMETERS, routeConfig, "TestController"),
			() => {
				ApiControllerWriteDtoSwagger(LowLevelIdentityController, entityMetadata, properties, EApiRouteType.GET, routeConfig, entityMetadata);
			},
		];

		for (const invoke of invocations) {
			expect(invoke).toThrow("Generated identity configuration requires compilation by the @ApiController factory");
		}
	});

	it.each([
		["a null configuration", null, "pathScope must be a plain object"],
		["a false configuration", false, "pathScope must be a plain object"],
		["a zero configuration", 0, "pathScope must be a plain object"],
		["an empty-string configuration", "", "pathScope must be a plain object"],
		["an empty configuration", {}, "pathScope must contain exactly parameters"],
		["an empty mapping array", { parameters: [] }, "pathScope parameters must be a non-empty array"],
		["a non-array mapping", { parameters: {} }, "pathScope parameters must be a non-empty array"],
		["an unsupported key", { parameters: [{ field: "tenantId", parameter: "tenantId" }], unsupported: true }, "pathScope must contain exactly parameters"],
	])("rejects %s in pathScope grammar", (_label, pathScope, expectedMessage) => {
		expect(() => {
			compileInvalidPathScopeConfiguration("tenant/:tenantId/generated-read-contract", pathScope);
		}).toThrow(expectedMessage);
	});

	it("rejects hostile nested pathScope records and arrays without invoking accessors", () => {
		const parametersGetter = vi.fn(() => [{ field: "tenantId", parameter: "tenantId" }]);
		const parametersAccessor: Record<string, unknown> = {};
		const mappingGetter = vi.fn(() => "tenantId");
		const accessorMapping: Record<string, unknown> = { field: "tenantId" };
		const accessorArray: Array<unknown> = [{ field: "tenantId", parameter: "tenantId" }];
		const arrayGetter = vi.fn(() => ({ field: "tenantId", parameter: "tenantId" }));
		const sparseArray: Array<unknown> = new Array<unknown>(1);
		const extendedArray = [{ field: "tenantId", parameter: "tenantId" }] as { extra?: boolean } & Array<unknown>;
		const customPrototype = Object.create({ inherited: true }) as Record<string, unknown>;

		Object.defineProperty(parametersAccessor, "parameters", { enumerable: true, get: parametersGetter });
		Object.defineProperty(accessorMapping, "parameter", { enumerable: true, get: mappingGetter });
		Object.defineProperty(accessorArray, "0", { enumerable: true, get: arrayGetter });
		extendedArray.extra = true;
		customPrototype.parameters = [{ field: "tenantId", parameter: "tenantId" }];

		expect(() => {
			compileInvalidPathScopeConfiguration("tenant/:tenantId/generated-read-contract", parametersAccessor);
		}).toThrow('pathScope property "parameters" must be an enumerable data property');
		expect(() => {
			compileInvalidScopeParameters("tenant/:tenantId/generated-read-contract", [accessorMapping]);
		}).toThrow('pathScope parameters[0] property "parameter" must be an enumerable data property');
		expect(() => {
			compileInvalidScopeParameters("tenant/:tenantId/generated-read-contract", accessorArray);
		}).toThrow('pathScope parameters property "0" must be an enumerable data property');
		expect(() => {
			compileInvalidScopeParameters("tenant/:tenantId/generated-read-contract", sparseArray);
		}).toThrow("pathScope parameters must be a dense array of data properties");
		expect(() => {
			compileInvalidScopeParameters("tenant/:tenantId/generated-read-contract", extendedArray);
		}).toThrow("pathScope parameters must be a dense array of data properties");
		expect(() => {
			compileInvalidPathScopeConfiguration("tenant/:tenantId/generated-read-contract", customPrototype);
		}).toThrow("pathScope must be a plain object");
		expect(parametersGetter).not.toHaveBeenCalled();
		expect(mappingGetter).not.toHaveBeenCalled();
		expect(arrayGetter).not.toHaveBeenCalled();
	});

	it("accepts a null-prototype pathScope record", () => {
		const pathScope = Object.assign(Object.create(null) as Record<string, unknown>, { parameters: [{ field: "tenantId", parameter: "tenantId" }] });

		expect(() => {
			compileInvalidPathScopeConfiguration("tenant/:tenantId/generated-read-contract", pathScope);
		}).not.toThrow();
	});

	it("fails closed when legacy low-level controller facades receive an uncompiled pathScope", () => {
		const entityMetadata = GenerateEntityInformation(GeneratedReadContractEntity);
		const routeConfig = {} as never;

		const properties = {
			entity: GeneratedReadContractEntity,
			pathScope: { parameters: [{ field: "tenantId", parameter: "tenantId" }] },
			routes: { [EApiRouteType.GET]: routeConfig },
		} as never;

		class LowLevelReadController {}

		const handler = function get() {};

		const invocations: Array<() => unknown> = [
			() => {
				ApiControllerApplyDecorators(handler as never, entityMetadata, properties, EApiRouteType.GET, "get", routeConfig, [], "TestController");
			},
			() => {
				ApiControllerApplyMetadata(LowLevelReadController, LowLevelReadController.prototype, entityMetadata, properties, EApiRouteType.GET, "get", routeConfig);
			},
			() => ApiControllerGetDto(properties, entityMetadata, EApiRouteType.GET, EApiDtoType.PARAMETERS, routeConfig, "TestController"),
			() => {
				ApiControllerWriteDtoSwagger(LowLevelReadController, entityMetadata, properties, EApiRouteType.GET, routeConfig, entityMetadata);
			},
		];

		for (const invoke of invocations) {
			expect(invoke).toThrow("Controller pathScope and rowPath require compilation by the @ApiController factory");
		}
	});

	it("rejects pathScope combined with a manual PARAMETERS DTO", () => {
		expect(() => {
			compileInvalidPathScopeConfiguration("tenant/:tenantId/generated-read-contract", { parameters: [{ field: "tenantId", parameter: "tenantId" }] }, true);
		}).toThrow("pathScope and rowPath cannot be combined with a manual PARAMETERS DTO on the generated get route");
	});

	it("rejects generated identity combined with a manual PARAMETERS DTO", () => {
		expect(() => {
			compileInvalidIdentityConfiguration("identity-alias", { parameter: "gameId" }, true);
		}).toThrow("Generated identity cannot be combined with a manual PARAMETERS DTO");
	});

	it.each([
		["hidden by the route guard", "tenant/:tenantId/generated-read-contract", [{ field: "tenantId", parameter: "tenantId" }], ReadScopeGuardB as Type<IAuthGuard>],
		["explicitly disabled", "label/:label/generated-read-contract", [{ field: "label", parameter: "label" }], undefined],
	])("rejects a mapped PARAMETERS field that is %s", (_label, path, parameters, currentGuard) => {
		expect(() => {
			compileInvalidPathScopeConfiguration(path, { parameters }, false, currentGuard);
		}).toThrow("is unavailable for the PARAMETERS DTO of the generated get route");
	});

	it("rejects a bound field globally hidden from auto DTOs despite a local PARAMETERS enable", () => {
		expect(() => {
			compileInvalidPathScopeConfiguration("internal/:internalSequence/generated-read-contract", {
				parameters: [{ field: "internalSequence", parameter: "internalSequence" }],
			});
		}).toThrow('path field "internalSequence" must be a described direct scalar entity field');
	});

	it("rejects GET_LIST PARAMETERS request configuration without pathScope", () => {
		expect(() => {
			compileGetListParametersWithoutPathScope();
		}).toThrow("generated getList route configures request PARAMETERS, which requires pathScope");
	});

	it.each([
		[
			"duplicate default-order fields",
			[
				{ direction: EFilterOrderDirection.ASC, field: "id" },
				{ direction: EFilterOrderDirection.ASC, field: "id" },
			],
			[],
			'GET_LIST order defaultOrder contains duplicate field "id"',
		],
		[
			"duplicate tie-breaker fields",
			[],
			[
				{ direction: EFilterOrderDirection.ASC, field: "id" },
				{ direction: EFilterOrderDirection.ASC, field: "id" },
			],
			'GET_LIST order tieBreakers contains duplicate field "id"',
		],
		["conflicting directions across defaults and tie-breakers", [{ direction: EFilterOrderDirection.ASC, field: "id" }], [{ direction: EFilterOrderDirection.DESC, field: "id" }], 'GET_LIST order field "id" has conflicting directions across defaultOrder and tieBreakers'],
		["an unknown server-order field", [{ direction: EFilterOrderDirection.ASC, field: "missing" }], [], "must target a described direct scalar entity field"],
		["a relation-valued server-order field", [{ direction: EFilterOrderDirection.ASC, field: "owner" }], [], "must target a described direct scalar entity field"],
		["an invalid server-order direction", [{ direction: "sideways", field: "id" }], [], "has an invalid direction"],
		["a non-array default order", { direction: EFilterOrderDirection.ASC, field: "id" }, [], "GET_LIST order defaultOrder must be an array"],
		["an unsupported server-order entry key", [{ direction: EFilterOrderDirection.ASC, field: "id", unsupported: true }], [], "GET_LIST order defaultOrder[0] must contain exactly direction, field"],
	])("rejects %s at controller bootstrap", (_label, defaultOrder, tieBreakers, expectedMessage) => {
		expect(() => {
			compileInvalidOrder(defaultOrder, tieBreakers);
		}).toThrow(expectedMessage);
	});

	it("rejects globally hidden fields explicitly enabled for typed client filters and ordering", () => {
		expect(() =>
			compileHiddenQueryConfiguration({
				filter: {
					fields: {
						internalSequence: { allowedOperations: [EFilterOperation.EQ], isEnabled: true },
					},
					unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
				},
			}),
		).toThrow('GET_LIST filter field "internalSequence" is not an enabled direct scalar or one-hop to-one scalar path');

		expect(() =>
			compileHiddenQueryConfiguration({
				order: {
					fields: { internalSequence: { isEnabled: true } },
					unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
				},
			}),
		).toThrow('GET_LIST order field "internalSequence" is not orderable: it sets isAutoDtoEnabled: false');
	});

	it("allows a globally hidden field only as PAGE server ordering evidence", () => {
		const Controller = compileHiddenQueryConfiguration({
			order: {
				defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "internalSequence" }],
				fields: {},
				tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
				unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
			},
		}) as { prototype: object };
		const plan = ApiControllerGetListQueryPlanGet(Controller.prototype, "getList");

		expect(plan?.order.defaultOrder).toEqual([{ direction: EFilterOrderDirection.ASC, field: "internalSequence" }]);
		expect(plan?.order.tieBreakers).toEqual([{ direction: EFilterOrderDirection.ASC, field: "id" }]);
		expect(plan?.order.fields).not.toHaveProperty("internalSequence");
	});

	it("rejects a globally hidden CURSOR order field even when locally response-enabled", () => {
		expect(() =>
			compileHiddenQueryConfiguration({
				order: {
					defaultOrder: [{ direction: EFilterOrderDirection.ASC, field: "internalSequence" }],
					fields: {},
					tieBreakers: [{ direction: EFilterOrderDirection.ASC, field: "id" }],
					unlistedFields: EApiControllerGetListQueryUnlistedFields.REJECT,
				},
				pagination: { mode: EApiControllerGetListQueryPaginationMode.CURSOR },
			}),
		).toThrow('CURSOR GET_LIST order field "internalSequence" must be unconditionally raw-exposed in the generated response');
	});

	it("generates and registers owner PARAMETERS DTOs for GET and GET_LIST", () => {
		const { type } = createGeneratedReadController();
		const controllerType = type as { prototype: object };
		const getTypes = Reflect.getMetadata(PARAMTYPES_METADATA, controllerType.prototype, "get") as Array<new () => Record<string, unknown>>;
		const listTypes = Reflect.getMetadata(PARAMTYPES_METADATA, controllerType.prototype, "getList") as Array<new () => Record<string, unknown>>;
		const getParametersDto = getTypes[0];
		const listParametersDto = listTypes[0];

		expect(getTypes).toHaveLength(4);
		expect(listTypes).toHaveLength(5);
		expect(getParametersDto).toBeDefined();
		expect(listParametersDto).toBeDefined();
		expect(Object.keys(new (getParametersDto as new () => Record<string, unknown>)())).toEqual(expect.arrayContaining(["id", "tenantId"]));
		expect(Object.keys(new (listParametersDto as new () => Record<string, unknown>)())).toEqual(["tenantId"]);
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, getParametersDto?.prototype, "tenantId")).toMatchObject({ format: "uuid", type: "string" });
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, listParametersDto?.prototype, "tenantId")).toMatchObject({ format: "uuid", type: "string" });

		const extraModelNames = ((Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.EXTRA_MODELS, type) ?? []) as Array<{ name?: string }>).map(({ name }: { name?: string }): string | undefined => name);

		expect(extraModelNames).toEqual(expect.arrayContaining([getParametersDto?.name, listParametersDto?.name]));
	});

	it("generates a validated GET identity alias and maps it to the primary entity field", async () => {
		const { controller, type } = createIdentityAliasController();
		const controllerType = type as { prototype: { get: object } };
		const getTypes = Reflect.getMetadata(PARAMTYPES_METADATA, controllerType.prototype, "get") as Array<new () => Record<string, unknown>>;
		const parametersDto = getTypes[0];

		expect(Reflect.getMetadata(PATH_METADATA, controllerType.prototype.get)).toBe(":gameId");
		expect(ApiControllerPathPlanGet(controllerType.prototype, "get")?.scopeParameters).toEqual([]);
		expect(ApiControllerIdentityPlanGet(controllerType.prototype.get)).toMatchObject({ field: "id", parameter: "gameId" });
		expect(parametersDto).toBeDefined();
		expect(Object.keys(new (parametersDto as new () => Record<string, unknown>)())).toEqual(["gameId"]);
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, parametersDto?.prototype, "gameId")).toMatchObject({ format: "uuid", type: "string" });

		const parameters = plainToInstance(parametersDto as new () => Record<string, unknown>, { gameId: ENTITY_ID });
		const invalidParameters = plainToInstance(parametersDto as new () => Record<string, unknown>, { gameId: "not-a-uuid" });

		expect(await validate(parameters)).toHaveLength(0);
		expect((await validate(invalidParameters)).length).toBeGreaterThan(0);

		await controller.get(parameters, {}, "127.0.0.1");

		expect(controller.service.get).toHaveBeenCalledWith({
			relationLoadStrategy: undefined,
			relations: undefined,
			where: { id: ENTITY_ID },
		});
	});

	it("binds identity plans to exact generated handlers across controller inheritance", async () => {
		const controllers = createIdentityInheritanceControllers();

		const cases: Array<{
			controller: IGeneratedReadContractController;
			parameter: string;
			planParameter?: string;
			type: object;
		}> = [
			{ ...controllers.aliased, parameter: "gameId", planParameter: "gameId" },
			{ ...controllers.canonicalDerived, parameter: "id" },
			{ ...controllers.differentAliasDerived, parameter: "itemId", planParameter: "itemId" },
		];

		for (const { controller, parameter, planParameter, type } of cases) {
			const controllerType = type as { prototype: { get: object } };
			const handler = controllerType.prototype.get;
			const parameterTypes = Reflect.getMetadata(PARAMTYPES_METADATA, controllerType.prototype, "get") as Array<new () => Record<string, unknown>>;
			const parametersDto = parameterTypes[0];

			expect(Reflect.getMetadata(PATH_METADATA, handler)).toBe(`:${parameter}`);
			expect(Object.keys(new (parametersDto as new () => Record<string, unknown>)())).toEqual([parameter]);
			expect(ApiControllerIdentityPlanGet(handler)?.parameter).toBe(planParameter);

			await controller.get({ [parameter]: ENTITY_ID }, {}, "127.0.0.1");

			expect(controller.service.get).toHaveBeenCalledWith({
				relationLoadStrategy: undefined,
				relations: undefined,
				where: { id: ENTITY_ID },
			});
		}
	});

	it("AND-merges an aliased GET identity with inherited owner and IAM scopes", async () => {
		const { controller, type } = createIdentityAliasController(true);
		const controllerType = type as { prototype: { get: object } };
		const parametersDto = (Reflect.getMetadata(PARAMTYPES_METADATA, controllerType.prototype, "get") as Array<new () => Record<string, unknown>>)[0];

		const parameters = plainToInstance(parametersDto as new () => Record<string, unknown>, {
			gameId: ENTITY_ID,
			tenantId: PATH_TENANT_ID,
		});

		expect(Object.keys(parameters)).toEqual(["tenantId", "gameId"]);
		expect(await validate(parameters)).toHaveLength(0);

		await controller.get(parameters, {}, "127.0.0.1", createAuthenticationRequest({ id: Equal(ENTITY_ID), tenantId: Equal(SCOPE_TENANT_ID) }));

		const where = controller.service.get.mock.calls[0]?.[0].where as Record<string, unknown>;

		expect(where.id).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: ENTITY_ID },
				{ _type: "equal", _value: ENTITY_ID },
			],
		});
		expect(where.tenantId).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: PATH_TENANT_ID },
				{ _type: "equal", _value: SCOPE_TENANT_ID },
			],
		});
	});

	it("requires an aliased GET identity to be an own request property before service I/O", async () => {
		const { controller } = createIdentityAliasController();
		const inheritedIdentity = Object.create({ gameId: ENTITY_ID }) as Record<string, unknown>;

		await expect(controller.get(inheritedIdentity, {}, "127.0.0.1")).rejects.toMatchObject({ response: { error: "Bad Request", message: expect.arrayContaining([expect.stringContaining("gameId")]), statusCode: 400 } });
		await expect(controller.get({ gameId: null }, {}, "127.0.0.1")).rejects.toMatchObject({ response: { error: "Bad Request", message: expect.arrayContaining([expect.stringContaining("gameId")]), statusCode: 400 } });
		expect(controller.service.get).not.toHaveBeenCalled();
	});

	it("shares one path plan between the generated routes of a controller", () => {
		const { type } = createGeneratedReadController();
		const controllerType = type as { prototype: object };
		const getPlan = ApiControllerPathPlanGet(controllerType.prototype, "get");

		expect(getPlan).toBe(ApiControllerPathPlanGet(controllerType.prototype, "getList"));
		expect(getPlan?.scopeParameters).toEqual([{ field: "tenantId", parameter: "tenantId" }]);
		expect(getPlan?.rowParameters).toEqual([{ field: "id", parameter: "id" }]);
	});

	it("writes GET_LIST ROUTE_ARGS in PARAM, QUERY, HEADERS, IP, REQUEST order", () => {
		const { type } = createGeneratedReadController();
		const controllerType = type as { prototype: object };
		const routeArguments = Reflect.getMetadata(ROUTE_ARGS_METADATA, type, "getList") as Record<string, unknown>;
		const parameterTypes = Reflect.getMetadata(PARAMTYPES_METADATA, controllerType.prototype, "getList") as Array<unknown>;

		expect(Object.keys(routeArguments)).toEqual([`${RouteParamtypes.PARAM}:0`, `${RouteParamtypes.QUERY}:1`, `${RouteParamtypes.HEADERS}:2`, `${RouteParamtypes.IP}:3`, `${RouteParamtypes.REQUEST}:4`]);
		expect(parameterTypes).toHaveLength(5);
		expect(parameterTypes.slice(2)).toEqual([Object, Object, Object]);
	});

	it("transforms and validates aliased UUID and numeric PARAMETERS before applying read scope", async () => {
		const parameterValidator = vi.fn((parameters: unknown): boolean => {
			const record = parameters as Record<string, unknown>;

			return record.tenantAlias === PATH_TENANT_ID && record.sequenceAlias === 7;
		});
		const { controller, type } = createAliasedReadController(parameterValidator);
		const controllerType = type as { prototype: object };
		const listTypes = Reflect.getMetadata(PARAMTYPES_METADATA, controllerType.prototype, "getList") as Array<new () => Record<string, unknown>>;
		const parametersDto = listTypes[0];

		expect(parametersDto).toBeDefined();

		const parameters = plainToInstance(parametersDto as new () => Record<string, unknown>, {
			sequenceAlias: "7",
			tenantAlias: QUERY_TENANT_ID,
		});

		const invalidParameters = plainToInstance(parametersDto as new () => Record<string, unknown>, {
			sequenceAlias: "not-a-number",
			tenantAlias: "not-a-uuid",
		});

		expect(parameters.sequenceAlias).toBe(7);
		expect(parameters.tenantAlias).toBe(QUERY_TENANT_ID);
		expect(await validate(parameters)).toHaveLength(0);
		expect((await validate(invalidParameters)).length).toBeGreaterThan(0);

		await controller.getList(parameters, { limit: 10, page: 1 }, {}, "127.0.0.1");

		expect(parameterValidator).toHaveBeenCalledOnce();
		expect(parameters.tenantAlias).toBe(QUERY_TENANT_ID);
		const where = controller.service.getList.mock.calls[0]?.[0].where as Record<string, unknown>;

		expect(where.sequence).toMatchObject({ _type: "equal", _value: 7 });
		expect(where.tenantId).toMatchObject({ _type: "equal", _value: PATH_TENANT_ID });
	});

	it("applies configured-read alias transformers to generated GET scope", async () => {
		const parameterValidator = vi.fn((): boolean => true);
		const { controller } = createAliasedReadController(parameterValidator);

		const parameters: Record<string, unknown> = {
			id: ENTITY_ID,
			sequenceAlias: 7,
			tenantAlias: QUERY_TENANT_ID,
		};

		await controller.get(parameters, {}, "127.0.0.1");

		// The route transforms its own typed copy of the path values, never the object Nest passed in.
		expect(parameters.tenantAlias).toBe(QUERY_TENANT_ID);
		const where = controller.service.get.mock.calls[0]?.[0].where as Record<string, unknown>;

		expect(where).toEqual({ id: ENTITY_ID, sequence: 7, tenantId: PATH_TENANT_ID });
	});

	it("ANDs generated Date scope with IAM Equal(Date) without allowing conflicts", async () => {
		const { controller, type } = createDateScopedReadController();
		const controllerType = type as { prototype: object };
		const getTypes = Reflect.getMetadata(PARAMTYPES_METADATA, controllerType.prototype, "get") as Array<new () => Record<string, unknown>>;
		const parametersDto = getTypes[0];

		const parameters = plainToInstance(parametersDto as new () => Record<string, unknown>, {
			effectiveAt: EFFECTIVE_AT,
			id: ENTITY_ID,
		});

		expect(parameters.effectiveAt).toBeInstanceOf(Date);
		expect(await validate(parameters)).toHaveLength(0);

		await controller.get(parameters, {}, "127.0.0.1", createAuthenticationRequest({ effectiveAt: Equal(new Date(EFFECTIVE_AT)) }));

		const equalWhere = controller.service.get.mock.calls[0]?.[0].where as Record<string, unknown>;

		expect(equalWhere.id).toMatchObject({ _type: "equal", _value: ENTITY_ID });
		expect(equalWhere.effectiveAt).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: new Date(EFFECTIVE_AT) },
				{ _type: "equal", _value: new Date(EFFECTIVE_AT) },
			],
		});

		controller.service.get.mockClear();
		await controller.get(parameters, {}, "127.0.0.1", createAuthenticationRequest({ effectiveAt: Equal(new Date("2026-08-20T10:00:00.000Z")) }));

		const conflictingWhere = controller.service.get.mock.calls[0]?.[0].where as Record<string, unknown>;

		expect(conflictingWhere.id).toMatchObject({ _type: "equal", _value: ENTITY_ID });
		expect(conflictingWhere.effectiveAt).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: new Date(EFFECTIVE_AT) },
				{ _type: "equal", _value: new Date("2026-08-20T10:00:00.000Z") },
			],
		});
	});

	it("requires hostile inherited parameter names to be own properties at runtime", () => {
		expect(() => ApiControllerPathWhere({}, [{ field: "tenantId", parameter: "constructor" }])).toThrow(expect.objectContaining({ response: { error: "Bad Request", message: ["constructor should not be null or undefined"], statusCode: 400 } }));
	});

	it("rejects a null inherited parameter as class-validator's isDefined does", () => {
		expect(() => ApiControllerPathWhere({ tenantId: null } as never, [{ field: "tenantId", parameter: "tenantId" }])).toThrow(expect.objectContaining({ response: { error: "Bad Request", message: ["tenantId should not be null or undefined"], statusCode: 400 } }));
	});

	it("isolates generated PARAMETERS DTO cache entries by controller name", () => {
		const firstType = createCacheIsolationController("ReadCacheIsolationAlpha") as { prototype: object };
		const secondType = createCacheIsolationController("ReadCacheIsolationBeta") as { prototype: object };
		const firstParametersDto = (Reflect.getMetadata(PARAMTYPES_METADATA, firstType.prototype, "getList") as Array<new () => Record<string, unknown>>)[0];
		const secondParametersDto = (Reflect.getMetadata(PARAMTYPES_METADATA, secondType.prototype, "getList") as Array<new () => Record<string, unknown>>)[0];

		expect(firstParametersDto).toBeDefined();
		expect(secondParametersDto).toBeDefined();
		expect(firstParametersDto).not.toBe(secondParametersDto);
		expect(firstParametersDto?.name).toContain("ReadCacheIsolationAlpha");
		expect(secondParametersDto?.name).toContain("ReadCacheIsolationBeta");
		expect(Object.keys(new (firstParametersDto as new () => Record<string, unknown>)())).toEqual(["tenantId"]);
		expect(Object.keys(new (secondParametersDto as new () => Record<string, unknown>)())).toEqual(["tenantId"]);
	});

	it("isolates generated PARAMETERS DTO decorators by route guard", () => {
		const entityMetadata = GenerateEntityInformation<GeneratedReadContractEntity>(GeneratedReadContractEntity);

		const scopeParameters = Object.freeze([Object.freeze({ field: "tenantId", parameter: "tenantAlias" })]);
		const pathPlan: IApiControllerPathPlan = Object.freeze({
			controllerName: "GuardSensitiveReadController",
			isDefaultRowPath: false,
			isKeyCovered: true,
			isRowPathDeclared: false,
			primaryFields: Object.freeze(["id"]),
			rowParameters: Object.freeze([]),
			scopeParameters,
			signature: "guard-sensitive-path-plan",
		});
		const dtoConfig = {};
		const allowedDto = DtoGeneratePathParameters(entityMetadata, EApiRouteType.GET_LIST, pathPlan, scopeParameters, "GuardSensitiveRead", dtoConfig, ReadScopeGuardA as Type<IAuthGuard>);
		const cachedAllowedDto = DtoGeneratePathParameters(entityMetadata, EApiRouteType.GET_LIST, pathPlan, scopeParameters, "GuardSensitiveRead", dtoConfig, ReadScopeGuardA as Type<IAuthGuard>);
		const deniedDto = DtoGeneratePathParameters(entityMetadata, EApiRouteType.GET_LIST, pathPlan, scopeParameters, "GuardSensitiveDeniedRead", dtoConfig, ReadScopeGuardB as Type<IAuthGuard>);

		expect(cachedAllowedDto).toBe(allowedDto);
		expect(deniedDto).not.toBe(allowedDto);
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, allowedDto.prototype, "tenantAlias")).toMatchObject({ format: "uuid", type: "string" });
		expect(Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, deniedDto.prototype, "tenantAlias")).toBeUndefined();
	});

	it("preserves the exact legacy order shape for a filter-only query plan", async () => {
		const { controller, type } = createFilterOnlyQueryController();
		const controllerType = type as { prototype: object };
		const plan = ApiControllerGetListQueryPlanGet(controllerType.prototype, "getList");

		expect(plan).toBeDefined();
		expect(plan?.order.isLegacy).toBe(true);
		expect(Object.hasOwn(plan?.order ?? {}, "defaultOrder")).toBe(false);
		expect(Object.hasOwn(plan?.order ?? {}, "tieBreakers")).toBe(false);

		if (!plan) {
			throw new Error("Expected generated GET_LIST query plan");
		}

		const runtime = ApiControllerGetListQueryRuntime.parse({ limit: 10, page: 1 }, plan);

		expect(Object.hasOwn(runtime, "order")).toBe(false);

		await controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 10, page: 1 }, {}, "127.0.0.1");

		const request = controller.service.getList.mock.calls[0]?.[0];

		expect(Object.hasOwn(request ?? {}, "order")).toBe(false);
	});

	it("AND-merges owner scope with IAM for GET and fails closed on collision", async () => {
		const { controller } = createGeneratedReadController();

		await controller.get({ id: ENTITY_ID, tenantId: PATH_TENANT_ID }, {}, "127.0.0.1", createAuthenticationRequest({ tenantId: SCOPE_TENANT_ID }));

		const request = controller.service.get.mock.calls[0]?.[0];
		const where = request?.where as Record<string, unknown>;

		expect(where.id).toMatchObject({ _type: "equal", _value: ENTITY_ID });
		expect(where.tenantId).toMatchObject({ _type: "in", _value: [] });

		await controller.get({ id: ENTITY_ID, tenantId: PATH_TENANT_ID }, {}, "127.0.0.1", createAuthenticationRequest({ tenantId: PATH_TENANT_ID }));

		expect(controller.service.get.mock.calls[1]?.[0].where).toMatchObject({ id: { _type: "equal", _value: ENTITY_ID }, tenantId: { _type: "equal", _value: PATH_TENANT_ID } });
	});

	it("AND-merges owner, query, and IAM scope for GET_LIST and fails closed on collisions", async () => {
		const { controller } = createGeneratedReadController();

		await controller.getList(
			{ tenantId: PATH_TENANT_ID },
			{
				limit: 10,
				page: 1,
				"tenantId[operator]": EFilterOperation.EQ,
				"tenantId[value]": QUERY_TENANT_ID,
			},
			{},
			"127.0.0.1",
			createAuthenticationRequest({ tenantId: SCOPE_TENANT_ID }),
		);

		const request = controller.service.getList.mock.calls[0]?.[0];
		const where = request?.where as Record<string, unknown>;

		expect(where.tenantId).toMatchObject({
			_type: "and",
			_value: [
				{
					_type: "and",
					_value: [
						{ _type: "equal", _value: QUERY_TENANT_ID },
						{ _type: "equal", _value: PATH_TENANT_ID },
					],
				},
				{ _type: "equal", _value: SCOPE_TENANT_ID },
			],
		});
	});

	it("keeps CURSOR windows inside query, owner, and recalculated IAM scope", async () => {
		const { controller } = createGeneratedCursorReadController();

		const query = {
			limit: 1,
			"tenantId[operator]": EFilterOperation.EQ,
			"tenantId[value]": QUERY_TENANT_ID,
		};
		const first = await controller.getList({ tenantId: PATH_TENANT_ID }, query, {}, "127.0.0.1", createAuthenticationRequest({ tenantId: SCOPE_TENANT_ID }));

		expect(Object.keys(first).toSorted()).toEqual(["items", "nextCursor", "previousCursor"]);
		expect(first.nextCursor).toEqual(expect.any(String));
		expect(controller.service.getMany).toHaveBeenCalledTimes(1);

		controller.service.getMany.mockClear();
		await controller.getList({ tenantId: PATH_TENANT_ID }, { ...query, after: first.nextCursor! }, {}, "127.0.0.1", createAuthenticationRequest({ tenantId: SECOND_SCOPE_TENANT_ID }));

		expect(controller.service.getMany).toHaveBeenCalledTimes(2);

		for (const call of controller.service.getMany.mock.calls) {
			const where = call[0].where as Array<Record<string, unknown>>;

			expect(where).toHaveLength(2);
			expect(where.every((branch: Record<string, unknown>): boolean => "tenantId" in branch)).toBe(true);
			expect(where[0]?.tenantId).toMatchObject({
				_type: "and",
			});
		}
	});

	it.each([
		["structured item DTO", { itemType: GeneratedCursorItemDto }],
		["full flat response DTO", GeneratedCursorResponseDto],
	] as const)("returns the exact asserted plain CURSOR projection for a proven %s", async (_label, responseDto) => {
		const { controller } = createGeneratedCursorReadController({ responseDto });
		const result = await controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 1 }, {}, "127.0.0.1");
		const firstItem = result.items[0] as unknown as Record<string, unknown>;

		expect(Object.getPrototypeOf(result)).toBe(Object.prototype);
		expect(Object.getPrototypeOf(firstItem)).toBe(Object.prototype);
		expect(firstItem).toEqual({ id: ENTITY_ID, sequence: 1 });
	});

	it.each([
		["aliased protected field", GeneratedCursorAliasedItemDto],
		["transformed protected field", GeneratedCursorTransformedItemDto],
	] as const)("rejects a custom CURSOR item DTO with a wire-time %s", async (_label, itemType) => {
		const { controller } = createGeneratedCursorReadController({ responseDto: { itemType } });

		await expect(controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 1 }, {}, "127.0.0.1")).rejects.toThrow(/protected (?:pagination result|raw order tuple)/u);
	});

	it("rejects a generated response transformer that changes a framework-owned CURSOR", async () => {
		const { controller } = createGeneratedCursorReadController({ responseTransformer: { key: "nextCursor", value: "tampered" } });

		await expect(controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 1 }, {}, "127.0.0.1")).rejects.toThrow("changed the protected pagination result");
	});

	it("allows route AFTER subscribers to redact non-protected item fields", async () => {
		const subscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeRouteSubscribers").mockImplementation(async (...parameters: Array<unknown>): Promise<unknown> => {
			if (parameters[3] !== EApiSubscriberOnType.AFTER) {
				return undefined;
			}

			const context = parameters[4] as { result: IApiGetListCursorResponseResult<GeneratedReadContractEntity> };

			return {
				...context.result,
				items: context.result.items.map((item: GeneratedReadContractEntity): GeneratedReadContractEntity => ({ ...item, label: "redacted" })),
			};
		});

		try {
			const { controller } = createGeneratedCursorReadController();
			const result = await controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 1 }, {}, "127.0.0.1");

			expect(result.items[0]?.label).toBe("redacted");
		} finally {
			subscriberSpy.mockRestore();
		}
	});

	it.each(["cardinality", "order", "tuple"] as const)("rejects a route AFTER subscriber that changes CURSOR item %s", async (mutation) => {
		const subscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeRouteSubscribers").mockImplementation(async (...parameters: Array<unknown>): Promise<unknown> => {
			if (parameters[3] !== EApiSubscriberOnType.AFTER) {
				return undefined;
			}

			const context = parameters[4] as { result: IApiGetListCursorResponseResult<GeneratedReadContractEntity> };
			const items = [...context.result.items];

			if (mutation === "cardinality") {
				items.pop();
			} else if (mutation === "order") {
				items.reverse();
			} else if (items[0]) {
				items[0] = { ...items[0], sequence: 99 };
			}

			return { ...context.result, items };
		});

		try {
			const { controller } = createGeneratedCursorReadController();

			await expect(controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 2 }, {}, "127.0.0.1")).rejects.toThrow("changed the protected pagination result");
		} finally {
			subscriberSpy.mockRestore();
		}
	});

	it("rejects an authorization transform that changes a CURSOR envelope", async () => {
		const { controller } = createGeneratedCursorReadController();
		const transform = vi.fn((result: unknown): unknown => ({ ...(result as object), nextCursor: "tampered" }));

		await expect(controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 1 }, {}, "127.0.0.1", createAuthenticationRequest({ tenantId: SCOPE_TENANT_ID }, transform))).rejects.toThrow("changed the protected pagination result");
		expect(transform).toHaveBeenCalledTimes(1);
	});

	it("protects the static CURSOR order union from retained-query mutation during I/O", async () => {
		let retainedQuery: Record<string, unknown> | undefined;

		const subscriberSpy = vi.spyOn(ApiSubscriberExecutor, "executeRouteSubscribers").mockImplementation(async (...parameters: Array<unknown>): Promise<unknown> => {
			if (parameters[3] === EApiSubscriberOnType.BEFORE) {
				const context = parameters[4] as { result: { query?: Record<string, unknown> } };

				retainedQuery = context.result.query;
			}

			return undefined;
		});

		const transform = vi.fn((result: unknown): unknown => {
			const envelope = result as IApiGetListCursorResponseResult<GeneratedReadContractEntity>;

			return { ...envelope, items: envelope.items.map(({ sequence: _sequence, ...item }: GeneratedReadContractEntity): Omit<GeneratedReadContractEntity, "sequence"> => item) };
		});

		try {
			const { controller } = createGeneratedCursorReadController();

			controller.service.getMany.mockImplementationOnce(async (properties: TApiFunctionGetManyProperties<GeneratedReadContractEntity>): Promise<Array<GeneratedReadContractEntity>> => {
				ApiControllerGeneratedReadScopeStorage.claim(EApiFunctionType.GET_MANY, properties);
				setTimeout(() => {
					if (retainedQuery) {
						retainedQuery.orderBy = "label";
						retainedQuery.orderDirection = EFilterOrderDirection.DESC;
					}
				}, 0);

				await new Promise<void>((resolve): void => {
					setTimeout(resolve, 5);
				});

				return [
					{ effectiveAt: new Date(EFFECTIVE_AT), id: ENTITY_ID, label: "entity-a", sequence: 1, tenantId: PATH_TENANT_ID },
					{ effectiveAt: new Date(EFFECTIVE_AT), id: SECOND_ENTITY_ID, label: "entity-b", sequence: 2, tenantId: PATH_TENANT_ID },
				];
			});

			await expect(controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 1 }, {}, "127.0.0.1", createAuthenticationRequest({ tenantId: SCOPE_TENANT_ID }, transform))).rejects.toThrow(/protected (?:pagination result|raw order tuple)/u);
			expect(transform).toHaveBeenCalledTimes(1);
		} finally {
			subscriberSpy.mockRestore();
		}
	});

	it("rejects an empty authorization WHERE before scoped GET_LIST service I/O", async () => {
		const { controller } = createGeneratedReadController();
		const authenticationRequest: IApiAuthenticationRequest = createAuthenticationRequest([] as unknown as Record<string, unknown>);

		await expect(controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 10, page: 1 }, {}, "127.0.0.1", authenticationRequest)).rejects.toThrow("Authorization scope WHERE cannot be an empty array");
		expect(controller.service.getList).not.toHaveBeenCalled();
	});

	it.each([
		["undefined", undefined],
		["null", null],
	])("rejects a partially ineffective authorization WHERE containing %s before scoped GET_LIST service I/O", async (_label: string, ineffectiveTenantId: null | undefined) => {
		const { controller } = createGeneratedReadController();

		const authenticationRequest: IApiAuthenticationRequest = createAuthenticationRequest({
			status: "active",
			tenantId: ineffectiveTenantId,
		});

		await expect(controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 10, page: 1 }, {}, "127.0.0.1", authenticationRequest)).rejects.toThrow("Authorization scope WHERE object must contain an effective predicate");
		expect(controller.service.getList).not.toHaveBeenCalled();
	});

	it("retains owner scope and IAM LIKE as an exact database conjunction", async () => {
		const { controller } = createGeneratedReadController();

		await controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 10, page: 1 }, {}, "127.0.0.1", createAuthenticationRequest({ tenantId: Like("%1111") }));

		const where = controller.service.getList.mock.calls[0]?.[0].where as Record<string, unknown>;

		expect(where.tenantId).toMatchObject({
			_type: "and",
			_value: [
				{ _type: "equal", _value: PATH_TENANT_ID },
				{ _type: "like", _value: "%1111" },
			],
		});
	});

	it("applies compound defaults and keeps UUID server tie-breakers deduplicated", async () => {
		const { controller, type } = createGeneratedReadController();

		await controller.getList({ tenantId: PATH_TENANT_ID }, { limit: 10, page: 1 }, {}, "127.0.0.1");

		const request = controller.service.getList.mock.calls[0]?.[0];
		const controllerType = type as { prototype: object };
		const listTypes = Reflect.getMetadata(PARAMTYPES_METADATA, controllerType.prototype, "getList") as Array<new () => Record<string, unknown>>;
		const queryDto = listTypes[1];
		const clientOrderByMetadata = Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, queryDto?.prototype, "orderBy") as { enum?: Record<string, string> } | undefined;
		const clientOrderFields = Object.values(clientOrderByMetadata?.enum ?? {});

		expect(clientOrderFields).toEqual(expect.arrayContaining(["label", "sequence"]));
		expect(clientOrderFields).not.toContain("id");
		expect(Object.entries(request?.order ?? {})).toEqual([
			["sequence", EFilterOrderDirection.DESC],
			["label", EFilterOrderDirection.ASC],
			["id", EFilterOrderDirection.ASC],
		]);
	});

	it("uses client order first and appends one UUID tie-breaker", async () => {
		const { controller } = createGeneratedReadController();

		await controller.getList(
			{ tenantId: PATH_TENANT_ID },
			{
				limit: 10,
				orderBy: "label",
				orderDirection: EFilterOrderDirection.DESC,
				page: 1,
			},
			{},
			"127.0.0.1",
		);

		const request = controller.service.getList.mock.calls[0]?.[0];

		expect(Object.entries(request?.order ?? {})).toEqual([
			["label", EFilterOrderDirection.DESC],
			["id", EFilterOrderDirection.ASC],
		]);
	});

	it("preserves exact generated GET and GET_LIST behavior without pathScope", async () => {
		const { controller, type } = createLegacyGeneratedReadController();

		await controller.get({ id: ENTITY_ID }, {}, "127.0.0.1");
		await controller.getList(
			{
				limit: 10,
				orderBy: "sequence",
				orderDirection: EFilterOrderDirection.DESC,
				page: 2,
			},
			{},
			"127.0.0.1",
		);

		expect(controller.service.get).toHaveBeenCalledWith({
			relationLoadStrategy: undefined,
			relations: undefined,
			where: { id: ENTITY_ID },
		});
		expect(controller.service.getList).toHaveBeenCalledWith({
			order: { sequence: EFilterOrderDirection.DESC },
			relationLoadStrategy: undefined,
			relations: undefined,
			skip: 10,
			take: 10,
			where: {},
		});

		const controllerType = type as { prototype: object };
		const listArguments = Reflect.getMetadata(ROUTE_ARGS_METADATA, type, "getList") as Record<string, unknown>;
		const listTypes = Reflect.getMetadata(PARAMTYPES_METADATA, controllerType.prototype, "getList") as Array<unknown>;

		expect(Object.keys(listArguments)).toEqual([`${RouteParamtypes.QUERY}:0`, `${RouteParamtypes.HEADERS}:1`, `${RouteParamtypes.IP}:2`, `${RouteParamtypes.REQUEST}:3`]);
		expect(listTypes.slice(1)).toEqual([Object, Object, Object]);
	});
});
