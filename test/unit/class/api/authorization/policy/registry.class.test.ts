import "reflect-metadata";

import type { IApiAuthorizationPolicySubscriber } from "@interface/class/api/authorization/policy/subscriber/interface";
import type { IApiAuthorizationPolicySubscriberRule } from "@interface/class/api/authorization/policy/subscriber/rule.interface";

import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { AUTHORIZATION_POLICY_DECORATOR_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationPrincipalType, EApiPolicyEffect } from "@enum/class/authorization";
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
			effect: EApiPolicyEffect.ALLOW,
			priority: 0,
		};
		const ruleB: IApiAuthorizationPolicySubscriberRule<PolicyEntity, PolicyEntity> = {
			effect: EApiPolicyEffect.ALLOW,
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
					roles: ["admin"],
				},
			},
			permissions: ["read"],
			routeType: EApiRouteType.GET,
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
		expect(context.principal.id).toBe("user-42");
		expect(context.permissions).toEqual(["read"]);
	});

	it("passes request metadata through to policy hook context", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		const allowRule: IApiAuthorizationPolicySubscriberRule<PolicyEntity, PolicyEntity> = {
			effect: EApiPolicyEffect.ALLOW,
		};
		const onBeforeCreate = vi.fn().mockResolvedValue([allowRule]);
		const onBeforeGet = vi.fn().mockResolvedValue([allowRule]);
		const onBeforeGetList = vi.fn().mockResolvedValue([allowRule]);
		const onBeforePartialUpdate = vi.fn().mockResolvedValue([allowRule]);
		const subscriber = {
			onBeforeCreate,
			onBeforeGet,
			onBeforeGetList,
			onBeforePartialUpdate,
		} as IApiAuthorizationPolicySubscriber<PolicyEntity>;

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-metadata",
			priority: 0,
			subscriber,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.CREATE, {
			authenticationRequest: {
				user: {
					id: "user-42",
				},
			},
			requestMetadata: {
				body: { name: "Created via policy" },
				headers: { "x-trace-id": "trace-create" },
				ip: "127.0.0.1",
			},
			routeType: EApiRouteType.CREATE,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET, {
			authenticationRequest: {
				user: {
					id: "user-42",
				},
			},
			requestMetadata: {
				headers: { "x-trace-id": "trace-get" },
				ip: "127.0.0.2",
				parameters: { id: "entity-1" },
			},
			routeType: EApiRouteType.GET,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET_LIST, {
			authenticationRequest: {
				user: {
					id: "user-42",
				},
			},
			requestMetadata: {
				headers: { "x-trace-id": "trace-list" },
				ip: "127.0.0.3",
				query: { limit: 10, page: 1 },
			},
			routeType: EApiRouteType.GET_LIST,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.PARTIAL_UPDATE, {
			authenticationRequest: {
				user: {
					id: "user-42",
				},
			},
			requestMetadata: {
				body: { name: "Updated via policy" },
				headers: { "x-trace-id": "trace-update" },
				ip: "127.0.0.4",
				parameters: { id: "entity-2" },
			},
			routeType: EApiRouteType.PARTIAL_UPDATE,
		});

		expect(onBeforeCreate).toHaveBeenCalledTimes(1);
		expect(onBeforeGet).toHaveBeenCalledTimes(1);
		expect(onBeforeGetList).toHaveBeenCalledTimes(1);
		expect(onBeforePartialUpdate).toHaveBeenCalledTimes(1);

		expect(onBeforeCreate.mock.calls[0]?.[0]).toMatchObject({
			body: { name: "Created via policy" },
			headers: { "x-trace-id": "trace-create" },
			ip: "127.0.0.1",
		});
		expect(onBeforeCreate.mock.calls[0]?.[0]?.DATA).toMatchObject({
			body: { name: "Created via policy" },
			headers: { "x-trace-id": "trace-create" },
			ip: "127.0.0.1",
		});

		expect(onBeforeGet.mock.calls[0]?.[0]).toMatchObject({
			headers: { "x-trace-id": "trace-get" },
			ip: "127.0.0.2",
			parameters: { id: "entity-1" },
		});
		expect(onBeforeGet.mock.calls[0]?.[0]?.DATA).toMatchObject({
			headers: { "x-trace-id": "trace-get" },
			ip: "127.0.0.2",
			parameters: { id: "entity-1" },
		});

		expect(onBeforeGetList.mock.calls[0]?.[0]).toMatchObject({
			headers: { "x-trace-id": "trace-list" },
			ip: "127.0.0.3",
			query: { limit: 10, page: 1 },
		});
		expect(onBeforeGetList.mock.calls[0]?.[0]?.DATA).toMatchObject({
			headers: { "x-trace-id": "trace-list" },
			ip: "127.0.0.3",
			query: { limit: 10, page: 1 },
		});

		expect(onBeforePartialUpdate.mock.calls[0]?.[0]).toMatchObject({
			body: { name: "Updated via policy" },
			headers: { "x-trace-id": "trace-update" },
			ip: "127.0.0.4",
			parameters: { id: "entity-2" },
		});
		expect(onBeforePartialUpdate.mock.calls[0]?.[0]?.DATA).toMatchObject({
			body: { name: "Updated via policy" },
			headers: { "x-trace-id": "trace-update" },
			ip: "127.0.0.4",
			parameters: { id: "entity-2" },
		});
	});

	it("uses a custom principal resolver when build options provide one", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		const onBeforeGet = vi.fn().mockResolvedValue([
			{
				effect: EApiPolicyEffect.ALLOW,
			},
		]);
		const principalResolver = {
			resolve: vi.fn().mockResolvedValue({
				attributes: { operatorId: "operator-1" },
				id: "custom-user",
				roles: ["operator-admin"],
				type: EApiAuthorizationPrincipalType.USER,
			}),
		};

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-custom-resolver",
			priority: 0,
			subscriber: {
				onBeforeGet,
			} as IApiAuthorizationPolicySubscriber<PolicyEntity>,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET, {
			authenticationRequest: {
				user: {
					id: "ignored-user",
				},
			},
			permissions: ["admin.item.read"],
			principalResolver,
			routeType: EApiRouteType.GET,
		});

		expect(principalResolver.resolve).toHaveBeenCalledWith(
			{
				id: "ignored-user",
			},
			{
				user: {
					id: "ignored-user",
				},
			},
		);
		expect(onBeforeGet.mock.calls[0]?.[0]?.principal).toMatchObject({
			attributes: { operatorId: "operator-1" },
			id: "custom-user",
			roles: ["operator-admin"],
			type: EApiAuthorizationPrincipalType.USER,
		});
		expect(onBeforeGet.mock.calls[0]?.[0]?.permissions).toEqual(["admin.item.read"]);
	});

	it("caches rules when cache is enabled", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		registry.configureCache({ isEnabled: true, ttlMs: 60_000 });

		const onBeforeGet = vi.fn().mockResolvedValue([
			{
				effect: EApiPolicyEffect.ALLOW,
			},
		]);
		const subscriber = { onBeforeGet } as IApiAuthorizationPolicySubscriber<PolicyEntity>;

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-cache",
			priority: 0,
			subscriber,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET, { routeType: EApiRouteType.GET });
		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET, { routeType: EApiRouteType.GET });

		expect(onBeforeGet).toHaveBeenCalledTimes(1);
	});

	it("expires cached rules after ttl", async () => {
		vi.useFakeTimers();
		vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

		const registry = new ApiAuthorizationPolicyRegistry();
		registry.configureCache({ isEnabled: true, ttlMs: 10 });

		const onBeforeGet = vi.fn().mockResolvedValue([
			{
				effect: EApiPolicyEffect.ALLOW,
			},
		]);
		const subscriber = { onBeforeGet } as IApiAuthorizationPolicySubscriber<PolicyEntity>;

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-ttl",
			priority: 0,
			subscriber,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET, { routeType: EApiRouteType.GET });
		expect(onBeforeGet).toHaveBeenCalledTimes(1);

		vi.setSystemTime(new Date("2026-01-01T00:00:00.050Z"));

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET, { routeType: EApiRouteType.GET });
		expect(onBeforeGet).toHaveBeenCalledTimes(2);

		vi.useRealTimers();
	});

	it("invalidates cache when new subscriber is registered", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		registry.configureCache({ isEnabled: true, ttlMs: 60_000 });

		const onBeforeGetA = vi.fn().mockResolvedValue([
			{
				effect: EApiPolicyEffect.ALLOW,
			},
		]);
		const subscriberA = { onBeforeGet: onBeforeGetA } as IApiAuthorizationPolicySubscriber<PolicyEntity>;

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-a",
			priority: 0,
			subscriber: subscriberA,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET, { routeType: EApiRouteType.GET });
		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET, { routeType: EApiRouteType.GET });

		expect(onBeforeGetA).toHaveBeenCalledTimes(1);

		const onBeforeGetB = vi.fn().mockResolvedValue([
			{
				effect: EApiPolicyEffect.ALLOW,
			},
		]);
		const subscriberB = { onBeforeGet: onBeforeGetB } as IApiAuthorizationPolicySubscriber<PolicyEntity>;

		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy-b",
			priority: 0,
			subscriber: subscriberB,
		});

		await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET, { routeType: EApiRouteType.GET });

		expect(onBeforeGetA).toHaveBeenCalledTimes(2);
		expect(onBeforeGetB).toHaveBeenCalledTimes(1);
	});
});
