import "reflect-metadata";

import type { INestApplication } from "@nestjs/common";

import { Test } from "@nestjs/testing";
import { FastifyAdapter } from "@nestjs/platform-fastify";
import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";
import { describe, expect, it } from "vitest";

import { ApiAuthorizationModule, ApiAuthorizationPolicy, ApiAuthorizationPolicyBase, ApiAuthorizationPolicyRegistry, ApiFunctionSubscriber, ApiFunctionSubscriberBase, ApiRouteSubscriber, ApiRouteSubscriberBase, ApiSubscriberModule, EApiRouteType, apiSubscriberRegistry } from "../../dist/esm/index";

@Entity("nest_policy_entities")
class NestPolicyEntity {
	@PrimaryGeneratedColumn("uuid")
	public id!: string;

	@Column({ type: "varchar" })
	public ownerId!: string;
}

@ApiAuthorizationPolicy({ entity: NestPolicyEntity })
class NestPolicySubscriber extends ApiAuthorizationPolicyBase<NestPolicyEntity> {
	public onBeforeGet() {
		return this.allow({
			condition: () => true,
			scope: () => ({ where: { ownerId: "owner-1" } }),
		});
	}
}

class NestSubscriberEntity {}

@ApiFunctionSubscriber({ entity: NestSubscriberEntity, priority: 2 })
class NestFunctionSubscriber extends ApiFunctionSubscriberBase<NestSubscriberEntity> {}

@ApiRouteSubscriber({ entity: NestSubscriberEntity, priority: 1 })
class NestRouteSubscriber extends ApiRouteSubscriberBase<NestSubscriberEntity> {}

describe("Nest TestingModule (E2E)", () => {
	it("boots Nest app and triggers discovery services", async () => {
		const moduleRef = await Test.createTestingModule({
			imports: [ApiAuthorizationModule, ApiSubscriberModule],
			providers: [NestPolicySubscriber, NestFunctionSubscriber, NestRouteSubscriber],
		}).compile();

		const app: INestApplication = moduleRef.createNestApplication(new FastifyAdapter());
		await app.init();

		const registry = moduleRef.get(ApiAuthorizationPolicyRegistry);
		const policy = await registry.buildAggregatedPolicy(NestPolicyEntity, EApiRouteType.GET);

		expect(policy).toBeDefined();
		expect(policy?.rules).toHaveLength(1);
		expect(policy?.rules?.[0]?.scope?.({ subject: { id: "subject-1", attributes: {}, permissions: [], roles: [] } } as any)).toEqual({
			where: { ownerId: "owner-1" },
		});

		expect(apiSubscriberRegistry.getFunctionSubscribers(NestSubscriberEntity.name).length).toBeGreaterThan(0);
		expect(apiSubscriberRegistry.getRouteSubscribers(NestSubscriberEntity.name).length).toBeGreaterThan(0);

		registry.clear();
		await app.close();
	});
});
