import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriber } from "@interface/class/api/authorization/policy/subscriber";
import type { TApiAuthorizationPolicyBeforeCreateContext, TApiAuthorizationPolicyBeforePartialUpdateContext } from "@type/class/api/authorization/policy";

import { ApiAuthorizationEngine } from "@class/api/authorization/engine.class";
import { ApiAuthorizationPolicyBase } from "@class/api/authorization/policy/base.class";
import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import { ApiAuthorizationPolicy } from "@decorator/api/authorization-policy.decorator";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

@Entity("policy_entities")
class PolicyEntity implements IApiBaseEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public ownerId!: string;
}

@ApiAuthorizationPolicy({ entity: PolicyEntity })
class PermissionAllowPolicySubscriber extends ApiAuthorizationPolicyBase<PolicyEntity> {
	public onBeforeGet() {
		return [
			...this.allowForPermissions(["admin.user.read"], {
				scope: () => ({ where: { id: "entity-1" } }),
			}),
			...this.allowForPermissions(["admin.user.read"], {
				scope: () => ({ where: { ownerId: "owner-2" } }),
			}),
		];
	}
}

@ApiAuthorizationPolicy({ entity: PolicyEntity })
class PermissionDenyPolicySubscriber extends ApiAuthorizationPolicyBase<PolicyEntity> {
	public onBeforeGet() {
		return this.denyForPermissions(["admin.user.read"], {
			condition: ({ subject }) => Boolean((subject.attributes as { isSuspended?: boolean } | undefined)?.isSuspended),
		});
	}
}

@ApiAuthorizationPolicy({ entity: PolicyEntity })
class PayloadAwarePolicySubscriber extends ApiAuthorizationPolicyBase<PolicyEntity> {
	public onBeforeCreate(context: TApiAuthorizationPolicyBeforeCreateContext<PolicyEntity>) {
		if (context.body.ownerId !== context.subject.id) {
			return [];
		}

		return this.allow({
			scope: () => ({ where: { ownerId: context.subject.id } }),
		});
	}

	public onBeforePartialUpdate(context: TApiAuthorizationPolicyBeforePartialUpdateContext<PolicyEntity>) {
		if (context.parameters.id === "payload-aware-denied" && context.body.ownerId === "other-owner") {
			return this.deny({
				description: "Payload-aware policies can deny using parameters and body together",
				priority: 200,
			});
		}

		return this.allow({
			scope: () => ({ where: { ownerId: context.subject.id } }),
		});
	}
}

describe("Authorization policy registry (E2E)", () => {
	it("builds aggregated policies and evaluates permission-based decisions", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy.entity",
			priority: 1,
			subscriber: new PermissionAllowPolicySubscriber() as unknown as IApiAuthorizationPolicySubscriber<PolicyEntity>,
		});

		const policy = await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);

		expect(policy).toBeDefined();
		expect(policy?.rules).toHaveLength(2);
		expect(policy?.rules.every((rule) => rule.effect === EAuthorizationEffect.ALLOW)).toBe(true);

		const engine = new ApiAuthorizationEngine();
		const decision = await engine.evaluate({
			action: EApiRouteType.GET,
			policy: policy!,
			resource: { id: "entity-1" } as PolicyEntity,
			subject: {
				attributes: {},
				id: "subject-1",
				permissions: ["admin.user.*"],
				roles: [],
			},
		});

		expect(decision.effect).toBe(EAuthorizationEffect.ALLOW);
		expect(decision.scope?.where).toEqual({ id: "entity-1", ownerId: "owner-2" });
	});

	it("denies access when no permission-based allow matches", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy.entity",
			priority: 1,
			subscriber: new PermissionAllowPolicySubscriber() as unknown as IApiAuthorizationPolicySubscriber<PolicyEntity>,
		});

		const policy = await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);
		const engine = new ApiAuthorizationEngine();
		const decision = await engine.evaluate({
			action: EApiRouteType.GET,
			policy: policy!,
			resource: { id: "entity-1" } as PolicyEntity,
			subject: {
				attributes: {},
				id: "subject-1",
				permissions: ["admin.user.update"],
				roles: [],
			},
		});

		expect(decision.effect).toBe(EAuthorizationEffect.DENY);
		expect(decision.appliedRules).toHaveLength(0);
		expect(decision.scope).toBeUndefined();
	});

	it("prioritizes permission denies over allows across aggregated policies", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy.allow",
			priority: 1,
			subscriber: new PermissionAllowPolicySubscriber() as unknown as IApiAuthorizationPolicySubscriber<PolicyEntity>,
		});
		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy.deny",
			priority: 100,
			subscriber: new PermissionDenyPolicySubscriber() as unknown as IApiAuthorizationPolicySubscriber<PolicyEntity>,
		});

		const policy = await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.GET);
		const engine = new ApiAuthorizationEngine();
		const decision = await engine.evaluate({
			action: EApiRouteType.GET,
			policy: policy!,
			resource: { id: "entity-1" } as PolicyEntity,
			subject: {
				attributes: { isSuspended: true },
				id: "subject-1",
				permissions: ["admin.user.read"],
				roles: [],
			},
		});

		expect(policy?.rules[0]?.effect).toBe(EAuthorizationEffect.DENY);
		expect(decision.effect).toBe(EAuthorizationEffect.DENY);
		expect(decision.appliedRules).toHaveLength(1);
		expect(decision.appliedRules[0]?.effect).toBe(EAuthorizationEffect.DENY);
		expect(decision.scope).toBeUndefined();
	});

	it("evaluates payload-aware create and partial-update policies without changing engine semantics", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy.payload-aware",
			priority: 1,
			subscriber: new PayloadAwarePolicySubscriber() as unknown as IApiAuthorizationPolicySubscriber<PolicyEntity>,
		});

		const createPolicy = await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.CREATE, {
			requestMetadata: {
				body: {
					ownerId: "owner-1",
				},
				headers: {
					"x-trace-id": "create-1",
				},
				ip: "127.0.0.1",
			},
			subject: {
				attributes: {},
				id: "owner-1",
				permissions: [],
				roles: [],
			},
		});
		const createDecision = await new ApiAuthorizationEngine().evaluate({
			action: EApiRouteType.CREATE,
			policy: createPolicy!,
			resource: {
				ownerId: "owner-1",
			} as PolicyEntity,
			subject: {
				attributes: {},
				id: "owner-1",
				permissions: [],
				roles: [],
			},
		});

		expect(createDecision.effect).toBe(EAuthorizationEffect.ALLOW);
		expect(createDecision.scope?.where).toEqual({ ownerId: "owner-1" });

		const partialUpdatePolicy = await registry.buildAggregatedPolicy(PolicyEntity, EApiRouteType.PARTIAL_UPDATE, {
			requestMetadata: {
				body: {
					ownerId: "other-owner",
				},
				headers: {
					"x-trace-id": "patch-1",
				},
				ip: "127.0.0.1",
				parameters: {
					id: "payload-aware-denied",
				},
			},
			subject: {
				attributes: {},
				id: "owner-1",
				permissions: [],
				roles: [],
			},
		});
		const partialUpdateDecision = await new ApiAuthorizationEngine().evaluate({
			action: EApiRouteType.PARTIAL_UPDATE,
			policy: partialUpdatePolicy!,
			resource: {
				id: "payload-aware-denied",
				ownerId: "owner-1",
			} as PolicyEntity,
			subject: {
				attributes: {},
				id: "owner-1",
				permissions: [],
				roles: [],
			},
		});

		expect(partialUpdateDecision.effect).toBe(EAuthorizationEffect.DENY);
		expect(partialUpdateDecision.appliedRules).toHaveLength(1);
		expect(partialUpdateDecision.appliedRules[0]?.effect).toBe(EAuthorizationEffect.DENY);
	});
});
