import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiRouteMetadata } from "@interface/decorator/api";

import "reflect-metadata";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { EApiAuthorizationMode } from "@enum/class/authorization";
import { EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { RequestMethod } from "@nestjs/common";
import { ApiControllerParametersBuildRouteRule } from "@utility/api/controller/parameters/route-rule.utility";
import { IsUUID } from "class-validator";
import { describe, expect, it } from "vitest";

class RouteRuleEntity {
	public id?: string;
}

class RouteRuleParametersDto {
	@IsUUID()
	public id!: string;
}

/**
 * Builds route metadata of one handler.
 * @param {EApiRouteType} [routeType] - Route type.
 * @param {EApiAuthorizationMode} [mode] - Authorization mode of the route.
 * @returns {IApiRouteMetadata<IApiBaseEntity>} The metadata.
 */
function routeMetadata(routeType?: EApiRouteType, mode?: EApiAuthorizationMode): IApiRouteMetadata<IApiBaseEntity> {
	return { resource: { action: "read", entity: RouteRuleEntity }, route: { method: RequestMethod.GET, path: ":id", type: routeType }, security: mode ? { authorization: { mode } } : undefined } as never;
}

/**
 * Declares a controller class with the authorization block of a controller.
 * @param {EApiAuthorizationMode} mode - Default authorization mode.
 * @param {string} [resourcePath] - IAM resource path.
 * @returns {new () => unknown} The controller.
 */
function controller(mode: EApiAuthorizationMode, resourcePath?: string): new () => unknown {
	const controllerClass: new () => unknown = class RouteRuleController {};
	Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY, { authorization: { defaultMode: mode, resourceDefinition: resourcePath ? { resourcePath } : undefined }, entity: RouteRuleEntity, routes: {} }, controllerClass);

	return controllerClass;
}

describe("ApiControllerParametersBuildRouteRule", () => {
	it("builds the rule of a custom route from its PARAMETERS DTO", () => {
		const handler = function readPolicy(): void {};
		Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, { dto: { [EApiDtoType.PARAMETERS]: RouteRuleParametersDto } }, handler);

		expect(ApiControllerParametersBuildRouteRule({ controller: controller(EApiAuthorizationMode.IAM) as never, handler, metadata: routeMetadata(), methodName: "readPolicy", pathParameters: ["id"] })?.dto).toBe(RouteRuleParametersDto);
	});

	it("builds no rule for a generated route, which carries its own", () => {
		const handler = function get(): void {};

		expect(ApiControllerParametersBuildRouteRule({ controller: controller(EApiAuthorizationMode.IAM) as never, handler, metadata: routeMetadata(EApiRouteType.GET), methodName: "get", pathParameters: ["id"] })).toBeUndefined();
	});

	it("requires a column type on a HOOKS route, by the mode of the route over the mode of its controller", () => {
		const handler = function readHooks(): void {};
		Reflect.defineMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, { dto: { [EApiDtoType.PARAMETERS]: RouteRuleParametersDto } }, handler);

		expect(() => ApiControllerParametersBuildRouteRule({ controller: controller(EApiAuthorizationMode.IAM) as never, handler, metadata: routeMetadata(undefined, EApiAuthorizationMode.HOOKS), methodName: "readHooks", pathParameters: ["id"] })).toThrow('Controller "RouteRuleController" method "readHooks"');
	});

	it("refuses a path parameter without a PARAMETERS DTO", () => {
		const handler = function readBare(): void {};

		expect(() => ApiControllerParametersBuildRouteRule({ controller: controller(EApiAuthorizationMode.IAM, "route-rule/{id}") as never, handler, metadata: routeMetadata(), methodName: "readBare", pathParameters: ["id"] })).toThrow('has the path parameter "id" but declares no PARAMETERS DTO');
	});
});
