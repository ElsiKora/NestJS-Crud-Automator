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
import { describe, expect, it } from "vitest";

class MethodEntity {
	public id?: string;
}

class MethodController {
	public handler(): void {}
}

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

describe("ApiMethod", () => {
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
					bearerStrategies: ["bearer"],
					guard: CustomGuard as unknown as Type,
					securityStrategies: ["apiKey"],
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

		const guards = (Reflect.getMetadata(GUARDS_METADATA, MethodController.prototype, "handler") as Array<unknown>) ?? (Reflect.getMetadata(GUARDS_METADATA, MethodController.prototype.handler) as Array<unknown>);
		const securities = (Reflect.getMetadata(DECORATORS.API_SECURITY, MethodController.prototype, "handler") as Array<Record<string, Array<string>>>) ?? (Reflect.getMetadata(DECORATORS.API_SECURITY, MethodController.prototype.handler) as Array<Record<string, Array<string>>>);

		expect(guards).toEqual(expect.arrayContaining([CustomGuard, ApiAuthorizationGuard]));
		expect(securities).toEqual(expect.arrayContaining([{ bearer: [] }, { apiKey: [] }]));
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

	it("throws for unsupported HTTP methods", () => {
		const invoke = () => ApiMethod({ metadata: createMetadata({ route: { method: RequestMethod.OPTIONS, path: "/", type: EApiRouteType.CREATE } }) });

		expect(invoke).toThrow("ApiMethod error: Method");
	});
});
