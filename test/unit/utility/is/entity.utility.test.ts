import { IsEntityConstructor } from "@utility/is/entity/constructor.utility";
import { IsEntityFactory } from "@utility/is/entity/factory.utility";
import { IsEntityLiteral } from "@utility/is/entity/literal.utility";
import { describe, expect, it } from "vitest";

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
});
