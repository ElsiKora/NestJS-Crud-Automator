import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";
import { IsEntityFactory } from "@utility/is/entity/factory.utility";
import { IsEntityLiteral } from "@utility/is/entity/literal.utility";
import { describe, expect, it } from "vitest";

abstract class AbstractEntityClass {}

class EntityClass {}

describe("entity type guards", () => {
	it("detects constructors, factories, and literals", () => {
		const factory = () => EntityClass;

		expect(IsEntityConstructor(EntityClass)).toBe(true);
		expect(IsEntityConstructor(factory)).toBe(false);
		expect(IsEntityFactory(factory)).toBe(true);
		expect(IsEntityFactory(EntityClass)).toBe(false);
		expect(IsEntityLiteral({ name: "Entity" })).toBe(true);
		expect(IsEntityLiteral(null)).toBe(false);
	});

	it.each([
		["a class", EntityClass],
		["an abstract class", AbstractEntityClass],
	])("accepts %s as a constructor", (_name: string, candidate: unknown) => {
		expect(IsEntityConstructor(candidate)).toBe(true);
	});

	it.each([
		["a TypeORM string target", "EntityClass"],
		["an object", {}],
		["undefined", undefined],
		["the end of a class's prototype chain", Function.prototype],
	])("rejects %s as a constructor", (_name: string, candidate: unknown) => {
		expect(IsEntityConstructor(candidate)).toBe(false);
	});
});
