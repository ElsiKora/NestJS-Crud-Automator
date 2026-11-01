import type { EApiPropertyDateType } from "@enum/decorator/api";
import type { EFilterOperation } from "@enum/filter";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerPropertiesRouteAutoDtoConfig, IApiControllerPropertiesRouteBaseRelationsResponse } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { CanActivate, Type } from "@nestjs/common";
import type { TApiPropertyDescribeProperties } from "@type/decorator/api/property";
import type { ObjectLiteral } from "typeorm";

import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";
import { FILTER_OPERATOR_REGISTRY_CONSTANT } from "@constant/filter";
import { SWAGGER_METADATA_CONSTANT } from "@constant/swagger";
import { DTO_GENERATE_CONSTANT } from "@constant/utility/dto/generate.constant";
import { EApiControllerGetListQueryPaginationMode, EApiDtoType, EApiPropertyDescribeType, EApiRouteType } from "@enum/decorator/api";
import { ApiControllerGetListQueryGetPaginationMode } from "@utility/api/controller/get-list/query/get-pagination-mode.utility";
import { CamelCaseString } from "@utility/camel-case-string.utility";
import { DtoAutoContextPop } from "@utility/dto/auto/context/pop.utility";
import { DtoAutoContextPush } from "@utility/dto/auto/context/push.utility";
import { DtoBuildDecorator } from "@utility/dto/build-decorator.utility";
import { DtoGenerateCacheKey } from "@utility/dto/generate/cache-key.utility";
import { DtoGenerateDynamic } from "@utility/dto/generate/dynamic.utility";
import { DtoGenerateFilterDecorator } from "@utility/dto/generate/filter-decorator.utility";
import { DtoGenerateGetListDateFormatDecorators, DtoGenerateGetListItemsResponse, DtoGenerateGetListQueryProperties } from "@utility/dto/generate/get-list";
import { DtoGetGetListQueryBaseClass } from "@utility/dto/get/get-list-query-base-class.utility";
import { DtoGetRelationResponseMetadata } from "@utility/dto/get/relation-response-metadata.utility";
import { DtoIsPropertyShouldBeMarked } from "@utility/dto/is/property/should-be-marked.utility";
import { DtoIsShouldBeGenerated } from "@utility/dto/is/should-be-generated.utility";
import { DtoSchemaNameGetRouteOrigin } from "@utility/dto/schema-name/route-origin.utility";
import { DtoSetGeneratedName } from "@utility/dto/set-generated-name.utility";
import { ErrorException } from "@utility/error/exception.utility";
import { ResolveMetadataTarget } from "@utility/resolve/metadata-target.utility";
import { AtMostOneOfListedPropertiesValidator } from "@validator/at-most-one-of-listed-properties.validator";
import { HasPairedCustomSuffixesFieldsValidator } from "@validator/has/paired-custom-suffixes-fields.validator";
import { Transform } from "class-transformer";
import { Validate } from "class-validator";

// Keyed by entity class, so a re-evaluated entity module (webpack HMR, `vi.resetModules`) generates its DTOs again instead of reusing ones built from the old class.
const dtoGenerateCache: WeakMap<ObjectLiteral, Map<string, Type<unknown>>> = new WeakMap<ObjectLiteral, Map<string, Type<unknown>>>();

/**
 * Core utility for DTO generation that determines which properties should be included in the DTO.
 * Builds decorators, handles special cases like filter queries, and generates the appropriate class
 * based on entity metadata, route type, and DTO type.
 * @param {ObjectLiteral} entity - The entity class or prototype
 * @param {IApiEntity<E>} entityMetadata - The entity metadata containing column information
 * @param {EApiRouteType} method - The API route type (CREATE, DELETE, GET, etc.)
 * @param {EApiDtoType} dtoType - The type of DTO (REQUEST, RESPONSE, etc.)
 * @param {string} schemaPrefix - Schema prefix of the controller that owns the route, from `ApiControllerGetSchemaPrefix`; it starts every generated DTO name
 * @param {IApiControllerPropertiesRouteAutoDtoConfig} [dtoConfig] - Optional configuration for automatic DTO generation
 * @param {Type<CanActivate>} [currentGuard] - Optional authentication guard for property visibility control
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Normalized route plan that narrows generated GET_LIST query fields.
 * @param {string} [responseVariantName] - Class name of a polymorphic response variant, which is always an item DTO without a list wrapper.
 * @param {string} [routeName] - PascalCase handler method name of a custom route; it replaces the route type in the generated names.
 * @param {ReadonlyArray<Type<unknown>> | Type<unknown>} [listResponseDto] - Manual or item-config list response DTO of a GET_LIST route, or the response variants of a custom one, which limit the generated QUERY DTO's orderBy enum.
 * @param {IApiControllerPropertiesRouteBaseRelationsResponse<E>} [responseRelations] - Response relation config of the route, which shapes the relation properties of a RESPONSE DTO.
 * @returns {Type<unknown> | undefined} The generated DTO class or undefined if no DTO should be generated
 * @throws {Error} When primary key metadata is missing
 * @template E - The entity type
 */
export function DtoGenerate<E>(
	entity: ObjectLiteral,
	entityMetadata: IApiEntity<E>,
	method: EApiRouteType,
	dtoType: EApiDtoType,
	schemaPrefix: string,
	dtoConfig?: IApiControllerPropertiesRouteAutoDtoConfig,
	currentGuard?: Type<CanActivate>,
	queryPlan?: IApiControllerGetListQueryPlan,
	responseVariantName?: string,
	routeName?: string,
	listResponseDto?: ReadonlyArray<Type<unknown>> | Type<unknown>,
	responseRelations?: IApiControllerPropertiesRouteBaseRelationsResponse<E>,
): Type<unknown> | undefined {
	if (!DtoIsShouldBeGenerated(method, dtoType)) {
		return undefined;
	}

	const isGetListResponse: boolean = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.RESPONSE;
	const isCursorGetListResponse: boolean = isGetListResponse && ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR;

	const isResponse: boolean = dtoType === EApiDtoType.RESPONSE;

	const cacheKey: string = DtoGenerateCacheKey({
		controllerName: schemaPrefix,
		dtoConfig,
		dtoType,
		entity: ResolveMetadataTarget(entity),
		guard: currentGuard,
		listResponseDto,
		method,
		queryPlanSignature: isCursorGetListResponse ? EApiControllerGetListQueryPaginationMode.CURSOR : queryPlan?.signature,
		responseRelations: isResponse ? responseRelations : undefined,
		responseVariantName,
		routeName,
	});

	const entityDtoCache: Map<string, Type<unknown>> = dtoGenerateCache.get(entity) ?? new Map<string, Type<unknown>>();

	dtoGenerateCache.set(entity, entityDtoCache);

	const cached: Type<unknown> | undefined = entityDtoCache.get(cacheKey);
	const routeOrigin: string = DtoSchemaNameGetRouteOrigin(schemaPrefix, routeName ?? method, dtoType);
	const namePrefix: string = routeName ? `${schemaPrefix}${routeName}` : schemaPrefix;
	const dtoNameBase: string = responseVariantName?.replace(/DTO$/, "") ?? `${schemaPrefix}${routeName ?? CamelCaseString(method)}${CamelCaseString(dtoType)}`;

	if (cached) {
		return cached;
	}

	if (!entityMetadata.primaryKey?.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY]) {
		throw ErrorException(`Primary key for entity ${String(entityMetadata.name)} not found in metadata storage`);
	}

	const markedProperties: Array<{
		isPrimary: boolean;
		metadata: TApiPropertyDescribeProperties;
		name: keyof E;
	}> = [];

	// A generated update writes a to-many relation as the full new set, so its body never declares one.
	const isUpdateBody: boolean = (method === EApiRouteType.PARTIAL_UPDATE || method === EApiRouteType.UPDATE) && dtoType === EApiDtoType.BODY;

	for (const column of entityMetadata.columns) {
		if (isUpdateBody && (column.type === "one-to-many" || column.type === "many-to-many")) {
			continue;
		}

		if (column.metadata?.[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] && DtoIsPropertyShouldBeMarked(method, dtoType, column.name as string, column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties, column.isPrimary, currentGuard)) {
			const metadata: TApiPropertyDescribeProperties = column.metadata[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY] as TApiPropertyDescribeProperties;

			markedProperties.push({
				isPrimary: column.isPrimary,
				metadata: isResponse && column.relation ? DtoGetRelationResponseMetadata(entity, entityMetadata, column, metadata, method, dtoNameBase, routeOrigin, responseRelations) : metadata,
				name: column.name,
			});
		}
	}

	const queryFilterProperties: Array<{
		allowedOperations?: ReadonlyArray<EFilterOperation>;
		entityMetadata: IApiEntity<unknown>;
		metadata: TApiPropertyDescribeProperties;
		name: string;
	}> = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY ? DtoGenerateGetListQueryProperties(entityMetadata, markedProperties, currentGuard, queryPlan) : [];
	const BaseClass: Type = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY ? DtoGetGetListQueryBaseClass<E>(entity, entityMetadata, method, dtoType, namePrefix, queryPlan, currentGuard, listResponseDto) : class {};
	const isTypedFilterPlan: boolean = method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY && queryPlan !== undefined && !queryPlan.filter.isLegacy;

	class GeneratedDTO extends BaseClass {
		constructor() {
			super();

			if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
				for (const property of queryFilterProperties) {
					Object.defineProperty(this, `${property.name}[value]`, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: undefined,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});

					Object.defineProperty(this, `${property.name}[values]`, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: undefined,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});

					Object.defineProperty(this, `${property.name}[operator]`, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: undefined,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});
				}
			} else {
				for (const property of markedProperties) {
					Object.defineProperty(this, property.name, {
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						configurable: true,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						enumerable: true,
						value: undefined,
						// eslint-disable-next-line @elsikora/typescript/naming-convention
						writable: true,
					});
				}
			}
		}
	}

	DtoSetGeneratedName(GeneratedDTO, responseVariantName ?? (queryPlan && method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY ? queryPlan.schemaName : `${dtoNameBase}DTO`), responseVariantName ? `variant ${responseVariantName} of ${routeOrigin}` : routeOrigin);

	DtoAutoContextPush(GeneratedDTO.prototype, method, dtoType);

	try {
		if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
			for (const property of queryFilterProperties) {
				const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, property.metadata, property.entityMetadata, dtoType, property.name, currentGuard);

				const dateFormat: EApiPropertyDateType | undefined = property.metadata.type === EApiPropertyDescribeType.DATE ? property.metadata.format : undefined;

				if (decorators) {
					for (const [, decorator] of decorators.entries()) {
						decorator(GeneratedDTO.prototype, `${property.name}[value]`);
					}
				}

				if (dateFormat) {
					for (const decorator of DtoGenerateGetListDateFormatDecorators(dateFormat, false)) {
						decorator(GeneratedDTO.prototype, `${property.name}[value]`);
					}
				}

				DtoGenerateFilterDecorator(property.metadata, property.entityMetadata, property.allowedOperations, `${queryPlan?.schemaName ?? namePrefix}${CamelCaseString(property.name)}FilterOperation`)(GeneratedDTO.prototype, `${property.name}[operator]`);

				const metadataArray: TApiPropertyDescribeProperties = {
					...property.metadata,
					isArray: true,
					isUniqueItems: false,
					maxItems: DTO_GENERATE_CONSTANT.MAXIMUM_FILTER_PROPERTIES,
					minItems: FILTER_OPERATOR_REGISTRY_CONSTANT.VALUES_MINIMUM_OPERAND_COUNT,
				} as TApiPropertyDescribeProperties;

				const decoratorsArray: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, metadataArray, property.entityMetadata, dtoType, property.name, currentGuard);

				if (decoratorsArray) {
					for (const [, decorator] of decoratorsArray.entries()) {
						decorator(GeneratedDTO.prototype, `${property.name}[values]`);
					}
				}

				if (dateFormat) {
					for (const decorator of DtoGenerateGetListDateFormatDecorators(dateFormat, true)) {
						decorator(GeneratedDTO.prototype, `${property.name}[values]`);
					}
				}

				// A query string sends one membership value as a scalar. class-transformer runs the last registered transform first, so the scalar is wrapped before the element transforms read it as an array.
				Transform(({ value }: { value: unknown }): unknown => (value === undefined || value === null || Array.isArray(value) ? value : [value]), { toClassOnly: true })(GeneratedDTO.prototype, `${property.name}[values]`);
			}
		} else {
			for (const property of markedProperties) {
				const generatedDTOs: Record<string, Type<unknown>> | undefined = DtoGenerateDynamic(method, property.metadata, entityMetadata, dtoType, property.name as string, currentGuard, dtoNameBase);

				const decorators: Array<PropertyDecorator> | undefined = DtoBuildDecorator(method, property.metadata, entityMetadata, dtoType, property.name as string, currentGuard, generatedDTOs, dtoNameBase);

				if (decorators) {
					for (const [, decorator] of decorators.entries()) {
						decorator(GeneratedDTO.prototype, property.name as string);
					}
				}
			}
		}
	} finally {
		DtoAutoContextPop(GeneratedDTO.prototype);
	}

	if (isTypedFilterPlan) {
		const hiddenSwaggerProperties: Set<string> = new Set<string>();

		for (const property of queryFilterProperties) {
			for (const suffix of ["operator", "value", "values"]) {
				const propertyName: string = `${property.name}[${suffix}]`;

				hiddenSwaggerProperties.add(`:${propertyName}`);
				Reflect.deleteMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES, GeneratedDTO.prototype, propertyName);
			}
		}

		const swaggerProperties: Array<string> = (Reflect.getMetadata(SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY, GeneratedDTO.prototype) as Array<string> | undefined) ?? [];

		Reflect.defineMetadata(
			SWAGGER_METADATA_CONSTANT.MODEL_PROPERTIES_ARRAY,
			swaggerProperties.filter((propertyName: string): boolean => !hiddenSwaggerProperties.has(propertyName)),
			GeneratedDTO.prototype,
		);
	}

	if (dtoConfig?.validators) {
		for (const validator of dtoConfig.validators) {
			Validate(validator.constraintClass, validator.options)(GeneratedDTO.prototype, "object");
		}
	}

	if (method === EApiRouteType.GET_LIST && dtoType === EApiDtoType.QUERY) {
		Object.defineProperty(GeneratedDTO.prototype, "object", {
			// eslint-disable-next-line @elsikora/typescript/naming-convention
			configurable: true,

			// eslint-disable-next-line @elsikora/typescript/naming-convention
			enumerable: true,
			value: function (this: InstanceType<typeof GeneratedDTO>): InstanceType<typeof GeneratedDTO> {
				return this;
			},

			// eslint-disable-next-line @elsikora/typescript/naming-convention
			writable: true,
		});

		Validate(HasPairedCustomSuffixesFieldsValidator, ["operator", ["value", "values"]])(GeneratedDTO.prototype, "object");

		if (ApiControllerGetListQueryGetPaginationMode(queryPlan) === EApiControllerGetListQueryPaginationMode.CURSOR) {
			Validate(AtMostOneOfListedPropertiesValidator, ["after", "before"])(GeneratedDTO.prototype, "object");
		}
	}

	const result: Type<unknown> = isGetListResponse && !responseVariantName ? DtoGenerateGetListItemsResponse(entity, GeneratedDTO, schemaPrefix, queryPlan) : GeneratedDTO;

	entityDtoCache.set(cacheKey, result);

	return result;
}
