import "reflect-metadata";

import type { CallHandler, ExecutionContext } from "@nestjs/common";

import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { UuidCanonicalInterceptor } from "@interceptor/uuid-canonical.interceptor";
import { Body, Query } from "@nestjs/common";
import { ApiControllerPathPlanSet } from "@utility/api/controller/path/plan/set.utility";
import { IsUUID } from "class-validator";
import { lastValueFrom, of } from "rxjs";
import { describe, expect, it, vi } from "vitest";

const LOWER_UUID: string = "6f1b0c7e-5c3b-4c0a-8a1a-0d6f3e2b1a11";
const UPPER_UUID: string = LOWER_UUID.toUpperCase();

class CanonicalInterceptorDto {
	@IsUUID()
	public ownerId!: string;
}

class CanonicalInterceptorController {
	public generatedList(@Query() _query: CanonicalInterceptorDto): void {}

	public keyed(@Body("payload") _payload: CanonicalInterceptorDto): void {}

	public listed(@Query() _query: CanonicalInterceptorDto): void {}

	public plain(@Body() _body: Record<string, unknown>, @Query("ownerId") _ownerId: string): void {}

	public written(@Body() _body: CanonicalInterceptorDto): void {}
}

class CanonicalInterceptorChildController extends CanonicalInterceptorController {}

Reflect.defineMetadata("design:paramtypes", [CanonicalInterceptorDto], CanonicalInterceptorController.prototype, "generatedList");
Reflect.defineMetadata("design:paramtypes", [CanonicalInterceptorDto], CanonicalInterceptorController.prototype, "keyed");
Reflect.defineMetadata("design:paramtypes", [CanonicalInterceptorDto], CanonicalInterceptorController.prototype, "listed");
Reflect.defineMetadata("design:paramtypes", [Object, String], CanonicalInterceptorController.prototype, "plain");
Reflect.defineMetadata("design:paramtypes", [CanonicalInterceptorDto], CanonicalInterceptorController.prototype, "written");
ApiControllerPathPlanSet(CanonicalInterceptorController.prototype, "generatedList", {} as never);

/**
 * Builds the execution context of one request to a handler.
 * @param {string} methodName - Handler name.
 * @param {{ body?: unknown; query?: unknown }} request - Request body and query.
 * @param {new () => CanonicalInterceptorController} [controller] - Controller class.
 * @returns {ExecutionContext} The context.
 */
const buildContext = (methodName: keyof CanonicalInterceptorController, request: { body?: unknown; query?: unknown }, controller: new () => CanonicalInterceptorController = CanonicalInterceptorController): ExecutionContext => ({ getClass: () => controller, getHandler: () => Reflect.get(CanonicalInterceptorController.prototype, methodName) as object, switchToHttp: () => ({ getRequest: () => request }) }) as unknown as ExecutionContext;

/**
 * Runs the interceptor and returns the failure it throws.
 * @param {ExecutionContext} context - Execution context.
 * @returns {ApiRequestValidationException | undefined} The failure, or undefined when the request passed.
 */
const run = (context: ExecutionContext): ApiRequestValidationException | undefined => {
	try {
		void new UuidCanonicalInterceptor().intercept(context, { handle: () => of("result") });
	} catch (error) {
		return error as ApiRequestValidationException;
	}

	return undefined;
};

describe("UuidCanonicalInterceptor", () => {
	it("refuses an upper-case body UUID before the next handler, with the uuidNotCanonical failure", () => {
		const handle: CallHandler["handle"] = vi.fn(() => of("result"));
		const interceptor: UuidCanonicalInterceptor = new UuidCanonicalInterceptor();

		expect(() => interceptor.intercept(buildContext("written", { body: { ownerId: UPPER_UUID } }), { handle })).toThrow(ApiRequestValidationException);
		expect(handle).not.toHaveBeenCalled();
		expect(run(buildContext("written", { body: { ownerId: UPPER_UUID } }))?.validationErrors).toEqual([expect.objectContaining({ constraints: { uuidNotCanonical: "ownerId must be a lower-case UUID" }, property: "ownerId" })]);
	});

	it("hands a lower-case UUID on to the next handler", async () => {
		await expect(lastValueFrom(new UuidCanonicalInterceptor().intercept(buildContext("written", { body: { ownerId: LOWER_UUID } }), { handle: () => of("result") }))).resolves.toBe("result");
	});

	it("reads the part of the body a @Body(key) argument names, under that key", () => {
		expect(run(buildContext("keyed", { body: { payload: { ownerId: UPPER_UUID } } }))?.validationErrors.map(({ property }: { property: string }) => property)).toEqual(["payload.ownerId"]);
		expect(run(buildContext("keyed", { body: { ownerId: UPPER_UUID } }))).toBeUndefined();
	});

	it("refuses an upper-case query UUID of a route that is not a generated GET_LIST", () => {
		expect(run(buildContext("listed", { query: { ownerId: UPPER_UUID } }))?.getResponse()).toMatchObject({ message: ["ownerId must be a lower-case UUID"] });
	});

	it("leaves the query of a generated GET_LIST to its filter parser", () => {
		expect(run(buildContext("generatedList", { query: { ownerId: UPPER_UUID } }))).toBeUndefined();
	});

	it("checks nothing for an argument that is not typed as a class", () => {
		expect(run(buildContext("plain", { body: { ownerId: UPPER_UUID }, query: { ownerId: UPPER_UUID } }))).toBeUndefined();
	});

	it("finds an inherited handler through the subclass", () => {
		expect(run(buildContext("written", { body: { ownerId: UPPER_UUID } }, CanonicalInterceptorChildController))).toBeInstanceOf(ApiRequestValidationException);
	});
});
