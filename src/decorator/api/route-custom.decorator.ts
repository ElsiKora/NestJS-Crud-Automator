import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteCustomProperties, IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { TApiControllerMethod } from "@type/class/controller-method.type";

import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiControllerResponseTarget } from "@enum/decorator/api";
import { ApiRouteRuntimeInterceptor } from "@interceptor/api-route-runtime.interceptor";
import { applyDecorators, SetMetadata, UseInterceptors } from "@nestjs/common";
import { ROUTE_ARGS_METADATA } from "@nestjs/common/constants.js";
import { RouteParamtypes } from "@nestjs/common/enums/route-paramtypes.enum.js";

import { ApiMethod } from "./method.decorator";

/**
 * Creates a custom API route with metadata, runtime properties, and route runtime interception.
 * @template E - Entity type represented by the custom route metadata.
 * @param {IApiRouteCustomProperties<E>} properties - Custom route metadata and runtime configuration.
 * @returns {MethodDecorator} A decorator for a custom controller route method.
 */
export function ApiRouteCustom<E extends IApiBaseEntity>(properties: IApiRouteCustomProperties<E>): MethodDecorator {
	const metadataResponse: IApiRouteMetadata<E>["response"] | undefined = properties.response
		? {
				errors: properties.response.errors,
				serialization: properties.response.serialization,
				status: properties.response.status,
				type: properties.response.type,
			}
		: undefined;

	const runtimeResponse: IApiRouteRuntimeProperties<E, undefined>["response"] | undefined = properties.response?.[EApiControllerResponseTarget.RESPONSE]
		? {
				[EApiControllerResponseTarget.RESPONSE]: properties.response[EApiControllerResponseTarget.RESPONSE],
			}
		: undefined;

	const metadata: IApiRouteMetadata<E> = {
		documentation: properties.documentation,
		resource: properties.resource,
		response: metadataResponse,
		route: properties.route,
		security: properties.security,
		throttling: properties.throttling,
	};

	const runtimeProperties: IApiRouteRuntimeProperties<E, undefined> = {
		autoDto: properties.autoDto,
		dto: properties.dto,
		relations: properties.relations,
		request: properties.request,
		response: runtimeResponse,
	};

	return function (target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor): void {
		const originalMethod: (...methodArguments: Array<unknown>) => unknown = descriptor.value as (...methodArguments: Array<unknown>) => unknown;
		const bodyArgumentIndex: number | undefined = resolveRouteArgumentIndex(target, propertyKey, RouteParamtypes.BODY);

		descriptor.value = async function (this: TApiControllerMethod<E>, ...methodArguments: Array<unknown>): Promise<unknown> {
			const body: Partial<E> | undefined = bodyArgumentIndex === undefined ? undefined : (methodArguments[bodyArgumentIndex] as Partial<E> | undefined);

			await ApiRouteRuntime.executeCustomRequestRelations(this, metadata, runtimeProperties, body);
			const response: unknown = await originalMethod.apply(this, methodArguments);

			return await ApiRouteRuntime.executeCustomResponseRelations(this, runtimeProperties, response);
		};

		applyDecorators(ApiMethod({ metadata }), SetMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, runtimeProperties), UseInterceptors(ApiRouteRuntimeInterceptor))(target, propertyKey, descriptor);
	};
}

/**
 * Resolves the argument index for a Nest route parameter type.
 * @param {object} target - Controller prototype that owns the route method.
 * @param {string | symbol} propertyKey - Route method property key.
 * @param {RouteParamtypes} parameterType - Nest route parameter type to find.
 * @returns {number | undefined} Argument index for the requested parameter type.
 */
function resolveRouteArgumentIndex(target: object, propertyKey: string | symbol, parameterType: RouteParamtypes): number | undefined {
	const routeArgumentsMetadata: Record<string, { index?: number }> | undefined = (Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, propertyKey) ?? Reflect.getMetadata(ROUTE_ARGS_METADATA, target, propertyKey)) as Record<string, { index?: number }> | undefined;

	if (!routeArgumentsMetadata) {
		return undefined;
	}

	for (const entry of Object.entries(routeArgumentsMetadata)) {
		const [key, value]: [string, { index?: number }] = entry;
		const [type]: Array<string> = key.split(":");
		const metadataParameterType: RouteParamtypes = Number(type);

		if (metadataParameterType === parameterType) {
			return value.index;
		}
	}

	return undefined;
}
