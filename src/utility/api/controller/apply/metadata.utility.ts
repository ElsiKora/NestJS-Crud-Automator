import type { EApiRouteType } from "@enum/decorator/api";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerGetListQueryPlan } from "@interface/class/api/controller/get-list/query";
import type { IApiControllerIdentityPlan } from "@interface/class/api/controller/identity-plan.interface";
import type { IApiControllerReadPlan } from "@interface/class/api/controller/read";
import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity, IApiEntityColumn } from "@interface/entity";
import type { Type } from "@nestjs/common";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { EApiDtoType } from "@enum/decorator/api";
import { assignMetadata } from "@nestjs/common";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA, RouteParamtypes } from "@nestjs/common/internal";
import { ApiControllerGetDtoWithReadPlan } from "@utility/api/controller/get/dto.utility";
import { ApiControllerGetSchemaPrefix } from "@utility/api/controller/get/schema-prefix.utility";
import { ApiControllerParametersDtoSet } from "@utility/api/controller/parameters";
import { getMetadataStorage } from "class-validator";

/**
 * Applies metadata for NestJS controller methods to enable proper dependency injection.
 * Sets up parameter metadata for route arguments including DTOs, headers, IP, and authentication requests.
 * @param {object} target - The target controller class
 * @param {object} targetPrototype - The prototype of the target controller class
 * @param {IApiEntity<E>} entity - The entity metadata for the controller
 * @param {IApiControllerProperties<E>} properties - Controller configuration properties
 * @param {EApiRouteType} method - The type of route (CREATE, DELETE, GET, etc.)
 * @param {string} methodName - The name of the method being configured
 * @param {TApiControllerPropertiesRoute<E, typeof method>} routeConfig - Route-specific configuration
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Normalized plan used to resolve the route-scoped dynamic QUERY DTO.
 * @returns {void}
 * @template E - The entity type
 */
export function ApiControllerApplyMetadata<E extends IApiBaseEntity>(target: object, targetPrototype: object, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, methodName: string, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, queryPlan?: IApiControllerGetListQueryPlan): void {
	ApiControllerApplyMetadataWithReadPlan(target, targetPrototype, entity, properties, method, methodName, routeConfig, queryPlan);
}

/**
 * Applies generated route metadata with an internal compiled read plan.
 * @template E - Entity type
 * @param {object} target - Controller class receiving Swagger metadata.
 * @param {object} targetPrototype - Controller prototype receiving Nest route arguments.
 * @param {IApiEntity<E>} entity - Entity metadata.
 * @param {IApiControllerProperties<E>} properties - Controller configuration.
 * @param {EApiRouteType} method - Generated route type.
 * @param {string} methodName - Generated controller method name.
 * @param {TApiControllerPropertiesRoute<E, typeof method>} routeConfig - Route configuration.
 * @param {IApiControllerGetListQueryPlan} [queryPlan] - Internal compiled QUERY plan.
 * @param {IApiControllerReadPlan} [readPlan] - Internal compiled PARAMETERS plan.
 * @param {IApiControllerIdentityPlan} [identityPlan] - Internal GET identity alias plan.
 * @returns {void}
 */
export function ApiControllerApplyMetadataWithReadPlan<E extends IApiBaseEntity>(target: object, targetPrototype: object, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, methodName: string, routeConfig: TApiControllerPropertiesRoute<E, typeof method>, queryPlan?: IApiControllerGetListQueryPlan, readPlan?: IApiControllerReadPlan, identityPlan?: IApiControllerIdentityPlan): void {
	const schemaPrefix: string = ApiControllerGetSchemaPrefix(target);
	let parameterIndex: number = 0;
	let routeArgumentsMetadata: unknown = {};
	const parameterTypes: Array<unknown> = [];

	// Path values are always converted by the rule of the described columns; a configured PARAMETERS DTO only validates the converted values.
	const configuredRequestDto: Type<unknown> | undefined = routeConfig.dto?.[EApiDtoType.PARAMETERS];
	const requestDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoType.PARAMETERS, configuredRequestDto ? ({ ...routeConfig, dto: { ...routeConfig.dto, [EApiDtoType.PARAMETERS]: undefined } } as TApiControllerPropertiesRoute<E, typeof method>) : routeConfig, schemaPrefix, queryPlan, readPlan, identityPlan);
	const queryDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoType.QUERY, routeConfig, schemaPrefix, queryPlan, readPlan, identityPlan);
	const bodyDto: Type<unknown> | undefined = ApiControllerGetDtoWithReadPlan(properties, entity, method, EApiDtoType.BODY, routeConfig, schemaPrefix, queryPlan, readPlan, identityPlan);

	if (requestDto) {
		const handler: unknown = Reflect.get(targetPrototype, methodName);

		if (typeof handler === "function") {
			ApiControllerParametersDtoSet(handler, { columns: readParameterColumns(entity, requestDto, identityPlan, readPlan), configuredDto: configuredRequestDto, dto: requestDto });
		}

		routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.PARAM, parameterIndex);
		parameterTypes.push(requestDto);
		parameterIndex++;
	}

	if (queryDto) {
		routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.QUERY, parameterIndex);
		parameterTypes.push(queryDto);
		parameterIndex++;
	}

	if (bodyDto) {
		routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.BODY, parameterIndex);
		parameterTypes.push(bodyDto);
		parameterIndex++;
	}

	routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.HEADERS, parameterIndex);
	parameterTypes.push(Object);
	parameterIndex++;

	routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.IP, parameterIndex);
	parameterTypes.push(Object);
	parameterIndex++;

	routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.REQUEST, parameterIndex);
	parameterTypes.push(Object);

	Reflect.defineMetadata(ROUTE_ARGS_METADATA, routeArgumentsMetadata, target, methodName);
	Reflect.defineMetadata(PARAMTYPES_METADATA, parameterTypes, targetPrototype, methodName);
}

/**
 * Lists the entity column each path parameter of a generated route holds. A key holds the column of its name; an identity alias or a read scope parameter names its own field.
 * @template E - Entity type
 * @param {IApiEntity<E>} entity - Entity metadata.
 * @param {Type<unknown>} dto - Generated PARAMETERS DTO.
 * @param {IApiControllerIdentityPlan} [identityPlan] - Internal GET identity alias plan.
 * @param {IApiControllerReadPlan} [readPlan] - Internal compiled PARAMETERS plan.
 * @returns {Map<string, IApiEntityColumn<unknown>>} The column of each path parameter.
 */
function readParameterColumns<E>(entity: IApiEntity<E>, dto: Type<unknown>, identityPlan?: IApiControllerIdentityPlan, readPlan?: IApiControllerReadPlan): Map<string, IApiEntityColumn<unknown>> {
	const fields: Map<string, string> = new Map<string, string>([...(identityPlan ? [identityPlan] : []), ...(readPlan?.parameters ?? [])].map(({ field, parameter }: { field: string; parameter: string }): [string, string] => [parameter, field]));
	const columns: Map<string, IApiEntityColumn<unknown>> = new Map<string, IApiEntityColumn<unknown>>();

	for (const { propertyName } of getMetadataStorage().getTargetValidationMetadatas(dto, "", false, false)) {
		const field: string = fields.get(propertyName) ?? propertyName;
		const column: IApiEntityColumn<E> | undefined = entity.columns.find((candidate: IApiEntityColumn<E>): boolean => String(candidate.name) === field);

		if (column) {
			columns.set(propertyName, column as IApiEntityColumn<unknown>);
		}
	}

	return columns;
}
