import "reflect-metadata";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { ApiRouteCustom } from "@decorator/api";
import { EApiControllerRequestTransformerType, EApiControllerResponseTarget } from "@enum/decorator/api";
import { HttpStatus, RequestMethod } from "@nestjs/common";
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
});
