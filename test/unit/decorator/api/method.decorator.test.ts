import "reflect-metadata";

import type { IApiRouteDocumentationProperties, IApiRouteGuardProperties, IApiRouteMetadata } from "@interface/decorator/api";
import type { CallHandler, CanActivate, ExecutionContext, NestInterceptor, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { Observable } from "rxjs";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { ApiMethod } from "@decorator/api/method.decorator";
import { EApiAuthenticationType, EApiRouteGuardStage, EApiRouteType } from "@enum/decorator/api";
import { GUARDS_METADATA, INTERCEPTORS_METADATA } from "@nestjs/common/constants";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
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
		for (const metadataKey of [DECORATORS.API_CONSUMES, DECORATORS.API_EXTRA_MODELS, DECORATORS.API_PARAMETERS, DECORATORS.API_PRODUCES, DECORATORS.API_RESPONSE, DECORATORS.API_SECURITY, GUARDS_METADATA, INTERCEPTORS_METADATA, METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY]) {
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
		class CustomGuard implements CanActivate {
			public canActivate(): boolean {
				return true;
			}
		}
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
					guard: CustomGuard,
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

	it("keeps Passport authentication guards compatible with the CanActivate contract", () => {
		const passportGuard: Type<IAuthGuard> = AuthGuard("test-passport");
		const metadata = createMetadata({
			security: {
				authentication: {
					guard: passportGuard,
					type: EApiAuthenticationType.USER,
				},
			},
		});

		applyDecorator(ApiMethod({ metadata }));

		expect(readHandlerMetadata<Array<unknown>>(GUARDS_METADATA)).toEqual(expect.arrayContaining([passportGuard, ApiAuthorizationGuard]));
	});

	it("composes explicit execution and OpenAPI request and response documentation", () => {
		class ExecutionGuard implements CanActivate {
			public canActivate(): boolean {
				return true;
			}
		}
		class ExecutionInterceptor implements NestInterceptor {
			public intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
				return next.handle();
			}
		}

		const documentation: IApiRouteDocumentationProperties = {
			request: {
				headers: [
					{
						description: "Detached request signature.",
						name: "X-Signature",
						required: true,
						schema: { type: "string" },
					},
				],
				mediaTypes: ["application/vnd.test+json"],
			},
			response: {
				mediaTypes: ["application/vnd.test+json"],
				statuses: [
					{
						description: "Request body is too large.",
						status: HttpStatus.PAYLOAD_TOO_LARGE,
					},
				],
			},
			summary: "Execute signed request",
		};

		applyDecorator(
			ApiMethod({
				execution: {
					guards: [ExecutionGuard],
					interceptors: [ExecutionInterceptor],
				},
				metadata: createMetadata({
					documentation,
				}),
			}),
		);

		expect(readHandlerMetadata<Array<unknown>>(GUARDS_METADATA)).toEqual([ExecutionGuard, ApiAuthorizationGuard]);
		expect(readHandlerMetadata<Array<unknown>>(INTERCEPTORS_METADATA)).toEqual([ExecutionInterceptor]);
		expect(readHandlerMetadata<Array<string>>(DECORATORS.API_CONSUMES)).toEqual(["application/vnd.test+json"]);
		expect(readHandlerMetadata<Array<string>>(DECORATORS.API_PRODUCES)).toEqual(["application/vnd.test+json"]);
		expect(readHandlerMetadata<Array<Record<string, unknown>>>(DECORATORS.API_PARAMETERS)).toEqual([
			expect.objectContaining({
				in: "header",
				name: "X-Signature",
				required: true,
			}),
		]);
		expect(readApiResponses()[HttpStatus.PAYLOAD_TOO_LARGE]).toEqual({
			description: "Request body is too large.",
		});
		expect(documentation.response?.statuses?.[0]).toEqual({
			description: "Request body is too large.",
			status: HttpStatus.PAYLOAD_TOO_LARGE,
		});
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

	describe("route guard stages", () => {
		class AuthenticationGuard implements CanActivate {
			public canActivate(): boolean {
				return true;
			}
		}
		class FirstGuard implements CanActivate {
			public canActivate(): boolean {
				return true;
			}
		}
		class SecondGuard implements CanActivate {
			public canActivate(): boolean {
				return true;
			}
		}
		class ThirdGuard implements CanActivate {
			public canActivate(): boolean {
				return true;
			}
		}
		class FourthGuard implements CanActivate {
			public canActivate(): boolean {
				return true;
			}
		}

		const createAuthenticatedMetadata = (): IApiRouteMetadata<MethodEntity> =>
			createMetadata({
				security: {
					authentication: {
						guard: AuthenticationGuard,
						type: EApiAuthenticationType.USER,
					},
				},
			});

		it("keeps plain guards before authentication by default", () => {
			const instanceGuard: CanActivate = { canActivate: (): boolean => true };

			applyDecorator(ApiMethod({ execution: { guards: [FirstGuard, instanceGuard] }, metadata: createAuthenticatedMetadata() }));

			expect(readHandlerMetadata<Array<unknown>>(GUARDS_METADATA)).toEqual([FirstGuard, instanceGuard, AuthenticationGuard, ApiAuthorizationGuard]);
		});

		it("treats a guard descriptor without stage as before authentication", () => {
			applyDecorator(ApiMethod({ execution: { guards: [{ guard: FirstGuard }] }, metadata: createAuthenticatedMetadata() }));

			expect(readHandlerMetadata<Array<unknown>>(GUARDS_METADATA)).toEqual([FirstGuard, AuthenticationGuard, ApiAuthorizationGuard]);
		});

		it.each([
			[EApiRouteGuardStage.BEFORE_AUTHENTICATION, [FirstGuard, AuthenticationGuard, ApiAuthorizationGuard]],
			[EApiRouteGuardStage.AFTER_AUTHENTICATION, [AuthenticationGuard, FirstGuard, ApiAuthorizationGuard]],
			[EApiRouteGuardStage.AFTER_AUTHORIZATION, [AuthenticationGuard, ApiAuthorizationGuard, FirstGuard]],
		])("places a %s guard at its stage", (stage: EApiRouteGuardStage, expectedGuards: Array<unknown>) => {
			applyDecorator(ApiMethod({ execution: { guards: [{ guard: FirstGuard, stage }] }, metadata: createAuthenticatedMetadata() }));

			expect(readHandlerMetadata<Array<unknown>>(GUARDS_METADATA)).toEqual(expectedGuards);
		});

		it("groups mixed stages while preserving declaration order within each stage", () => {
			const instanceGuard: CanActivate = { canActivate: (): boolean => true };

			applyDecorator(
				ApiMethod({
					execution: {
						guards: [{ guard: FirstGuard, stage: EApiRouteGuardStage.AFTER_AUTHORIZATION }, { guard: SecondGuard, stage: EApiRouteGuardStage.AFTER_AUTHENTICATION }, ThirdGuard, { guard: FourthGuard, stage: EApiRouteGuardStage.AFTER_AUTHORIZATION }, { guard: instanceGuard, stage: EApiRouteGuardStage.AFTER_AUTHENTICATION }, { guard: SecondGuard, stage: EApiRouteGuardStage.BEFORE_AUTHENTICATION }],
					},
					metadata: createAuthenticatedMetadata(),
				}),
			);

			expect(readHandlerMetadata<Array<unknown>>(GUARDS_METADATA)).toEqual([ThirdGuard, SecondGuard, AuthenticationGuard, SecondGuard, instanceGuard, ApiAuthorizationGuard, FirstGuard, FourthGuard]);
		});

		it("keeps stage order around authorization when the route has no authentication guard", () => {
			applyDecorator(
				ApiMethod({
					execution: {
						guards: [{ guard: FirstGuard, stage: EApiRouteGuardStage.AFTER_AUTHORIZATION }, { guard: SecondGuard, stage: EApiRouteGuardStage.AFTER_AUTHENTICATION }, ThirdGuard],
					},
					metadata: createMetadata(),
				}),
			);

			expect(readHandlerMetadata<Array<unknown>>(GUARDS_METADATA)).toEqual([ThirdGuard, SecondGuard, ApiAuthorizationGuard, FirstGuard]);
		});

		it("keeps only authentication and authorization guards for empty execution guards", () => {
			applyDecorator(ApiMethod({ execution: { guards: [] }, metadata: createAuthenticatedMetadata() }));

			expect(readHandlerMetadata<Array<unknown>>(GUARDS_METADATA)).toEqual([AuthenticationGuard, ApiAuthorizationGuard]);
		});

		it("keeps only the authorization guard for empty execution guards without authentication", () => {
			applyDecorator(ApiMethod({ execution: { guards: [] }, metadata: createMetadata() }));

			expect(readHandlerMetadata<Array<unknown>>(GUARDS_METADATA)).toEqual([ApiAuthorizationGuard]);
		});

		it("treats an object exposing canActivate as a guard instance even when it has guard and stage fields", () => {
			class CompositeGuard implements CanActivate {
				public constructor(
					private readonly guard: CanActivate,
					public readonly stage: EApiRouteGuardStage,
				) {}

				public canActivate(): boolean {
					return this.guard.canActivate({} as ExecutionContext) === true;
				}
			}

			const compositeGuard: CompositeGuard = new CompositeGuard(new SecondGuard(), EApiRouteGuardStage.AFTER_AUTHORIZATION);

			applyDecorator(ApiMethod({ execution: { guards: [{ guard: FirstGuard, stage: EApiRouteGuardStage.AFTER_AUTHENTICATION }, compositeGuard] }, metadata: createAuthenticatedMetadata() }));

			expect(readHandlerMetadata<Array<unknown>>(GUARDS_METADATA)).toEqual([compositeGuard, AuthenticationGuard, FirstGuard, ApiAuthorizationGuard]);
		});

		it.each([
			["a nested descriptor", '{"guard":{"guard":null},"stage":"AFTER_AUTHENTICATION"}'],
			["null", '{"guard":null,"stage":"AFTER_AUTHENTICATION"}'],
			["a missing guard", '{"stage":"AFTER_AUTHENTICATION"}'],
			["a string", '{"guard":"ThrottlerGuard"}'],
		])("throws when descriptor guard is %s", (_description: string, serializedDescriptor: string) => {
			const routeGuards = JSON.parse(`[${serializedDescriptor}]`) as NonNullable<NonNullable<Parameters<typeof ApiMethod>[0]["execution"]>["guards"]>;
			const invoke = () => ApiMethod({ execution: { guards: routeGuards }, metadata: createMetadata() });

			expect(invoke).toThrow("ApiMethod error: Route guard descriptor guard must be a guard class or a guard instance exposing canActivate");
		});

		it.each([
			["null", "null"],
			["number", "1"],
			["string", '"ThrottlerGuard"'],
		])("throws a clear error for a %s guard entry", (entryType: string, serializedEntry: string) => {
			const routeGuards = JSON.parse(`[${serializedEntry}]`) as NonNullable<NonNullable<Parameters<typeof ApiMethod>[0]["execution"]>["guards"]>;
			const invoke = () => ApiMethod({ execution: { guards: routeGuards }, metadata: createMetadata() });

			expect(invoke).toThrow(`ApiMethod error: Route guard entry of type ${entryType} must be a guard class, a guard instance, or a staged guard descriptor`);
		});

		it("throws for an unsupported guard stage", () => {
			const unsupportedStageGuard = JSON.parse('{"stage":"DURING_AUTHENTICATION"}') as Omit<IApiRouteGuardProperties, "guard">;
			const invoke = () => ApiMethod({ execution: { guards: [{ ...unsupportedStageGuard, guard: FirstGuard }] }, metadata: createMetadata() });

			expect(invoke).toThrow("ApiMethod error: Route guard stage DURING_AUTHENTICATION is not supported");
		});
	});

	it("throws for unsupported HTTP methods", () => {
		const invoke = () => ApiMethod({ metadata: createMetadata({ route: { method: RequestMethod.OPTIONS, path: "/", type: EApiRouteType.CREATE } }) });

		expect(invoke).toThrow("ApiMethod error: Method");
	});
});
