import "reflect-metadata";

import type { IApiRouteMetadata } from "@interface/decorator/api";
import type { Type } from "@nestjs/common";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { ApiMethod } from "@decorator/api/method.decorator";
import { EApiAuthenticationType, EApiRouteType } from "@enum/decorator/api";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { beforeEach, describe, expect, it } from "vitest";

import { MethodController, MethodEmailPayloadDto, MethodEmailResponseDto, MethodEntity, MethodPhonePayloadDto, MethodPhoneResponseDto } from "./method/fixture";

const createMetadata = (overrides: Partial<IApiRouteMetadata<MethodEntity>> = {}): IApiRouteMetadata<MethodEntity> => ({
	documentation: {
		summary: "Create method entity",
	},
	resource: {
		action: EApiRouteType.CREATE,
		entity: MethodEntity,
	},
	response: {
		errors: {
			hasBadRequest: true,
			hasConflict: true,
			hasForbidden: true,
			hasInternalServerError: true,
			hasNotFound: true,
			hasTooManyRequests: true,
			hasUnauthorized: true,
		},
		serialization: {
			isEnabled: true,
		},
		status: HttpStatus.CREATED,
		type: undefined,
	},
	route: {
		method: RequestMethod.POST,
		path: "/secured",
		type: EApiRouteType.CREATE,
	},
	...overrides,
});

const applyDecorator = (decorator: ReturnType<typeof ApiMethod>): void => {
	const descriptor = Object.getOwnPropertyDescriptor(MethodController.prototype, "handler") ?? {
		value: MethodController.prototype.handler,
	};
	decorator(MethodController.prototype, "handler", descriptor);
};

const readHandlerMetadata = <T>(metadataKey: string): T | undefined => (Reflect.getMetadata(metadataKey, MethodController.prototype, "handler") ?? Reflect.getMetadata(metadataKey, MethodController.prototype.handler)) as T | undefined;

const readApiResponses = (): Record<string, Record<string, unknown>> => readHandlerMetadata<Record<string, Record<string, unknown>>>(DECORATORS.API_RESPONSE) ?? {};

describe("ApiMethod", () => {
	beforeEach(() => {
		for (const metadataKey of [DECORATORS.API_EXTRA_MODELS, DECORATORS.API_RESPONSE, DECORATORS.API_SECURITY, GUARDS_METADATA, METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY]) {
			Reflect.deleteMetadata(metadataKey, MethodController.prototype, "handler");
			Reflect.deleteMetadata(metadataKey, MethodController.prototype.handler);
		}
	});

	it("applies HTTP decorators for supported methods", () => {
		for (const method of [RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE, RequestMethod.GET]) {
			applyDecorator(ApiMethod({ metadata: createMetadata({ route: { method, path: "/secured", type: EApiRouteType.CREATE } }) }));
		}
	});

	it("applies responses, grouped throttling, authentication, and guards", () => {
		class CustomGuard {}
		class ResponseDto {}

		const metadata = createMetadata({
			response: {
				errors: createMetadata().response?.errors,
				serialization: createMetadata().response?.serialization,
				status: HttpStatus.CREATED,
				type: ResponseDto,
			},
			security: {
				authentication: {
					guard: CustomGuard as unknown as Type,
					securityRequirements: [
						{
							bearerStrategies: ["bearer"],
						},
						{
							securityStrategies: ["apiKey"],
						},
					],
					type: EApiAuthenticationType.USER,
				},
			},
			throttling: {
				default: {
					limit: 2,
					ttl: 10,
				},
			},
		});

		applyDecorator(ApiMethod({ metadata }));

		const guards = readHandlerMetadata<Array<unknown>>(GUARDS_METADATA);
		const securities = readHandlerMetadata<Array<Record<string, Array<string>>>>(DECORATORS.API_SECURITY);

		expect(guards).toEqual(expect.arrayContaining([CustomGuard, ApiAuthorizationGuard]));
		expect(securities).toEqual(expect.arrayContaining([{ bearer: [] }, { apiKey: [] }]));
	});

	it("writes normal success response headers into swagger metadata", () => {
		applyDecorator(
			ApiMethod({
				metadata: createMetadata({
					response: {
						headers: {
							"X-Request-Id": {
								description: "Request correlation id.",
								schema: {
									type: "string",
								},
							},
						},
						status: HttpStatus.OK,
						type: MethodEmailResponseDto,
					},
				}),
			}),
		);

		expect(readApiResponses()[HttpStatus.OK]?.headers).toEqual({
			"X-Request-Id": {
				description: "Request correlation id.",
				schema: {
					type: "string",
				},
			},
		});
		expect(readApiResponses()[HttpStatus.OK]?.type).toBe(MethodEmailResponseDto);
	});

	it("writes no-content success response headers into swagger metadata", () => {
		applyDecorator(
			ApiMethod({
				metadata: createMetadata({
					response: {
						headers: {
							"Set-Cookie": {
								description: "Clears refresh token cookie.",
								schema: {
									type: "string",
								},
							},
						},
						status: HttpStatus.NO_CONTENT,
						type: undefined,
					},
				}),
			}),
		);

		expect(readApiResponses()[HttpStatus.NO_CONTENT]?.headers).toEqual({
			"Set-Cookie": {
				description: "Clears refresh token cookie.",
				schema: {
					type: "string",
				},
			},
		});
		expect(readApiResponses()[HttpStatus.NO_CONTENT]?.type).toBeUndefined();
	});

	it("writes one grouped security requirement object for combined cookie and csrf schemes", () => {
		class CustomGuard {}

		applyDecorator(
			ApiMethod({
				metadata: createMetadata({
					security: {
						authentication: {
							guard: CustomGuard as unknown as Type,
							securityRequirements: [
								{
									cookieStrategies: ["userRefreshTokenCookie"],
									securityStrategies: ["userSessionCsrf"],
								},
							],
							type: EApiAuthenticationType.USER,
						},
					},
				}),
			}),
		);

		expect(readHandlerMetadata<Array<Record<string, Array<string>>>>(DECORATORS.API_SECURITY)).toEqual([
			{
				userRefreshTokenCookie: [],
				userSessionCsrf: [],
			},
		]);
	});

	it("writes one grouped security requirement object for bearer, cookie, and generic schemes", () => {
		class CustomGuard {}

		applyDecorator(
			ApiMethod({
				metadata: createMetadata({
					security: {
						authentication: {
							guard: CustomGuard as unknown as Type,
							securityRequirements: [
								{
									bearerStrategies: ["userAccessToken"],
									cookieStrategies: ["userRefreshTokenCookie"],
									securityStrategies: ["userSessionCsrf"],
								},
							],
							type: EApiAuthenticationType.USER,
						},
					},
				}),
			}),
		);

		expect(readHandlerMetadata<Array<Record<string, Array<string>>>>(DECORATORS.API_SECURITY)).toEqual([
			{
				userAccessToken: [],
				userRefreshTokenCookie: [],
				userSessionCsrf: [],
			},
		]);
	});

	it("preserves empty security requirement objects in swagger metadata", () => {
		class CustomGuard {}

		applyDecorator(
			ApiMethod({
				metadata: createMetadata({
					security: {
						authentication: {
							guard: CustomGuard as unknown as Type,
							securityRequirements: [{}],
							type: EApiAuthenticationType.USER,
						},
					},
				}),
			}),
		);

		expect(readHandlerMetadata<Array<Record<string, Array<string>>>>(DECORATORS.API_SECURITY)).toEqual([{}]);
	});

	it("writes multiple security requirement objects for alternative schemes", () => {
		class CustomGuard {}

		applyDecorator(
			ApiMethod({
				metadata: createMetadata({
					security: {
						authentication: {
							guard: CustomGuard as unknown as Type,
							securityRequirements: [
								{
									bearerStrategies: ["userAccessToken"],
								},
								{
									securityStrategies: ["serviceAccountSignedRequest"],
								},
							],
							type: EApiAuthenticationType.USER,
						},
					},
				}),
			}),
		);

		expect(readHandlerMetadata<Array<Record<string, Array<string>>>>(DECORATORS.API_SECURITY)).toEqual([
			{
				userAccessToken: [],
			},
			{
				serviceAccountSignedRequest: [],
			},
		]);
	});

	it("stores unified route metadata on the handler", () => {
		const metadata = createMetadata({
			resource: {
				action: "publish",
				entity: MethodEntity,
			},
		});

		applyDecorator(ApiMethod({ metadata }));

		expect(Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, MethodController.prototype.handler)).toEqual(metadata);
	});

	it("writes discriminated success response swagger metadata", () => {
		applyDecorator(
			ApiMethod({
				metadata: createMetadata({
					response: {
						discriminator: {
							mapping: {
								email: MethodEmailResponseDto,
								phone: MethodPhoneResponseDto,
							},
							propertyName: "channel",
						},
						status: HttpStatus.OK,
						type: [MethodEmailResponseDto, MethodPhoneResponseDto],
					},
				}),
			}),
		);

		const responses = readHandlerMetadata<unknown>(DECORATORS.API_RESPONSE);
		const extraModels = readHandlerMetadata<Array<unknown>>(DECORATORS.API_EXTRA_MODELS);

		expect(JSON.stringify(responses)).toContain("oneOf");
		expect(JSON.stringify(responses)).toContain("channel");
		expect(extraModels).toEqual(expect.arrayContaining([MethodEmailResponseDto, MethodPhoneResponseDto]));
		expect(extraModels).toEqual(expect.arrayContaining([MethodEmailPayloadDto, MethodPhonePayloadDto]));
	});

	it("writes discriminated success response headers into swagger metadata", () => {
		applyDecorator(
			ApiMethod({
				metadata: createMetadata({
					response: {
						discriminator: {
							mapping: {
								email: MethodEmailResponseDto,
								phone: MethodPhoneResponseDto,
							},
							propertyName: "channel",
						},
						headers: {
							"X-Request-Id": {
								description: "Request correlation id.",
								schema: {
									type: "string",
								},
							},
						},
						status: HttpStatus.OK,
						type: [MethodEmailResponseDto, MethodPhoneResponseDto],
					},
				}),
			}),
		);

		expect(readApiResponses()[HttpStatus.OK]?.headers).toEqual({
			"X-Request-Id": {
				description: "Request correlation id.",
				schema: {
					type: "string",
				},
			},
		});
		expect(JSON.stringify(readApiResponses()[HttpStatus.OK]?.schema)).toContain("oneOf");
	});

	it("throws when discriminated success response is missing discriminator metadata", () => {
		const invoke = () =>
			ApiMethod({
				metadata: createMetadata({
					response: {
						status: HttpStatus.OK,
						type: [MethodEmailResponseDto, MethodPhoneResponseDto],
					},
				}),
			});

		expect(invoke).toThrow("response.discriminator is required");
	});

	it("throws for unsupported HTTP methods", () => {
		const invoke = () => ApiMethod({ metadata: createMetadata({ route: { method: RequestMethod.OPTIONS, path: "/", type: EApiRouteType.CREATE } }) });

		expect(invoke).toThrow("ApiMethod error: Method");
	});
});
