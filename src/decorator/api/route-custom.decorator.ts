import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteCustomProperties, IApiRouteMetadata, IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { IDtoSchemaNameCustomRoute } from "@interface/utility/schema-name";
import type { TApiControllerMethod } from "@type/class/controller-method.type";

import { ApiControllerRequestRelationsValidator } from "@class/api/controller/request-relations-validator.class";
import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { DTO_SCHEMA_NAME_CONSTANT } from "@constant/utility/dto/schema-name.constant";
import { ApiMethod } from "@decorator/api/method.decorator";
import { EApiControllerResponseTarget } from "@enum/decorator/api";
import { ApiRouteRuntimeInterceptor } from "@interceptor/api-route-runtime.interceptor";
import { applyDecorators, SetMetadata, UseFilters } from "@nestjs/common";
import { EXCEPTION_FILTERS_METADATA, ROUTE_ARGS_METADATA, RouteParamtypes } from "@nestjs/common/internal";
import { ApiRouteApplyDtoMetadata } from "@utility/api/route/apply-dto-metadata.utility";
import { ApiRouteCreateAnonymousCheck } from "@utility/api/route/create-anonymous-check.utility";

/**
 * Creates a custom API route with metadata, runtime properties, and route runtime interception.
 * @template E - Entity type represented by the custom route metadata.
 * @param {IApiRouteCustomProperties<E>} properties - Custom route metadata and runtime configuration.
 * @returns {MethodDecorator} A decorator for a custom controller route method.
 */
export function ApiRouteCustom<E extends IApiBaseEntity>(properties: IApiRouteCustomProperties<E>): MethodDecorator {
	const metadataResponse: IApiRouteMetadata<E>["response"] | undefined = properties.response
		? {
				discriminator: properties.response.discriminator,
				errors: properties.response.errors,
				headers: properties.response.headers,
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
		ApiControllerRequestRelationsValidator.register<E>(target, properties.resource.entity, `Custom route ${target.constructor.name}.${String(propertyKey)}`, properties.relations?.request);

		const originalMethod: (...methodArguments: Array<unknown>) => unknown = descriptor.value as (...methodArguments: Array<unknown>) => unknown;
		const bodyArgumentIndex: number | undefined = resolveRouteArgumentIndex(target, propertyKey, RouteParamtypes.BODY);

		const wrappedMethod: (...methodArguments: Array<unknown>) => Promise<unknown> = Object.defineProperty(
			async function (this: TApiControllerMethod<E>, ...methodArguments: Array<unknown>): Promise<unknown> {
				const body: Partial<E> | undefined = bodyArgumentIndex === undefined ? undefined : (methodArguments[bodyArgumentIndex] as Partial<E> | undefined);

				await ApiRouteRuntime.executeCustomRequestRelations(this, metadata, runtimeProperties, body);
				const response: unknown = await originalMethod.apply(this, methodArguments);

				return await ApiRouteRuntime.executeCustomResponseRelations(this, runtimeProperties, response, metadata.route.type, metadata.resource.entity);
			},
			"name",
			{ value: originalMethod.name },
		);

		for (const metadataKey of Reflect.getOwnMetadataKeys(originalMethod)) {
			Reflect.defineMetadata(metadataKey, Reflect.getOwnMetadata(metadataKey, originalMethod), wrappedMethod);
		}

		descriptor.value = wrappedMethod;

		// A class without a name has no schema prefix; the decorated controller that inherits the handler names its request DTOs and drops the check, which fails startup otherwise.
		const contribution: Record<string, Array<unknown>> = target.constructor.name === "" ? applyAnonymousCheck(target, propertyKey, descriptor, metadata.route.path) : ApiRouteApplyDtoMetadata(target, propertyKey, metadata, runtimeProperties, descriptor);
		const customRoute: IDtoSchemaNameCustomRoute<E> = { contribution, metadata, runtimeProperties };

		Reflect.defineMetadata(DTO_SCHEMA_NAME_CONSTANT.CUSTOM_ROUTE_METADATA_KEY, customRoute, wrappedMethod);
		applyDecorators(
			ApiMethod({
				execution: {
					guards: properties.execution?.guards,
					interceptors: [...(properties.execution?.interceptors ?? []), ApiRouteRuntimeInterceptor],
				},
				metadata,
			}),
			SetMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, runtimeProperties),
		)(target, propertyKey, descriptor);
	};
}

/**
 * Attaches the check that fails startup when the custom route of a class without a name is served as it is.
 * @param {object} target - Controller prototype that owns the route method.
 * @param {string | symbol} propertyKey - Route method property key.
 * @param {PropertyDescriptor} descriptor - Route method descriptor.
 * @param {string | undefined} routePath - Route path.
 * @returns {Record<string, Array<unknown>>} The metadata entry a decorated controller removes from its copy of the handler.
 */
function applyAnonymousCheck(target: object, propertyKey: string | symbol, descriptor: PropertyDescriptor, routePath: string | undefined): Record<string, Array<unknown>> {
	const check: ReturnType<typeof ApiRouteCreateAnonymousCheck> = ApiRouteCreateAnonymousCheck(String(propertyKey), routePath);

	UseFilters(check)(target, propertyKey, descriptor);

	return { [EXCEPTION_FILTERS_METADATA]: [check] };
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

		if (type === String(parameterType)) {
			return value.index;
		}
	}

	return undefined;
}
