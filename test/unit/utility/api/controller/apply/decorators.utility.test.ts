import type { IApiControllerProperties } from "@interface/decorator/api";
import type { IApiEntity } from "@interface/entity";
import type { TApiControllerPropertiesRoute } from "@type/decorator/api/controller";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiAuthenticationType, EApiControllerRequestTarget, EApiDtoType, EApiRouteGuardStage, EApiRouteType } from "@enum/decorator/api";
import { EErrorStringAction } from "@enum/utility";
import { FormBodyInterceptor } from "@interceptor/form-body.interceptor";
import { RequestBodyShapeInterceptor } from "@interceptor/request-body-shape.interceptor";
import { UuidCanonicalInterceptor } from "@interceptor/uuid-canonical.interceptor";
import { GUARDS_METADATA, INTERCEPTORS_METADATA, METHOD_METADATA, PATH_METADATA } from "@nestjs/common/internal";
import { HttpStatus, RequestMethod, UnprocessableEntityException } from "@nestjs/common";
import { SWAGGER_TEST_METADATA_CONSTANT } from "@test/unit/fixture";
import { ApiControllerApplyDecorators } from "@utility/api/controller/apply/decorators.utility";
import { describe, expect, it } from "vitest";

class DecoratorEntity {
	public id?: string;
}

class DecoratorGuard {}
class DecoratorExecutionGuard {}
class DecoratorStagedExecutionGuard {}
class DecoratorExecutionInterceptor {}

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

		ApiControllerApplyDecorators(targetMethod as never, entityMetadata, properties, EApiRouteType.GET, "get", routeConfig, [], "TestController");

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
		expect(Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.RESPONSE, targetMethod)?.[HttpStatus.OK]?.headers).toEqual({
			"X-Request-Id": {
				description: "Request correlation id.",
				schema: {
					type: "string",
				},
			},
		});
		expect(Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.SECURITY, targetMethod)).toEqual([
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

		ApiControllerApplyDecorators(targetMethod as never, entityMetadata, properties, EApiRouteType.DELETE, "delete", routeConfig, [], "TestController");

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
		expect(Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.RESPONSE, targetMethod)?.[HttpStatus.NO_CONTENT]?.headers).toEqual({
			"Set-Cookie": {
				description: "Clears refresh token cookie.",
				schema: {
					type: "string",
				},
			},
		});
	});

	it("forwards generated route execution through ApiMethod", () => {
		const routeConfig: TApiControllerPropertiesRoute<DecoratorEntity, EApiRouteType.GET> = {
			documentation: {
				request: {
					headers: [{ name: "X-Route-Proof", required: true }],
					mediaTypes: ["application/vnd.generated+json"],
				},
				response: {
					mediaTypes: ["application/vnd.generated+json"],
					statuses: [{ description: "Generated request is too large.", status: HttpStatus.PAYLOAD_TOO_LARGE }],
				},
			},
			dto: {
				[EApiDtoType.RESPONSE]: DecoratorEntity,
			},
			execution: {
				guards: [DecoratorExecutionGuard as never],
				interceptors: [DecoratorExecutionInterceptor as never],
			},
		};
		const targetMethod = () => undefined;

		ApiControllerApplyDecorators(targetMethod as never, entityMetadata, properties, EApiRouteType.GET, "get", routeConfig, [], "TestController");

		expect(Reflect.getMetadata(GUARDS_METADATA, targetMethod)).toEqual([DecoratorExecutionGuard, ApiAuthorizationGuard]);
		expect(Reflect.getMetadata(INTERCEPTORS_METADATA, targetMethod)).toEqual([RequestBodyShapeInterceptor, FormBodyInterceptor, UuidCanonicalInterceptor, DecoratorExecutionInterceptor]);
		expect(Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.CONSUMES, targetMethod)).toEqual(["application/vnd.generated+json"]);
		expect(Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.PRODUCES, targetMethod)).toEqual(["application/vnd.generated+json"]);
		expect(Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.PARAMETERS, targetMethod)).toEqual([expect.objectContaining({ in: "header", name: "X-Route-Proof", required: true })]);
		expect(Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.RESPONSE, targetMethod)?.[HttpStatus.PAYLOAD_TOO_LARGE]).toEqual({ description: "Generated request is too large." });
	});

	it("keeps a documented status instead of the status the route declares for it", () => {
		const routeConfig: TApiControllerPropertiesRoute<DecoratorEntity, EApiRouteType.CREATE> = {
			documentation: {
				response: {
					statuses: [
						{ description: "Documented bad request.", status: HttpStatus.BAD_REQUEST },
						{ description: "Documented rejection.", status: HttpStatus.UNPROCESSABLE_ENTITY },
					],
				},
			},
			dto: {
				[EApiDtoType.RESPONSE]: DecoratorEntity,
			},
			request: {
				[EApiControllerRequestTarget.BODY]: { validators: [{ errorType: EErrorStringAction.VALIDATION_ERROR, exception: UnprocessableEntityException, validationFunction: (): boolean => true }] },
			},
		} as never;
		const targetMethod = () => undefined;

		ApiControllerApplyDecorators(targetMethod as never, entityMetadata, properties, EApiRouteType.CREATE, "create", routeConfig, [], "TestController");

		expect(Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.RESPONSE, targetMethod)?.[HttpStatus.BAD_REQUEST]).toEqual({ description: "Documented bad request." });
		expect(Reflect.getMetadata(SWAGGER_TEST_METADATA_CONSTANT.RESPONSE, targetMethod)?.[HttpStatus.UNPROCESSABLE_ENTITY]).toEqual({ description: "Documented rejection." });
	});

	it("orders staged generated route guards around authentication and authorization", () => {
		const routeConfig: TApiControllerPropertiesRoute<DecoratorEntity, EApiRouteType.CREATE> = {
			dto: {
				[EApiDtoType.BODY]: DecoratorEntity,
				[EApiDtoType.RESPONSE]: DecoratorEntity,
			},
			execution: {
				guards: [{ guard: DecoratorStagedExecutionGuard as never, stage: EApiRouteGuardStage.AFTER_AUTHENTICATION }, DecoratorExecutionGuard as never],
			},
			security: {
				authentication: {
					guard: DecoratorGuard as never,
					type: EApiAuthenticationType.USER,
				},
			},
		};
		const targetMethod = () => undefined;

		ApiControllerApplyDecorators(targetMethod as never, entityMetadata, properties, EApiRouteType.CREATE, "create", routeConfig, [], "TestController");

		expect(Reflect.getMetadata(GUARDS_METADATA, targetMethod)).toEqual([DecoratorExecutionGuard, DecoratorGuard, DecoratorStagedExecutionGuard, ApiAuthorizationGuard]);
	});
});
