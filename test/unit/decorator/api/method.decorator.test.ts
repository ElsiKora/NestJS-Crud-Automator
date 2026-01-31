import "reflect-metadata";

import type { Type } from "@nestjs/common";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { ApiMethod } from "@decorator/api/method.decorator";
import { EApiAction, EApiAuthenticationType } from "@enum/decorator/api";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { HttpStatus, RequestMethod } from "@nestjs/common";
import { DECORATORS } from "@nestjs/swagger/dist/constants";
import { describe, expect, it } from "vitest";

class MethodEntity {
	public static name = "MethodEntity";
}

class MethodController {
	public handler(): void {}
}

const applyDecorator = (decorator: ReturnType<typeof ApiMethod>): void => {
	const descriptor = Object.getOwnPropertyDescriptor(MethodController.prototype, "handler") ?? {
		value: MethodController.prototype.handler,
	};
	decorator(MethodController.prototype, "handler", descriptor);
};

describe("ApiMethod", () => {
	it("applies decorators for all actions", () => {
		for (const action of Object.values(EApiAction)) {
			const decorator = ApiMethod({
				action,
				entity: MethodEntity,
				httpCode: HttpStatus.OK,
				method: RequestMethod.GET,
				path: "/",
				responseType: undefined,
			});

			applyDecorator(decorator);
		}
	});

	it("applies responses, throttling, authentication, and HTTP methods", () => {
		class CustomGuard {}
		class ResponseDto {}

		const methods = [RequestMethod.POST, RequestMethod.PUT, RequestMethod.PATCH, RequestMethod.DELETE, RequestMethod.GET];

		for (const method of methods) {
			const decorator = ApiMethod({
				action: EApiAction.CREATE,
				authentication: {
					bearerStrategies: ["bearer"],
					guard: CustomGuard as unknown as Type,
					securityStrategies: ["apiKey"],
					type: EApiAuthenticationType.USER,
				},
				entity: MethodEntity,
				httpCode: HttpStatus.CREATED,
				method,
				path: "/secured",
				responseType: ResponseDto,
				responses: {
					hasBadRequest: true,
					hasConflict: true,
					hasForbidden: true,
					hasInternalServerError: true,
					hasNotFound: true,
					hasTooManyRequests: true,
					hasUnauthorized: true,
				},
				throttler: {
					limit: 2,
					ttl: 10,
				},
			});

			applyDecorator(decorator);
		}
	});

	it("generates summary and description when not provided", () => {
		const decorator = ApiMethod({
			action: EApiAction.FETCH_LIST,
			entity: MethodEntity,
			httpCode: HttpStatus.OK,
			method: RequestMethod.GET,
			path: "/items",
			responseType: undefined,
		});

		applyDecorator(decorator);

		const operation = (Reflect.getMetadata(DECORATORS.API_OPERATION, MethodController.prototype, "handler") as { summary?: string; description?: string }) ?? (Reflect.getMetadata(DECORATORS.API_OPERATION, MethodController.prototype.handler) as { summary?: string; description?: string });

		expect(operation.summary).toContain("Fetching list");
		expect(operation.summary).toContain("MethodEntities");
		expect(operation.description).toContain("fetching list");
	});

	it("registers guards and security metadata", () => {
		class CustomGuard {}

		const decorator = ApiMethod({
			action: EApiAction.CREATE,
			authentication: {
				bearerStrategies: ["jwt"],
				guard: CustomGuard as unknown as Type,
				securityStrategies: ["apiKey"],
				type: EApiAuthenticationType.USER,
			},
			entity: MethodEntity,
			httpCode: HttpStatus.CREATED,
			method: RequestMethod.POST,
			path: "/secured",
			responseType: undefined,
		});

		applyDecorator(decorator);

		const guards = (Reflect.getMetadata(GUARDS_METADATA, MethodController.prototype, "handler") as Array<unknown>) ?? (Reflect.getMetadata(GUARDS_METADATA, MethodController.prototype.handler) as Array<unknown>);
		const securities = (Reflect.getMetadata(DECORATORS.API_SECURITY, MethodController.prototype, "handler") as Array<Record<string, Array<string>>>) ?? (Reflect.getMetadata(DECORATORS.API_SECURITY, MethodController.prototype.handler) as Array<Record<string, Array<string>>>);

		expect(guards).toEqual(expect.arrayContaining([CustomGuard, ApiAuthorizationGuard]));
		expect(securities).toEqual(expect.arrayContaining([{ jwt: [] }, { apiKey: [] }]));
	});

	it("throws for unsupported HTTP methods", () => {
		const invoke = () =>
			ApiMethod({
				action: EApiAction.CREATE,
				entity: MethodEntity,
				httpCode: HttpStatus.OK,
				method: RequestMethod.OPTIONS,
				path: "/",
				responseType: undefined,
			});

		expect(invoke).toThrow("ApiMethod error: Method");
	});
});
