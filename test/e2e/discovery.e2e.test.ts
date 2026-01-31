import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { DiscoveryService } from "@nestjs/core";

import { ApiAuthorizationPolicyBase } from "@class/api/authorization/policy/base.class";
import { ApiAuthorizationPolicyDiscoveryService } from "@class/api/authorization/policy/discovery-service.class";
import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { ApiFunctionSubscriberBase } from "@class/api/subscriber/function-base.class";
import { ApiRouteSubscriberBase } from "@class/api/subscriber/route-base.class";
import { ApiSubscriberDiscoveryService } from "@class/api/subscriber/discovery-service.class";
import { apiSubscriberRegistry } from "@class/api/subscriber/registry.class";
import { AUTHORIZATION_POLICY_DECORATOR_CONSTANT } from "@constant/class/authorization/policy-decorator.constant";
import { ApiAuthorizationPolicy } from "@decorator/api/authorization-policy.decorator";
import { ApiFunctionSubscriber } from "@decorator/api/subscriber/function.decorator";
import { ApiRouteSubscriber } from "@decorator/api/subscriber/route.decorator";
import { afterEach, describe, expect, it, vi } from "vitest";

class PolicyEntity implements IApiBaseEntity {}

@ApiAuthorizationPolicy({ entity: PolicyEntity })
class PolicySubscriber extends ApiAuthorizationPolicyBase<PolicyEntity> {}

class SubscriberEntity implements IApiBaseEntity {}

@ApiFunctionSubscriber({ entity: SubscriberEntity, priority: 10 })
class FunctionSubscriber extends ApiFunctionSubscriberBase<SubscriberEntity> {}

@ApiRouteSubscriber({ entity: SubscriberEntity, priority: 5 })
class RouteSubscriber extends ApiRouteSubscriberBase<SubscriberEntity> {}

describe("Discovery services (E2E)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("registers authorization policies discovered from providers", () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		const registerSpy = vi.spyOn(registry, "registerSubscriber");
		const discoveryService = {
			getProviders: () => [
				{
					instance: new PolicySubscriber(),
					metatype: PolicySubscriber,
					name: "PolicySubscriber",
				},
				{
					instance: {},
					metatype: class NotAPolicy {},
					name: "NotAPolicy",
				},
			],
		} as unknown as DiscoveryService;

		const service = new ApiAuthorizationPolicyDiscoveryService(discoveryService, registry);

		service.onModuleInit();

		expect(registerSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				entity: PolicyEntity,
				policyId: `${PolicyEntity.name.toLowerCase()}${AUTHORIZATION_POLICY_DECORATOR_CONSTANT.DEFAULT_POLICY_ID_SUFFIX}`,
				priority: 0,
				subscriber: expect.any(PolicySubscriber),
			}),
		);

		registry.clear();
	});

	it("registers function and route subscribers discovered from providers", () => {
		const functionSpy = vi.spyOn(apiSubscriberRegistry, "registerFunctionSubscriber");
		const routeSpy = vi.spyOn(apiSubscriberRegistry, "registerRouteSubscriber");
		const discoveryService = {
			getProviders: () => [
				{
					instance: new FunctionSubscriber(),
					metatype: FunctionSubscriber,
					name: "FunctionSubscriber",
				},
				{
					instance: new RouteSubscriber(),
					metatype: RouteSubscriber,
					name: "RouteSubscriber",
				},
				{
					instance: {},
					metatype: class NotASubscriber {},
					name: "NotASubscriber",
				},
			],
		} as unknown as DiscoveryService;

		const service = new ApiSubscriberDiscoveryService(discoveryService);

		service.onModuleInit();

		expect(functionSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				entity: SubscriberEntity,
				priority: 10,
			}),
			expect.any(FunctionSubscriber),
		);
		expect(routeSpy).toHaveBeenCalledWith(
			expect.objectContaining({
				entity: SubscriberEntity,
				priority: 5,
			}),
			expect.any(RouteSubscriber),
		);
		expect(apiSubscriberRegistry.getFunctionSubscribers(SubscriberEntity.name)).toHaveLength(1);
		expect(apiSubscriberRegistry.getRouteSubscribers(SubscriberEntity.name)).toHaveLength(1);
	});
});
