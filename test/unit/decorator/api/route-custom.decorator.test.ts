import "reflect-metadata";

import type { CallHandler, CanActivate, ExecutionContext, NestInterceptor } from "@nestjs/common";
import type { Observable } from "rxjs";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { ApiRouteCustom } from "@decorator/api";
import { EApiControllerRequestTransformerType, EApiControllerResponseTarget, EApiDtoType } from "@enum/decorator/api";
import { ApiRouteRuntimeInterceptor } from "@interceptor/api-route-runtime.interceptor";
import { Header, HttpStatus, Req, RequestMethod, SetMetadata, UseGuards, UseInterceptors } from "@nestjs/common";
import { GUARDS_METADATA, HEADERS_METADATA, INTERCEPTORS_METADATA } from "@nestjs/common/constants";
import { ApiResponse } from "@nestjs/swagger";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { describe, expect, it } from "vitest";

import { RouteCustomController, RouteCustomEmailResponseDto, RouteCustomEntity, RouteCustomPhoneResponseDto } from "./route-custom/fixture";

describe("ApiRouteCustom", () => {
	it("keeps runtime response targets out of route metadata", () => {
		const descriptor = Object.getOwnPropertyDescriptor(RouteCustomController.prototype, "handler") ?? {
			value: RouteCustomController.prototype.handler,
		};

		ApiRouteCustom<RouteCustomEntity>({
			resource: {
				action: "custom.action",
				entity: RouteCustomEntity,
			},
			response: {
				[EApiControllerResponseTarget.RESPONSE]: {
					transformers: [
						{
							key: "id",
							type: EApiControllerRequestTransformerType.STATIC,
							value: "transformed",
						},
					],
				},
				headers: {
					"Set-Cookie": {
						description: "Sets refresh token cookie.",
						schema: {
							type: "string",
						},
					},
				},
				serialization: {
					isEnabled: true,
				},
				status: HttpStatus.OK,
				type: undefined,
			},
			route: {
				method: RequestMethod.POST,
				path: "custom",
			},
		})(RouteCustomController.prototype, "handler", descriptor);

		const metadata = (Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, descriptor.value) ?? Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, RouteCustomController.prototype.handler) ?? Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, RouteCustomController.prototype, "handler")) as Record<string, unknown>;
		const runtimeProperties = (Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, descriptor.value) ?? Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, RouteCustomController.prototype.handler) ?? Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_RUNTIME_PROPERTIES_METADATA_KEY, RouteCustomController.prototype, "handler")) as Record<string, unknown>;
		const responses = (Reflect.getMetadata(DECORATORS.API_RESPONSE, descriptor.value) ?? Reflect.getMetadata(DECORATORS.API_RESPONSE, RouteCustomController.prototype.handler) ?? Reflect.getMetadata(DECORATORS.API_RESPONSE, RouteCustomController.prototype, "handler")) as Record<number, Record<string, unknown>>;

		expect(metadata.response).toEqual({
			errors: undefined,
			headers: {
				"Set-Cookie": {
					description: "Sets refresh token cookie.",
					schema: {
						type: "string",
					},
				},
			},
			serialization: {
				isEnabled: true,
			},
			status: HttpStatus.OK,
			type: undefined,
		});
		expect(metadata.response).not.toHaveProperty(EApiControllerResponseTarget.RESPONSE);
		expect(responses[HttpStatus.OK]?.headers).toEqual({
			"Set-Cookie": {
				description: "Sets refresh token cookie.",
				schema: {
					type: "string",
				},
			},
		});
		expect(runtimeProperties.response).toEqual({
			[EApiControllerResponseTarget.RESPONSE]: {
				transformers: [
					{
						key: "id",
						type: EApiControllerRequestTransformerType.STATIC,
						value: "transformed",
					},
				],
			},
		});
	});

	it("preserves response discriminator metadata for custom route swagger and serialization", () => {
		const descriptor = Object.getOwnPropertyDescriptor(RouteCustomController.prototype, "handler") ?? {
			value: RouteCustomController.prototype.handler,
		};

		ApiRouteCustom<RouteCustomEntity>({
			resource: {
				action: "custom.discriminated",
				entity: RouteCustomEntity,
			},
			response: {
				discriminator: {
					mapping: {
						email: RouteCustomEmailResponseDto,
						phone: RouteCustomPhoneResponseDto,
					},
					propertyName: "channel",
				},
				status: HttpStatus.OK,
				type: [RouteCustomEmailResponseDto, RouteCustomPhoneResponseDto],
			},
			route: {
				method: RequestMethod.POST,
				path: "custom",
			},
		})(RouteCustomController.prototype, "handler", descriptor);

		const metadata = (Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, descriptor.value) ?? Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, RouteCustomController.prototype.handler) ?? Reflect.getMetadata(METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY, RouteCustomController.prototype, "handler")) as Record<string, { discriminator?: unknown }>;

		expect(metadata.response?.discriminator).toEqual({
			mapping: {
				email: RouteCustomEmailResponseDto,
				phone: RouteCustomPhoneResponseDto,
			},
			propertyName: "channel",
		});
	});

	it("preserves existing handler metadata and composes custom execution and HTTP documentation", () => {
		class ExistingGuard {}
		class ExecutionGuard implements CanActivate {
			public canActivate(): boolean {
				return true;
			}
		}
		class ExistingInterceptor {}
		class ExecutionInterceptor implements NestInterceptor {
			public intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
				return next.handle();
			}
		}
		class Controller {
			public handler(_request: unknown): void {}
		}

		Req()(Controller.prototype, "handler", 0);
		const descriptor: PropertyDescriptor = Object.getOwnPropertyDescriptor(Controller.prototype, "handler") as PropertyDescriptor;
		const healthMetadataKey = "test:health-check";

		SetMetadata(healthMetadataKey, true)(Controller.prototype, "handler", descriptor);
		Header("Cache-Control", "no-cache")(Controller.prototype, "handler", descriptor);
		ApiResponse({ description: "Health check failed.", status: HttpStatus.SERVICE_UNAVAILABLE })(Controller.prototype, "handler", descriptor);
		UseGuards(ExistingGuard)(Controller.prototype, "handler", descriptor);
		UseInterceptors(ExistingInterceptor)(Controller.prototype, "handler", descriptor);

		ApiRouteCustom<RouteCustomEntity>({
			documentation: {
				request: {
					headers: [
						{
							description: "Canonical request nonce.",
							name: "X-Nonce",
							required: true,
							schema: { format: "uuid", type: "string" },
						},
					],
					mediaTypes: ["application/vnd.test+json"],
				},
				response: {
					mediaTypes: ["application/vnd.test+json"],
					statuses: [
						{
							description: "The admitted deadline expired.",
							status: HttpStatus.GATEWAY_TIMEOUT,
						},
					],
				},
			},
			dto: { [EApiDtoType.BODY]: RouteCustomEntity },
			execution: {
				guards: [ExecutionGuard],
				interceptors: [ExecutionInterceptor],
			},
			resource: {
				action: "custom.composed",
				entity: RouteCustomEntity,
			},
			response: {
				status: HttpStatus.OK,
				type: RouteCustomEntity,
			},
			route: {
				method: RequestMethod.POST,
				path: "custom",
			},
		})(Controller.prototype, "handler", descriptor);

		const handler: (...arguments_: Array<unknown>) => unknown = descriptor.value as (...arguments_: Array<unknown>) => unknown;
		const parameters: Array<Record<string, unknown>> = Reflect.getMetadata(DECORATORS.API_PARAMETERS, handler) as Array<Record<string, unknown>>;

		expect(Reflect.getMetadata(healthMetadataKey, handler)).toBe(true);
		expect(Reflect.getMetadata(HEADERS_METADATA, handler)).toEqual([{ name: "Cache-Control", value: "no-cache" }]);
		expect(Reflect.getMetadata(GUARDS_METADATA, handler)).toEqual([ExistingGuard, ExecutionGuard, ApiAuthorizationGuard]);
		expect(Reflect.getMetadata(INTERCEPTORS_METADATA, handler)).toEqual([ExistingInterceptor, ExecutionInterceptor, ApiRouteRuntimeInterceptor]);
		expect(Reflect.getMetadata(DECORATORS.API_CONSUMES, handler)).toEqual(["application/vnd.test+json"]);
		expect(Reflect.getMetadata(DECORATORS.API_PRODUCES, handler)).toEqual(["application/vnd.test+json"]);
		expect(parameters).toEqual(
			expect.arrayContaining([
				expect.objectContaining({
					in: "body",
					required: true,
					type: RouteCustomEntity,
				}),
				expect.objectContaining({
					in: "header",
					name: "X-Nonce",
					required: true,
				}),
			]),
		);
		const responses: Record<number, Record<string, unknown>> = Reflect.getMetadata(DECORATORS.API_RESPONSE, handler) as Record<number, Record<string, unknown>>;

		expect(responses[HttpStatus.SERVICE_UNAVAILABLE]).toEqual({
			description: "Health check failed.",
		});
		expect(responses[HttpStatus.GATEWAY_TIMEOUT]).toEqual({
			description: "The admitted deadline expired.",
		});
	});
});
