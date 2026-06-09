import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiAuthenticationType, EApiDtoType, EApiRouteType } from "@enum/decorator/api";
import { METHOD_METADATA, PATH_METADATA } from "@nestjs/common/constants";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { ApiControllerApplyDecorators } from "@utility/api/controller/apply/decorators.utility";
import { describe, expect, it } from "vitest";

class DecoratorEntity {
	public id?: string;
}

class DecoratorGuard {}

const entityMetadata: IApiEntity<DecoratorEntity> = {
	columns: [],
	name: "DecoratorEntity",
	primaryKey: { name: "id" } as never,
	tableName: "decorator_entities",
};

const properties: IApiControllerProperties<DecoratorEntity> = {
	entity: DecoratorEntity,
	routes: {},
};

describe("ApiControllerApplyDecorators", () => {
	it("applies route metadata for GET handlers", () => {
		const routeConfig: TApiControllerPropertiesRoute<DecoratorEntity, EApiRouteType.GET> = {
			dto: {
				[EApiDtoType.RESPONSE]: DecoratorEntity,
			},
			response: {
				headers: {
					"X-Request-Id": {
						description: "Request correlation id.",
						schema: {
							type: "string",
						},
					},
				},
			},
			security: {
				authentication: {
					guard: DecoratorGuard as never,
					securityRequirements: [
						{
							cookieStrategies: ["userRefreshTokenCookie"],
							securityStrategies: ["userSessionCsrf"],
						},
					],
					type: EApiAuthenticationType.USER,
				},
			},
		};
		const targetMethod = () => undefined;

		ApiControllerApplyDecorators(targetMethod as never, entityMetadata, properties, EApiRouteType.GET, "get", routeConfig, []);

		expect(Reflect.getMetadata(PATH_METADATA, targetMethod)).toBe(":id");
		expect(Reflect.getMetadata(METHOD_METADATA, targetMethod)).toBe(RequestMethod.GET);
		expect(Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, targetMethod)?.response?.headers).toEqual({
			"X-Request-Id": {
				description: "Request correlation id.",
				schema: {
					type: "string",
				},
			},
		});
		expect(Reflect.getMetadata(DECORATORS.API_RESPONSE, targetMethod)?.[HttpStatus.OK]?.headers).toEqual({
			"X-Request-Id": {
				description: "Request correlation id.",
				schema: {
					type: "string",
				},
			},
		});
		expect(Reflect.getMetadata(DECORATORS.API_SECURITY, targetMethod)).toEqual([
			{
				userRefreshTokenCookie: [],
				userSessionCsrf: [],
			},
		]);
	});

	it("applies generated DELETE no-content response headers", () => {
		const routeConfig: TApiControllerPropertiesRoute<DecoratorEntity, EApiRouteType.DELETE> = {
			response: {
				headers: {
					"Set-Cookie": {
						description: "Clears refresh token cookie.",
						schema: {
							type: "string",
						},
					},
				},
			},
		};
		const targetMethod = () => undefined;

		ApiControllerApplyDecorators(targetMethod as never, entityMetadata, properties, EApiRouteType.DELETE, "delete", routeConfig, []);

		expect(Reflect.getMetadata(PATH_METADATA, targetMethod)).toBe(":id");
		expect(Reflect.getMetadata(METHOD_METADATA, targetMethod)).toBe(RequestMethod.DELETE);
		expect(Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, targetMethod)?.response?.headers).toEqual({
			"Set-Cookie": {
				description: "Clears refresh token cookie.",
				schema: {
					type: "string",
				},
			},
		});
		expect(Reflect.getMetadata(DECORATORS.API_RESPONSE, targetMethod)?.[HttpStatus.NO_CONTENT]?.headers).toEqual({
			"Set-Cookie": {
				description: "Clears refresh token cookie.",
				schema: {
					type: "string",
				},
			},
		});
	});
});
