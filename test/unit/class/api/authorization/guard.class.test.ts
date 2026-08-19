import type { ExecutionContext } from "@nestjs/common";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { AUTHORIZATION_DECISION_METADATA_CONSTANT } from "@constant/class/authorization";
import { CONTROLLER_API_DECORATOR_CONSTANT, METHOD_API_DECORATOR_CONSTANT } from "@constant/decorator/api";
import { EApiAuthorizationDecisionType, EApiAuthorizationMode, EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
import { EApiRouteType } from "@enum/decorator/api";
import { ForbiddenException, RequestMethod } from "@nestjs/common";
import { ApiControllerIdentityPlanSet } from "@utility/api/controller/identity";
import { describe, expect, it, vi } from "vitest";

class GuardEntity {
	public id?: string;
}

const createExecutionContext = (controller: object, handler: () => void, request: Record<string, unknown>): ExecutionContext =>
	({
		getArgByIndex: () => undefined,
		getArgs: () => [],
		getClass: () => controller,
		getHandler: () => handler,
		getType: () => "http",
		switchToHttp: () => ({
			getRequest: () => request,
		}),
		switchToRpc: () => ({
			getContext: () => undefined,
			getData: () => undefined,
		}),
		switchToWs: () => ({
			getClient: () => undefined,
			getData: () => undefined,
		}),
	}) as unknown as ExecutionContext;

const defineRouteMetadata = (handler: () => void, action: string, routeType?: EApiRouteType, authorizationMode: EApiAuthorizationMode = EApiAuthorizationMode.HOOKS): void => {
	Reflect.defineMetadata(
		METHOD_API_DECORATOR_CONSTANT.ROUTE_METADATA_KEY,
		{
			resource: {
				action,
				entity: GuardEntity,
			},
			route: {
				method: RequestMethod.GET,
				path: "",
				type: routeType,
			},
			security: {
				authorization: {
					mode: authorizationMode,
				},
			},
		},
		handler,
	);
};

describe("ApiAuthorizationGuard", () => {
	it("allows access when controller is not securable", async () => {
		const runtime = { evaluate: vi.fn() };
		const guard = new ApiAuthorizationGuard(runtime as never);
		const handler = function get() {};
		const controller = class {};
		const request = {};

		const context = createExecutionContext(controller, handler, request);
		const result = await guard.canActivate(context);

		expect(result).toBe(true);
		expect(runtime.evaluate).not.toHaveBeenCalled();
	});

	it("throws when securable controller does not declare authorization metadata", async () => {
		const runtime = { evaluate: vi.fn() };
		const guard = new ApiAuthorizationGuard(runtime as never);
		const handler = function get() {};
		const controller = class {};
		const request = {};

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);

		const context = createExecutionContext(controller, handler, request);
		await expect(guard.canActivate(context)).rejects.toThrow("ApiControllerSecurable requires an authorization block");
	});

	it("throws when a securable handler does not declare ApiMethod authorization metadata", async () => {
		const runtime = { evaluate: vi.fn() };
		const guard = new ApiAuthorizationGuard(runtime as never);
		const handler = function publish() {};
		const controller = class {};
		const request = {};

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
		Reflect.defineMetadata(
			CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
			{
				authorization: {
					defaultMode: EApiAuthorizationMode.HOOKS,
				},
				entity: GuardEntity,
				routes: {
					update: {},
				},
			},
			controller,
		);

		const context = createExecutionContext(controller, handler, request);
		await expect(guard.canActivate(context)).rejects.toThrow('ApiControllerSecurable handler "publish" requires method-level ApiRouteMetadata');
	});

	it("attaches decision and allows access when policy grants", async () => {
		const decision = {
			action: "get",
			appliedRules: [],
			effect: EApiPolicyEffect.ALLOW,
			mode: EApiAuthorizationMode.HOOKS,
			permissions: ["admin.item.read"],
			policyId: "policy",
			policyIds: ["policy"],
			principal: { attributes: {}, id: "user", roles: [], type: EApiAuthorizationPrincipalType.USER },
			resourceType: "GuardEntity",
			trace: { decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW, mode: EApiAuthorizationMode.HOOKS, permissions: ["admin.item.read"] },
			transforms: [],
		};
		const runtime = { evaluate: vi.fn().mockResolvedValue(decision) };
		const guard = new ApiAuthorizationGuard(runtime as never);
		const handler = function get() {};
		const controller = class {};
		const request: Record<string, unknown> = {};

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
		Reflect.defineMetadata(
			CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
			{
				authorization: {
					defaultMode: EApiAuthorizationMode.HOOKS,
				},
				entity: GuardEntity,
				routes: {
					get: {},
				},
			},
			controller,
		);
		defineRouteMetadata(handler, "get", EApiRouteType.GET);

		const context = createExecutionContext(controller, handler, request);
		const result = await guard.canActivate(context);

		expect(result).toBe(true);
		expect(request.authorizationDecision).toBe(decision);
		expect(request[AUTHORIZATION_DECISION_METADATA_CONSTANT.REQUEST_KEY]).toBe(decision);
	});

	it("throws ForbiddenException when decision denies", async () => {
		const decision = {
			action: "get",
			appliedRules: [],
			effect: EApiPolicyEffect.DENY,
			mode: EApiAuthorizationMode.HOOKS,
			permissions: [],
			policyId: "policy",
			policyIds: ["policy"],
			principal: { attributes: {}, id: "user", roles: [], type: EApiAuthorizationPrincipalType.USER },
			resourceType: "GuardEntity",
			trace: { decisionType: EApiAuthorizationDecisionType.IMPLICIT_DENY, mode: EApiAuthorizationMode.HOOKS, permissions: [] },
			transforms: [],
		};
		const runtime = { evaluate: vi.fn().mockResolvedValue(decision) };
		const guard = new ApiAuthorizationGuard(runtime as never);
		const handler = function get() {};
		const controller = class {};
		const request: Record<string, unknown> = {};

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
		Reflect.defineMetadata(
			CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
			{
				authorization: {
					defaultMode: EApiAuthorizationMode.HOOKS,
				},
				entity: GuardEntity,
				routes: {
					get: {},
				},
			},
			controller,
		);
		defineRouteMetadata(handler, "get", EApiRouteType.GET);

		const context = createExecutionContext(controller, handler, request);

		await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
	});

	it("extracts request metadata and delegates controller metadata to runtime", async () => {
		const decision = {
			action: "partialUpdate",
			appliedRules: [],
			effect: EApiPolicyEffect.ALLOW,
			mode: EApiAuthorizationMode.HOOKS,
			permissions: ["admin.item.update"],
			policyId: "policy",
			policyIds: ["policy"],
			principal: {
				attributes: { operatorId: "operator-1" },
				id: "custom-user",
				roles: ["operator-admin"],
				type: EApiAuthorizationPrincipalType.USER,
			},
			resourceType: "GuardEntity",
			trace: { decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW, mode: EApiAuthorizationMode.HOOKS, permissions: ["admin.item.update"] },
			transforms: [],
		};
		const runtime = { evaluate: vi.fn().mockResolvedValue(decision) };
		const guard = new ApiAuthorizationGuard(runtime as never);
		const handler = function partialUpdate() {};
		const controller = class {};
		const request: Record<string, unknown> = {
			body: { name: "Updated" },
			headers: { "x-trace-id": "trace-1" },
			ip: "127.0.0.1",
			method: "PATCH",
			params: { id: "entity-1" },
			query: { page: "1" },
			user: {
				session: {
					sub: "custom-user",
				},
			},
		};

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
		Reflect.defineMetadata(
			CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
			{
				authorization: {
					defaultMode: EApiAuthorizationMode.HOOKS,
				},
				entity: GuardEntity,
				routes: {
					partialUpdate: {
						authorization: {
							mode: EApiAuthorizationMode.HOOKS,
						},
					},
				},
			},
			controller,
		);
		defineRouteMetadata(handler, "partialUpdate", EApiRouteType.PARTIAL_UPDATE);

		const context = createExecutionContext(controller, handler, request);
		const result = await guard.canActivate(context);

		expect(result).toBe(true);
		expect(runtime.evaluate).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "partialUpdate",
				authenticationRequest: request,
				authorization: {
					defaultMode: EApiAuthorizationMode.HOOKS,
				},
				entity: GuardEntity,
				requestMetadata: {
					body: { name: "Updated" },
					headers: { "x-trace-id": "trace-1" },
					ip: "127.0.0.1",
					parameters: { id: "entity-1" },
					query: { page: "1" },
				},
				routeAuthorization: {
					mode: EApiAuthorizationMode.HOOKS,
				},
			}),
		);
	});

	it.each([EApiAuthorizationMode.HOOKS, EApiAuthorizationMode.IAM])("canonicalizes an identity alias for %s authorization without mutating raw request params", async (mode) => {
		const decision = {
			action: "get",
			appliedRules: [],
			effect: EApiPolicyEffect.ALLOW,
			mode,
			permissions: ["admin.item.read"],
			policyId: "policy",
			policyIds: ["policy"],
			principal: { attributes: {}, id: "user", roles: [], type: EApiAuthorizationPrincipalType.USER },
			resourceType: "GuardEntity",
			trace: { decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW, mode, permissions: ["admin.item.read"] },
			transforms: [],
		};
		const runtime = { evaluate: vi.fn().mockResolvedValue(decision) };
		const guard = new ApiAuthorizationGuard(runtime as never);
		const handler = function get() {};
		const controller = class {};
		const rawParameters = { gameId: "entity-1", ownerId: "owner-1" };
		const request: Record<string, unknown> = { params: rawParameters };

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
		Reflect.defineMetadata(
			CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
			{
				authorization: { defaultMode: mode },
				entity: GuardEntity,
				routes: { get: { authorization: { mode } } },
			},
			controller,
		);
		ApiControllerIdentityPlanSet(handler, {
			controllerName: "GuardIdentityController",
			field: "id",
			parameter: "gameId",
			schemaName: "GuardIdentityControllerGetIdentityDTO",
			signature: "guard-identity",
		});
		defineRouteMetadata(handler, "get", EApiRouteType.GET, mode);

		const context = createExecutionContext(controller, handler, request);
		await expect(guard.canActivate(context)).resolves.toBe(true);

		expect(runtime.evaluate).toHaveBeenCalledWith(
			expect.objectContaining({
				requestMetadata: expect.objectContaining({
					parameters: {
						gameId: "entity-1",
						id: "entity-1",
						ownerId: "owner-1",
					},
				}),
			}),
		);
		expect(request.params).toBe(rawParameters);
		expect(rawParameters).toEqual({ gameId: "entity-1", ownerId: "owner-1" });
		expect(Object.hasOwn(rawParameters, "id")).toBe(false);
	});

	it("uses only the exact inherited controller handler identity plan", async () => {
		const decision = {
			action: "get",
			appliedRules: [],
			effect: EApiPolicyEffect.ALLOW,
			mode: EApiAuthorizationMode.HOOKS,
			permissions: ["admin.item.read"],
			policyId: "policy",
			policyIds: ["policy"],
			principal: { attributes: {}, id: "user", roles: [], type: EApiAuthorizationPrincipalType.USER },
			resourceType: "GuardEntity",
			trace: { decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW, mode: EApiAuthorizationMode.HOOKS, permissions: ["admin.item.read"] },
			transforms: [],
		};
		const runtime = { evaluate: vi.fn().mockResolvedValue(decision) };
		const guard = new ApiAuthorizationGuard(runtime as never);

		class AliasedBaseController {
			public get(): void {}
		}

		class CanonicalDerivedController extends AliasedBaseController {
			public override get(): void {}
		}

		class DifferentAliasDerivedController extends AliasedBaseController {
			public override get(): void {}
		}

		const aliasedHandler = AliasedBaseController.prototype.get;
		const canonicalHandler = CanonicalDerivedController.prototype.get;
		const differentAliasHandler = DifferentAliasDerivedController.prototype.get;

		ApiControllerIdentityPlanSet(aliasedHandler, {
			controllerName: "AliasedBaseController",
			field: "id",
			parameter: "gameId",
			schemaName: "AliasedBaseControllerGetIdentityDTO",
			signature: "aliased-base",
		});
		ApiControllerIdentityPlanSet(differentAliasHandler, {
			controllerName: "DifferentAliasDerivedController",
			field: "id",
			parameter: "itemId",
			schemaName: "DifferentAliasDerivedControllerGetIdentityDTO",
			signature: "different-alias-derived",
		});

		const cases: Array<{
			controller: object;
			expectedParameters: Record<string, string>;
			handler: () => void;
			rawParameters: Record<string, string>;
		}> = [
			{
				controller: AliasedBaseController,
				expectedParameters: { gameId: "base-id", id: "base-id" },
				handler: aliasedHandler,
				rawParameters: { gameId: "base-id" },
			},
			{
				controller: CanonicalDerivedController,
				expectedParameters: { gameId: "must-not-replace-canonical-id", id: "canonical-id" },
				handler: canonicalHandler,
				rawParameters: { gameId: "must-not-replace-canonical-id", id: "canonical-id" },
			},
			{
				controller: DifferentAliasDerivedController,
				expectedParameters: { id: "different-id", itemId: "different-id" },
				handler: differentAliasHandler,
				rawParameters: { itemId: "different-id" },
			},
		];

		for (const { controller, expectedParameters, handler, rawParameters } of cases) {
			Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
			Reflect.defineMetadata(
				CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
				{
					authorization: { defaultMode: EApiAuthorizationMode.HOOKS },
					entity: GuardEntity,
					routes: { get: { authorization: { mode: EApiAuthorizationMode.HOOKS } } },
				},
				controller,
			);
			defineRouteMetadata(handler, "get", EApiRouteType.GET);

			await expect(guard.canActivate(createExecutionContext(controller, handler, { params: rawParameters }))).resolves.toBe(true);

			expect(runtime.evaluate).toHaveBeenLastCalledWith(
				expect.objectContaining({
					requestMetadata: expect.objectContaining({ parameters: expectedParameters }),
				}),
			);
		}
	});

	it("prefers explicit authorization metadata over the custom handler name", async () => {
		const decision = {
			action: "update.publish",
			appliedRules: [],
			effect: EApiPolicyEffect.ALLOW,
			mode: EApiAuthorizationMode.HOOKS,
			permissions: ["admin.item.update"],
			policyId: "policy",
			policyIds: ["policy"],
			principal: { attributes: {}, id: "user", roles: [], type: EApiAuthorizationPrincipalType.USER },
			resourceType: "GuardEntity",
			trace: { decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW, mode: EApiAuthorizationMode.HOOKS, permissions: ["admin.item.update"] },
			transforms: [],
		};
		const runtime = { evaluate: vi.fn().mockResolvedValue(decision) };
		const guard = new ApiAuthorizationGuard(runtime as never);
		const handler = function publish() {};
		const controller = class {};
		const request: Record<string, unknown> = {
			method: "POST",
			params: { id: "entity-1" },
		};

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
		Reflect.defineMetadata(
			CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
			{
				authorization: {
					defaultMode: EApiAuthorizationMode.HOOKS,
				},
				entity: GuardEntity,
				routes: {
					update: {},
				},
			},
			controller,
		);
		defineRouteMetadata(handler, "update.publish");

		const context = createExecutionContext(controller, handler, request);
		const result = await guard.canActivate(context);

		expect(result).toBe(true);
		expect(runtime.evaluate).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "update.publish",
				routeAuthorization: {
					mode: EApiAuthorizationMode.HOOKS,
				},
			}),
		);
	});

	it("uses explicit routeType metadata for generated CRUD handlers", async () => {
		const decision = {
			action: "partialUpdate",
			appliedRules: [],
			effect: EApiPolicyEffect.ALLOW,
			mode: EApiAuthorizationMode.HOOKS,
			permissions: ["admin.item.update"],
			policyId: "policy",
			policyIds: ["policy"],
			principal: { attributes: {}, id: "user", roles: [], type: EApiAuthorizationPrincipalType.USER },
			resourceType: "GuardEntity",
			trace: { decisionType: EApiAuthorizationDecisionType.EXPLICIT_ALLOW, mode: EApiAuthorizationMode.HOOKS, permissions: ["admin.item.update"] },
			transforms: [],
		};
		const runtime = { evaluate: vi.fn().mockResolvedValue(decision) };
		const guard = new ApiAuthorizationGuard(runtime as never);
		const handler = function partialUpdate() {};
		const controller = class {};
		const request: Record<string, unknown> = {
			method: "PATCH",
			params: { id: "entity-1" },
		};

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
		Reflect.defineMetadata(
			CONTROLLER_API_DECORATOR_CONSTANT.PROPERTIES_METADATA_KEY,
			{
				authorization: {
					defaultMode: EApiAuthorizationMode.HOOKS,
				},
				entity: GuardEntity,
				routes: {
					partialUpdate: {
						authorization: {
							mode: EApiAuthorizationMode.HOOKS,
						},
					},
				},
			},
			controller,
		);
		defineRouteMetadata(handler, "partialUpdate", EApiRouteType.PARTIAL_UPDATE);

		const context = createExecutionContext(controller, handler, request);
		const result = await guard.canActivate(context);

		expect(result).toBe(true);
		expect(runtime.evaluate).toHaveBeenCalledWith(
			expect.objectContaining({
				action: "partialUpdate",
				routeType: EApiRouteType.PARTIAL_UPDATE,
				routeAuthorization: {
					mode: EApiAuthorizationMode.HOOKS,
				},
			}),
		);
	});
});
