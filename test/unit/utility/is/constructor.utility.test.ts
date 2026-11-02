import { IsConstructor } from "@utility/is/constructor.utility";
import { describe, expect, it } from "vitest";

abstract class IsConstructorAbstract {}

class IsConstructorConcrete extends IsConstructorAbstract {}

describe("IsConstructor", () => {
	it.each([
		["a class", IsConstructorConcrete],
		["an abstract class", IsConstructorAbstract],
	])("accepts %s", (_name: string, target: unknown) => {
		expect(IsConstructor(target)).toBe(true);
	});

	it.each([
		["a TypeORM string target", "IsConstructorConcrete"],
		["an object", {}],
		["undefined", undefined],
	])("rejects %s", (_name: string, target: unknown) => {
		expect(IsConstructor(target)).toBe(false);
	});
});
