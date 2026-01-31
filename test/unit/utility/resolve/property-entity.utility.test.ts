import type { IApiBaseEntity } from "@interface/api-base-entity.interface";

import { ResolvePropertyEntity, TryResolvePropertyEntity } from "@utility/resolve/property-entity.utility";
import { describe, expect, it } from "vitest";

class EntityClass {
	public id?: string;
}

describe("ResolvePropertyEntity", () => {
	it("resolves constructor, literal, and factory entities", () => {
		const literal: IApiBaseEntity = { name: "LiteralEntity" };
		const factory = () => EntityClass;

		expect(ResolvePropertyEntity(EntityClass, "Test")).toBe(EntityClass);
		expect(ResolvePropertyEntity(literal, "Test")).toBe(literal);
		expect(ResolvePropertyEntity(factory, "Test")).toBe(EntityClass);
	});

	it("returns undefined from TryResolvePropertyEntity when factory resolves to undefined", () => {
		const factory = () => undefined;
		expect(TryResolvePropertyEntity(factory)).toBeUndefined();
	});

	it("throws when entity cannot be resolved", () => {
		const factory = () => undefined;
		expect(() => ResolvePropertyEntity(factory, "TestDecorator")).toThrow("Entity for TestDecorator could not be resolved");
	});
});
