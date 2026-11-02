import type { EApiRouteType } from "@enum/decorator/api/route";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiControllerParametersRouteRuleOptions } from "@interface/class/api/controller/parameters-route-rule-options.interface";
import type { IApiControllerParametersRule } from "@interface/class/api/controller/parameters-rule.interface";
import type { IApiControllerProperties, IApiRouteRuntimeProperties } from "@interface/decorator/api";
import type { Type } from "@nestjs/common";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { DTO_SCHEMA_NAME_CONSTANT } from "@constant/utility/dto/schema-name.constant";
import { EApiAuthorizationMode } from "@enum/class/authorization";
import { EApiDtoType } from "@enum/decorator/api";
import { ApiControllerGetMethodName } from "@utility/api/controller/get/method-name.utility";

import { ApiControllerParametersBuildCustomRule } from "./custom-rule.utility";
import { ApiControllerParametersDtoGet } from "./dto";

/**
 * Builds the path value rule of a securable route that `@ApiController` does not generate, from its route metadata and its controller: the PARAMETERS DTO of the route, its authorization mode, and the IAM resource path of the controller.
 * Startup builds it for every route, and the guard builds it on a request when startup checks were replaced, as the documented test harness does, so a path value is never authorized as sent.
 * @param {IApiControllerParametersRouteRuleOptions} options - The controller class, the handler and its name, its route metadata, and the path parameters of the whole route path.
 * @returns {IApiControllerParametersRule | undefined} The rule, or undefined for a generated route, which carries its own, and for a route without a path parameter.
 * @throws {Error} When the PARAMETERS DTO cannot give a policy and the handler one checked value, see {@link ApiControllerParametersBuildCustomRule}.
 */
export function ApiControllerParametersBuildRouteRule(options: IApiControllerParametersRouteRuleOptions): IApiControllerParametersRule | undefined {
	const { controller, handler, metadata, methodName, pathParameters }: IApiControllerParametersRouteRuleOptions = options;
	const properties: IApiControllerProperties<IApiBaseEntity> | undefined = Reflect.getMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, controller) as IApiControllerProperties<IApiBaseEntity> | undefined;

	if (ApiControllerParametersDtoGet(handler) || isGeneratedRoute(properties, methodName, handler, metadata.route.type)) {
		return undefined;
	}

	const runtimeProperties: IApiRouteRuntimeProperties<IApiBaseEntity> | undefined = Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, handler) as IApiRouteRuntimeProperties<IApiBaseEntity> | undefined;
	const dto: unknown = Reflect.get(runtimeProperties?.dto ?? {}, EApiDtoType.PARAMETERS);
	const mode: EApiAuthorizationMode | undefined = metadata.security?.authorization?.mode ?? properties?.authorization?.defaultMode;

	return ApiControllerParametersBuildCustomRule({
		controller,
		dto: typeof dto === "function" ? (dto as Type<unknown>) : undefined,
		isColumnTypeRequired: mode === EApiAuthorizationMode.HOOKS,
		methodName,
		pathParameters,
		resourcePath: mode === EApiAuthorizationMode.IAM ? properties?.authorization?.resourceDefinition?.resourcePath : undefined,
	});
}

/**
 * Tells whether a handler is a route `@ApiController` generates: it carries the name of its route type, that route is not disabled, and `@ApiRouteCustom` did not declare it. Such a route carries its own PARAMETERS rule, or none without a path parameter, so no custom rule is built for it.
 * @param {IApiControllerProperties<IApiBaseEntity> | undefined} properties - Properties of the controller.
 * @param {string} methodName - Handler name.
 * @param {object} handler - Handler function.
 * @param {EApiRouteType | undefined} routeType - Route type of the handler.
 * @returns {boolean} Whether the handler is a generated route.
 */
function isGeneratedRoute(properties: IApiControllerProperties<IApiBaseEntity> | undefined, methodName: string, handler: object, routeType: EApiRouteType | undefined): boolean {
	return routeType !== undefined && methodName === ApiControllerGetMethodName(routeType) && properties?.routes[routeType]?.generation?.isEnabled !== false && !Reflect.hasMetadata(DTO_SCHEMA_NAME_CONSTANT.CUSTOM_ROUTE_METADATA_KEY, handler);
}
