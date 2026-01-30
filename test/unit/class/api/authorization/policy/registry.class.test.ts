import "reflect-metadata";

import type { IApiAuthorizationPolicySubscriber } from "@interface/class/api/authorization/policy/subscriber/interface";
import type { IApiAuthorizationPolicySubscriberRule } from "@interface/class/api/authorization/policy/subscriber/rule.interface";

import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { AUTHORIZATION_POLICY_DECORATOR_CONSTANT } from "@constant/class/authorization/policy-decorator.constant";
import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it, vi } from "vitest";

@Entity("policy_entities")
class PolicyEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public name!: string;
}

describe("ApiAuthorizationPolicyRegistry", () => {
	it("returns undefined when no subscribers are registered", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();

		const policy = await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);

		expect(policy).toBeUndefined();
	});

	it("builds aggregated policy with normalized priorities and context", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		const ruleA: IApiAuthorizationPolicySubscriberRule<PolicyEntity, PolicyEntity> = {
			effect: EAuthorizationEffect.ALLOW,
			priority: 0,
		};
		const ruleB: IApiAuthorizationPolicySubscriberRule<PolicyEntity, PolicyEntity> = {
			effect: EAuthorizationEffect.ALLOW,
			priority: 5,
		};

		const onBeforeGetA = vi.fn().mockResolvedValue([ruleA]);
		const onBeforeGetB = vi.fn().mockResolvedValue([ruleB]);
		const subscriberA = {
			onBeforeGet: onBeforeGetA,
		} as IApiAuthorizationPolicySubscriber<PolicyEntity>;
		const subscriberB = {
			onBeforeGet: onBeforeGetB,
		} as IApiAuthorizationPolicySubscriber<PolicyEntity>;

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-a",
			priority: 1,
			subscriber: subscriberA,
		});
		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-b",
			priority: 10,
			subscriber: subscriberB,
		});

		const policy = await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET, {
			authenticationRequest: {
				user: {
					id: "user-42",
					permissions: ["read"],
					roles: ["admin"],
				},
			},
		});

		expect(policy).toBeDefined();
		expect(policy?.action).toBe(EApiRouteType.GET);
		expect(policy?.entity).toBe(PolicyEntity);
		expect(policy?.policyId).toBe(`${PolicyEntity.name.toLowerCase()}${AUTHORIZATION_POLICY_DECORATOR_CONSTANT.DEFAULT_POLICY_ID_SUFFIX}`);
		expect(policy?.policyIds).toEqual(expect.arrayContaining(["policy-a", "policy-b"]));
		expect(policy?.rules?.[0]?.policyId).toBe("policy-b");
		expect(onBeforeGetA).toHaveBeenCalledTimes(1);
		expect(onBeforeGetB).toHaveBeenCalledTimes(1);

		const context = onBeforeGetA.mock.calls[0]?.[0];
		expect(context.routeType).toBe(EApiRouteType.GET);
		expect(context.subject.id).toBe("user-42");
	});

	it("caches rules when cache is enabled", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		registry.configureCache({ isEnabled: true, ttlMs: 60_000 });

		const onBeforeGet = vi.fn().mockResolvedValue([
			{
				effect: EAuthorizationEffect.ALLOW,
			},
		]);
		const subscriber = { onBeforeGet } as IApiAuthorizationPolicySubscriber<PolicyEntity>;

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-cache",
			priority: 0,
			subscriber,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);
		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);

		expect(onBeforeGet).toHaveBeenCalledTimes(1);
	});

	it("expires cached rules after ttl", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

		const registry = new ApiAuthorizationPolicyRegistry();
		registry.configureCache({ isEnabled: true, ttlMs: 10 });

		const onBeforeGet = vi.fn().mockResolvedValue([
			{
				effect: EAuthorizationEffect.ALLOW,
			},
		]);
		const subscriber = { onBeforeGet } as IApiAuthorizationPolicySubscriber<PolicyEntity>;

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-ttl",
			priority: 0,
			subscriber,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);
		expect(onBeforeGet).toHaveBeenCalledTimes(1);

		vi.setSystemTime(new Date("2026-01-01T00:00:00.050Z"));

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);
		expect(onBeforeGet).toHaveBeenCalledTimes(2);

		vi.useRealTimers();
	});

	it("invalidates cache when new subscriber is registered", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		registry.configureCache({ isEnabled: true, ttlMs: 60_000 });

		const onBeforeGetA = vi.fn().mockResolvedValue([
			{
				effect: EAuthorizationEffect.ALLOW,
			},
		]);
		const subscriberA = { onBeforeGet: onBeforeGetA } as IApiAuthorizationPolicySubscriber<PolicyEntity>;

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-a",
			priority: 0,
			subscriber: subscriberA,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);
		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);

		expect(onBeforeGetA).toHaveBeenCalledTimes(1);

		const onBeforeGetB = vi.fn().mockResolvedValue([
			{
				effect: EAuthorizationEffect.ALLOW,
			},
		]);
		const subscriberB = { onBeforeGet: onBeforeGetB } as IApiAuthorizationPolicySubscriber<PolicyEntity>;

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-b",
			priority: 0,
			subscriber: subscriberB,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);

		expect(onBeforeGetA).toHaveBeenCalledTimes(2);
		expect(onBeforeGetB).toHaveBeenCalledTimes(1);
	});
});
