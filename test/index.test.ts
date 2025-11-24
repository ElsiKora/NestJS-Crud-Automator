import "reflect-metadata";

import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { getMetadataArgsStorage } from "typeorm";
import type { ColumnMetadataArgs } from "typeorm/metadata-args/ColumnMetadataArgs";
import type { TableMetadataArgs } from "typeorm/metadata-args/TableMetadataArgs";

import { ApiAuthorizationPolicyRegistry } from "@class/api/authorization/policy/registry.class";
import { EAuthorizationEffect } from "@enum/class/authorization/effect.enum";
import { EApiRouteType } from "@enum/decorator/api/route-type.enum";
import type { IApiAuthorizationPolicySubscriber, IApiAuthorizationPolicySubscriberContext, IApiAuthorizationPolicySubscriberRule } from "@interface/class/api/authorization/policy/subscriber";
import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

describe("ApiAuthorizationPolicyRegistry", () => {
	before(() => registerTestEntityMetadata(TestEntity));
	after(() => clearTestEntityMetadata(TestEntity));

	let registry: ApiAuthorizationPolicyRegistry;

	beforeEach(() => {
		registry = new ApiAuthorizationPolicyRegistry();
	});

	it("aggregates subscribers through the cladi registry respecting priority ordering", async () => {
		const highPrioritySubscriber: StaticPolicySubscriber = new StaticPolicySubscriber("high-priority", EAuthorizationEffect.ALLOW);
		const lowPrioritySubscriber: StaticPolicySubscriber = new StaticPolicySubscriber("low-priority", EAuthorizationEffect.DENY);

		registry.registerSubscriber({
			description: "High priority policy",
			entity: TestEntity,
			policyId: "policy-high",
			priority: 10,
			subscriber: highPrioritySubscriber,
		});

		registry.registerSubscriber({
			description: "Low priority policy",
			entity: TestEntity,
			policyId: "policy-low",
			priority: 1,
			subscriber: lowPrioritySubscriber,
		});

		const policy = await registry.buildAggregatedPolicy(TestEntity, EApiRouteType.GET);

		assert.ok(policy, "Policy should be generated when subscribers exist");
		assert.equal(policy?.rules.length, 2);
		assert.deepEqual(
			policy?.rules.map((rule) => rule.description),
			["high-priority", "low-priority"],
		);
	});

	it("invalidates cached policies when new subscribers are registered", async () => {
		const baseSubscriber: StaticPolicySubscriber = new StaticPolicySubscriber("base", EAuthorizationEffect.ALLOW);

		registry.registerSubscriber({
			description: "Base policy",
			entity: TestEntity,
			policyId: "policy-base",
			priority: 1,
			subscriber: baseSubscriber,
		});

		const initialPolicy = await registry.buildAggregatedPolicy(TestEntity, EApiRouteType.GET);
		assert.ok(initialPolicy);
		assert.equal(initialPolicy?.rules.length, 1);

		const newSubscriber: StaticPolicySubscriber = new StaticPolicySubscriber("new", EAuthorizationEffect.ALLOW);

		registry.registerSubscriber({
			description: "New policy",
			entity: TestEntity,
			policyId: "policy-new",
			priority: 5,
			subscriber: newSubscriber,
		});

		const updatedPolicy = await registry.buildAggregatedPolicy(TestEntity, EApiRouteType.GET);
		assert.ok(updatedPolicy);
		assert.equal(updatedPolicy?.rules.length, 2);
		assert.deepEqual(updatedPolicy?.rules.map((rule) => rule.description), ["new", "base"]);
	});
});

interface ITestEntity extends IApiBaseEntity {
	id: string;
}

class TestEntity implements ITestEntity {
	public id!: string;

	public name: string = "TestEntity";
}

class StaticPolicySubscriber implements IApiAuthorizationPolicySubscriber<TestEntity> {
	constructor(
		private readonly description: string,
		private readonly effect: EAuthorizationEffect,
	) {}

	public onBeforeGet(_context: IApiAuthorizationPolicySubscriberContext<TestEntity>): Array<IApiAuthorizationPolicySubscriberRule<TestEntity, unknown>> {
		return [
			{
				condition: () => true,
				description: this.description,
				effect: this.effect,
			},
		];
	}
}

function registerTestEntityMetadata(entity: new () => TestEntity): void {
	const tables: Array<TableMetadataArgs> = getMetadataArgsStorage().tables;
	const columns: Array<ColumnMetadataArgs> = getMetadataArgsStorage().columns;

	tables.push({
		target: entity,
		type: "regular",
		name: "test_entity",
		orderBy: undefined,
	});

	columns.push({
		target: entity,
		propertyName: "id",
		mode: "regular",
		options: {
			primary: true,
			type: "uuid",
		},
	});
}

function clearTestEntityMetadata(entity: new () => TestEntity): void {
	removeMetadata(getMetadataArgsStorage().tables, entity);
	removeMetadata(getMetadataArgsStorage().columns, entity);
}

function removeMetadata<T extends { target: Function }>(collection: Array<T>, target: Function): void {
	for (let index = collection.length - 1; index >= 0; index -= 1) {
		if (collection[index]?.target === target) {
			collection.splice(index, 1);
		}
	}
}

import { MetadataStorage } from "@class/metadata-storage.class";
import { PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT } from "@constant/decorator/api";

describe("MetadataStorage", () => {
	it("stores and retrieves property metadata via the cladi registry", () => {
		const storage = new MetadataStorage();

		storage.setMetadata("UserEntity", "email", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, { description: "User email" });

		const propertyMeta = storage.getMetadata("UserEntity", "email");
		assert.ok(propertyMeta, "Property metadata should exist");
		assert.deepEqual(propertyMeta[PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY], { description: "User email" });

		const entityMeta = storage.getMetadata("UserEntity");
		assert.ok(entityMeta, "Entity metadata should exist");
		assert.ok("email" in entityMeta, "Entity metadata should contain email property");
	});

	it("isolates metadata per entity", () => {
		const storage = new MetadataStorage();

		storage.setMetadata("EntityA", "fieldA", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, { description: "A field" });
		storage.setMetadata("EntityB", "fieldB", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, { description: "B field" });

		const entityAMeta = storage.getMetadata("EntityA");
		const entityBMeta = storage.getMetadata("EntityB");

		assert.ok(entityAMeta && "fieldA" in entityAMeta, "EntityA should have fieldA");
		assert.ok(entityBMeta && "fieldB" in entityBMeta, "EntityB should have fieldB");
		assert.ok(!entityAMeta || !("fieldB" in entityAMeta), "EntityA should not have fieldB");
		assert.ok(!entityBMeta || !("fieldA" in entityBMeta), "EntityB should not have fieldA");
	});

	it("returns all entities metadata via getAllEntitiesMetadata", () => {
		const storage = new MetadataStorage();

		storage.setMetadata("First", "prop1", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, { description: "first prop" });
		storage.setMetadata("Second", "prop2", PROPERTY_DESCRIBE_DECORATOR_API_CONSTANT.METADATA_KEY, { description: "second prop" });

		const all = storage.getAllEntitiesMetadata();

		assert.ok("First" in all, "Should contain First entity");
		assert.ok("Second" in all, "Should contain Second entity");
		assert.ok(all["First"] && "prop1" in all["First"], "First should have prop1");
		assert.ok(all["Second"] && "prop2" in all["Second"], "Second should have prop2");
	});
});

