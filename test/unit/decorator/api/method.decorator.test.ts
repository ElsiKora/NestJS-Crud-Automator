import "reflect-metadata";

import type { IApiRouteDocumentationProperties, IApiRouteGuardProperties, IApiRouteMetadata } from "@interface/decorator/api";
import type { CallHandler, CanActivate, ExecutionContext, NestInterceptor, Type } from "@nestjs/common";
import type { IAuthGuard } from "@nestjs/passport";
import type { Observable } from "rxjs";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { ApiMethod } from "@decorator/api/method.decorator";
import { EApiAuthenticationType, EApiRouteGuardStage, EApiRouteType } from "@enum/decorator/api";
import { FormBodyInterceptor } from "@interceptor/form-body.interceptor";
import { RequestBodyShapeInterceptor } from "@interceptor/request-body-shape.interceptor";
import { UuidCanonicalInterceptor } from "@interceptor/uuid-canonical.interceptor";
import { GUARDS_METADATA, INTERCEPTORS_METADATA } from "@nestjs/common/internal";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { SWAGGER_TEST_METADATA_CONSTANT } from "@test/unit/fixture";
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
			hasConflict: true,
			hasForbidden: true,
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

const readApiResponses = (): Record<string, Record<string, unknown>> => readHandlerMetadata<Record<string, Record<string, unknown>>>(SWAGGER_TEST_METADATA_CONSTANT.RESPONSE) ?? {};

describe("ApiMethod", () => {
	beforeEach(() => {
		for (const metadataKey of [SWAGGER_TEST_METADATA_CONSTANT.CONSUMES, SWAGGER_TEST_METADATA_CONSTANT.EXTRA_MODELS, SWAGGER_TEST_METADATA_CONSTANT.PARAMETERS, SWAGGER_TEST_METADATA_CONSTANT.PRODUCES, SWAGGER_TEST_METADATA_CONSTANT.RESPONSE, SWAGGER_TEST_METADATA_CONSTANT.SECURITY, GUARDS_METADATA, INTERCEPTORS_METADATA, METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY, METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY]) {
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
		const securities = readHandlerMetadata<Array<Record<string, Array<string>>>>(SWAGGER_TEST_METADATA_CONSTANT.SECURITY);

		expect(guards).toEqual(expect.arrayContaining([CustomGuard, ApiAuthorizationGuard]));
		expect(securities).toEqual(expect.arrayContaining([{ bearer: [] }, { apiKey: [] }]));
	});

	it("applies the request body limits on a route with no execution options", () => {
		applyDecorator(ApiMethod({ metadata: createMetadata() }));

		expect(readHandlerMetadata<Array<unknown>>(INTERCEPTORS_METADATA)).toEqual([RequestBodyShapeInterceptor, FormBodyInterceptor, UuidCanonicalInterceptor]);
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
		expect(readHandlerMetadata<Array<unknown>>(INTERCEPTORS_METADATA)).toEqual([RequestBodyShapeInterceptor, FormBodyInterceptor, UuidCanonicalInterceptor, ExecutionInterceptor]);
		expect(readHandlerMetadata<Array<string>>(SWAGGER_TEST_METADATA_CONSTANT.CONSUMES)).toEqual(["application/vnd.test+json"]);
		expect(readHandlerMetadata<Array<string>>(SWAGGER_TEST_METADATA_CONSTANT.PRODUCES)).toEqual(["application/vnd.test+json"]);
		expect(readHandlerMetadata<Array<Record<string, unknown>>>(SWAGGER_TEST_METADATA_CONSTANT.PARAMETERS)).toEqual([
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

		expect(readHandlerMetadata<Array<Record<string, Array<string>>>>(SWAGGER_TEST_METADATA_CONSTANT.SECURITY)).toEqual([
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

		expect(readHandlerMetadata<Array<Record<string, Array<string>>>>(SWAGGER_TEST_METADATA_CONSTANT.SECURITY)).toEqual([
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

		expect(readHandlerMetadata<Array<Record<string, Array<string>>>>(SWAGGER_TEST_METADATA_CONSTANT.SECURITY)).toEqual([{}]);
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

		expect(readHandlerMetadata<Array<Record<string, Array<string>>>>(SWAGGER_TEST_METADATA_CONSTANT.SECURITY)).toEqual([
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

		const responses = readHandlerMetadata<unknown>(SWAGGER_TEST_METADATA_CONSTANT.RESPONSE);
		const extraModels = readHandlerMetadata<Array<unknown>>(SWAGGER_TEST_METADATA_CONSTANT.EXTRA_MODELS);

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

	describe("guard error responses", () => {
		const withoutErrors = (overrides: Partial<IApiRouteMetadata<MethodEntity>> = {}): IApiRouteMetadata<MethodEntity> => createMetadata({ response: { status: HttpStatus.OK, type: undefined }, ...overrides });

		class RefusingGuard implements CanActivate {
			public canActivate(): boolean {
				return false;
			}
		}

		it("declares 401 and 403 for a route with authentication", () => {
			applyDecorator(ApiMethod({ metadata: withoutErrors({ security: { authentication: { guard: RefusingGuard, type: EApiAuthenticationType.USER } } }) }));

			expect(Object.keys(readApiResponses())).toEqual(expect.arrayContaining([String(HttpStatus.UNAUTHORIZED), String(HttpStatus.FORBIDDEN)]));
			expect(readHandlerMetadata<boolean>(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY)).toBe(true);
		});

		it("declares 401 and 403 for a route with execution guards", () => {
			applyDecorator(ApiMethod({ execution: { guards: [RefusingGuard] }, metadata: withoutErrors() }));

			expect(readApiResponses()).toHaveProperty(String(HttpStatus.FORBIDDEN));
			expect(readApiResponses()).toHaveProperty(String(HttpStatus.UNAUTHORIZED));
		});

		it("declares neither 401 nor 403 for a route without guards", () => {
			applyDecorator(ApiMethod({ metadata: withoutErrors() }));

			expect(readApiResponses()).not.toHaveProperty(String(HttpStatus.FORBIDDEN));
			expect(readApiResponses()).not.toHaveProperty(String(HttpStatus.UNAUTHORIZED));
			expect(readHandlerMetadata<boolean>(METHOD_API_DECORATOR_CONSTANT.ROUTE_FORBIDDEN_RESPONSE_METADATA_KEY)).toBeUndefined();
		});
	});

	describe("throttling, body parser, and failure error responses", () => {
		const withoutErrors = (overrides: Partial<IApiRouteMetadata<MethodEntity>> = {}): IApiRouteMetadata<MethodEntity> => createMetadata({ response: { status: HttpStatus.OK, type: undefined }, ...overrides });

		it("declares 429 once for a route with default throttling", () => {
			applyDecorator(ApiMethod({ metadata: withoutErrors({ throttling: { default: { limit: 1, ttl: 1000 } } }) }));

			expect(readApiResponses()[String(HttpStatus.TOO_MANY_REQUESTS)]).toMatchObject({ description: "Too Many Requests" });
		});

		it("declares no 429 for a route without throttling", () => {
			applyDecorator(ApiMethod({ metadata: withoutErrors() }));

			expect(readApiResponses()).not.toHaveProperty(String(HttpStatus.TOO_MANY_REQUESTS));
		});

		// Fastify parses a body on DELETE, PATCH, POST, and PUT, and Express on GET too
		it.each([[RequestMethod.DELETE], [RequestMethod.GET], [RequestMethod.PATCH], [RequestMethod.POST], [RequestMethod.PUT]])("declares 400, 413, 415, and 500 on method %s without error flags", (method: RequestMethod) => {
			applyDecorator(ApiMethod({ metadata: withoutErrors({ route: { method, path: "/body" } }) }));

			expect(Object.keys(readApiResponses()).filter((status: string): boolean => Number(status) >= HttpStatus.BAD_REQUEST)).toEqual([String(HttpStatus.BAD_REQUEST), String(HttpStatus.PAYLOAD_TOO_LARGE), String(HttpStatus.UNSUPPORTED_MEDIA_TYPE), String(HttpStatus.INTERNAL_SERVER_ERROR)].toSorted());
		});

		it("declares 400 and 500 once next to the flagged statuses", () => {
			applyDecorator(ApiMethod({ metadata: createMetadata() }));

			expect(readApiResponses()[String(HttpStatus.BAD_REQUEST)]).toMatchObject({ description: "Bad Request" });
			expect(readApiResponses()[String(HttpStatus.INTERNAL_SERVER_ERROR)]).toMatchObject({ description: "Internal Server Error" });
		});
	});

	it("throws for unsupported HTTP methods", () => {
		const invoke = () => ApiMethod({ metadata: createMetadata({ route: { method: RequestMethod.OPTIONS, path: "/", type: EApiRouteType.CREATE } }) });

		expect(invoke).toThrow("ApiMethod error: Method");
	});
});
