import "reflect-metadata";

import { METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { ApiRouteCustom } from "@decorator/api";
import { EApiControllerRequestTransformerType, EApiControllerResponseTarget } from "@enum/decorator/api";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { describe, expect, it } from "vitest";

class RouteCustomEntity {
	public id?: string;
}

class RouteCustomController {
	public handler(): void {}
}

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

		expect(metadata.response).toEqual({
			errors: undefined,
			serialization: {
				isEnabled: true,
			},
			status: HttpStatus.OK,
			type: undefined,
		});
		expect(metadata.response).not.toHaveProperty(EApiControllerResponseTarget.RESPONSE);
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
});
