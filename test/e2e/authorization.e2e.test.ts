import "reflect-metadata";

import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { IApiAuthorizationPolicySubscriber } from "@interface/class/api/authorization/policy/subscriber";

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
class PolicySubscriber extends ApiAuthorizationPolicyBase<PolicyEntity> {
	public onBeforeGet() {
		return [
			...this.allow({
				condition: () => true,
				scope: () => ({ where: { id: "entity-1" } }),
			}),
			...this.allow({
				condition: () => true,
				scope: () => ({ where: { ownerId: "owner-2" } }),
			}),
		];
	}
}

describe("Authorization policy registry (E2E)", () => {
	it("builds aggregated policies and evaluates decisions", async () => {
		const registry = new ApiAuthorizationPolicyRegistry();
		registry.registerSubscriber({
			entity: PolicyEntity,
			policyId: "policy.entity",
			priority: 1,
			subscriber: new PolicySubscriber() as unknown as IApiAuthorizationPolicySubscriber<PolicyEntity>,
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
				permissions: [],
				roles: [],
			},
		});

		expect(decision.effect).toBe(EAuthorizationEffect.ALLOW);
		expect(decision.scope?.where).toEqual({ id: "entity-1", ownerId: "owner-2" });
	});
});
