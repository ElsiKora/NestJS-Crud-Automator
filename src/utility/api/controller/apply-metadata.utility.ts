import type { Type } from "@nestjs/common";

import type { EApiRouteType } from "../../../enum";
import type { IApiControllerProperties, IApiEntity } from "../../../interface";
import type { TApiControllerPropertiesRoute } from "../../../type";

import { assignMetadata } from "@nestjs/common";
import { PARAMTYPES_METADATA, ROUTE_ARGS_METADATA } from "@nestjs/common/constants";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum";

import { EApiDtoType } from "../../../enum";
import { DtoGenerate } from "../../dto";

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
 * @returns {void}
 * @template E - The entity type
 */
export function ApiControllerApplyMetadata<E>(target: object, targetPrototype: object, entity: IApiEntity<E>, properties: IApiControllerProperties<E>, method: EApiRouteType, methodName: string, routeConfig: TApiControllerPropertiesRoute<E, typeof method>): void {
	let parameterIndex: number = 0;
	let routeArgumentsMetadata: unknown = {};
	const parameterTypes: Array<any> = [];

	const requestDto: Type<unknown> | undefined = routeConfig.dto?.request ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.REQUEST, routeConfig.autoDto?.[EApiDtoType.REQUEST], routeConfig.authentication?.guard);
	const queryDto: Type<unknown> | undefined = routeConfig.dto?.query ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.QUERY, routeConfig.autoDto?.[EApiDtoType.QUERY], routeConfig.authentication?.guard);
	const bodyDto: Type<unknown> | undefined = routeConfig.dto?.body ?? DtoGenerate(properties.entity, entity, method, EApiDtoType.BODY, routeConfig.autoDto?.[EApiDtoType.BODY], routeConfig.authentication?.guard);

	if (requestDto) {
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

	if (routeConfig.authentication) {
		routeArgumentsMetadata = assignMetadata(routeArgumentsMetadata, RouteParamtypes.REQUEST, parameterIndex);
		parameterTypes.push(Object);
		parameterIndex++;
	}

	Reflect.defineMetadata(ROUTE_ARGS_METADATA, routeArgumentsMetadata, target, methodName);
	Reflect.defineMetadata(PARAMTYPES_METADATA, parameterTypes, targetPrototype, methodName);
}
