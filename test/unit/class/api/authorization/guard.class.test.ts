import type { ExecutionContext } from "@nestjs/common";

import { ApiAuthorizationGuard } from "@class/api/authorization/guard.class";
import { AUTHORIZATION_DECISION_METADATA_CONSTANT } from "@constant/class/authorization";
import { CONTROLLER_API_DECORATOR_CONSTANT } from "@constant/decorator/api/controller.constant";
import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import { ForbiddenException } from "@nestjs/common";
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

describe("ApiAuthorizationGuard", () => {
	it("allows access when controller is not securable", async () => {
		const policyRegistry = {
			buildAggregatedPolicy: vi.fn(),
			clear: vi.fn(),
			configureCache: vi.fn(),
			registerSubscriber: vi.fn(),
		};
		const authorizationEngine = { evaluate: vi.fn() };
		const guard = new ApiAuthorizationGuard(policyRegistry, authorizationEngine as never);
		const handler = function get() {};
		const controller = class {};
		const request = {};

		const context = createExecutionContext(controller, handler, request);
		const result = await guard.canActivate(context);

		expect(result).toBe(true);
		expect(policyRegistry.buildAggregatedPolicy).not.toHaveBeenCalled();
	});

	it("allows access when entity metadata is missing", async () => {
		const policyRegistry = {
			buildAggregatedPolicy: vi.fn(),
			clear: vi.fn(),
			configureCache: vi.fn(),
			registerSubscriber: vi.fn(),
		};
		const authorizationEngine = { evaluate: vi.fn() };
		const guard = new ApiAuthorizationGuard(policyRegistry, authorizationEngine as never);
		const handler = function get() {};
		const controller = class {};
		const request = {};

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);

		const context = createExecutionContext(controller, handler, request);
		const result = await guard.canActivate(context);

		expect(result).toBe(true);
		expect(policyRegistry.buildAggregatedPolicy).not.toHaveBeenCalled();
	});

	it("attaches decision and allows access when policy grants", async () => {
		const decision = {
			action: "get",
			appliedRules: [],
			effect: EAuthorizationEffect.ALLOW,
			policyId: "policy",
			policyIds: ["policy"],
			resourceType: "GuardEntity",
			subject: { id: "user", permissions: [], roles: [] },
			transforms: [],
		};
		const policyRegistry = {
			buildAggregatedPolicy: vi.fn().mockResolvedValue({
				action: "get",
				entity: GuardEntity,
				policyId: "policy",
				policyIds: ["policy"],
				rules: [],
			}),
			clear: vi.fn(),
			configureCache: vi.fn(),
			registerSubscriber: vi.fn(),
		};
		const authorizationEngine = { evaluate: vi.fn().mockResolvedValue(decision) };
		const guard = new ApiAuthorizationGuard(policyRegistry as never, authorizationEngine as never);
		const handler = function get() {};
		const controller = class {};
		const request: Record<string, unknown> = {};

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.ENTITY_METADATA_KEY, GuardEntity, controller);

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
			effect: EAuthorizationEffect.DENY,
			policyId: "policy",
			policyIds: ["policy"],
			resourceType: "GuardEntity",
			subject: { id: "user", permissions: [], roles: [] },
			transforms: [],
		};
		const policyRegistry = {
			buildAggregatedPolicy: vi.fn().mockResolvedValue({
				action: "get",
				entity: GuardEntity,
				policyId: "policy",
				policyIds: ["policy"],
				rules: [],
			}),
			clear: vi.fn(),
			configureCache: vi.fn(),
			registerSubscriber: vi.fn(),
		};
		const authorizationEngine = { evaluate: vi.fn().mockResolvedValue(decision) };
		const guard = new ApiAuthorizationGuard(policyRegistry as never, authorizationEngine as never);
		const handler = function get() {};
		const controller = class {};
		const request: Record<string, unknown> = {};

		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.SECURABLE_METADATA_KEY, true, controller);
		Reflect.defineMetadata(CONTROLLER_API_DECORATOR_CONSTANT.ENTITY_METADATA_KEY, GuardEntity, controller);

		const context = createExecutionContext(controller, handler, request);

		await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
	});
});
