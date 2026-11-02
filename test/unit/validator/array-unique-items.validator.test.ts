import { ArrayUniqueItemsValidator } from "@validator/array-unique-items.validator";
import { IsNumber, IsString, ValidateNested } from "class-validator";
import { describe, expect, it } from "vitest";

class CatVariant {
	public name: string = "shared";
}

class DogVariant {
	public name: string = "shared";
}

class DeclaredChild {
	@IsNumber()
	public id: number = 1;

	public junk?: unknown;
}

class DeclaredParent {
	@ValidateNested()
	public child: DeclaredChild = new DeclaredChild();

	public junk?: unknown;
}

class InheritingChild extends DeclaredChild {
	@IsString()
	public label: string = "shared";
}

class FreeFormItem {
	public id?: number;
}

class PrivateStateItem {
	readonly #state: number;

	public constructor(state: number) {
		this.#state = state;
	}

	public getState(): number {
		return this.#state;
	}
}

const withFields = <T extends object>(target: T, fields: Record<string, unknown>): T => Object.assign(target, fields);

// A value that holds `levels` levels, the last of them a string.
const nestInArrays = (levels: number): unknown => {
	let nested: unknown = "leaf";

	for (let level: number = 1; level < levels; level++) {
		nested = [nested];
	}

	return nested;
};

const nestInObjects = (levels: number): unknown => {
	let nested: unknown = "leaf";

	for (let level: number = 1; level < levels; level++) {
		nested = { nested };
	}

	return nested;
};

describe("ArrayUniqueItemsValidator", () => {
	const validator: ArrayUniqueItemsValidator = new ArrayUniqueItemsValidator();
	const validate = (value: unknown): boolean => validator.validate(value);

	it.each([
		["equal strings", ["a", "a"]],
		["equal numbers", [7, 7]],
		["zero and negative zero", [0, -0]],
		["equal booleans", [true, true]],
		["two nulls", [null, null]],
		["dates at one instant", [new Date("2026-01-01T00:00:00.000Z"), new Date("2026-01-01T03:00:00.000+03:00")]],
		["equal objects", [{ id: 1 }, { id: 1 }]],
		[
			"equal objects whose keys are in another order",
			[
				{ a: 1, b: 2 },
				{ a: 1, b: 2 },
			].map((item: { a: number; b: number }, index: number) => (index === 0 ? item : { b: item.b, a: item.a })),
		],
		["objects that differ only by an undefined key", [{ a: 1 }, { a: 1, b: undefined }]],
		[
			"equal nested values",
			[
				{ at: new Date(5), tags: ["a", { b: 1 }] },
				{ at: new Date(5), tags: ["a", { b: 1 }] },
			],
		],
		[
			"equal nested arrays",
			[
				[1, 2],
				[1, 2],
			],
		],
	])("rejects %s", (_name: string, value: Array<unknown>) => {
		expect(validate(value)).toBe(false);
	});

	it.each([
		["distinct strings", ["a", "b"]],
		["distinct numbers", [7, 8]],
		["a number and its string", [1, "1"]],
		["null and the string null", [null, "null"]],
		["null and undefined", [null, undefined]],
		["dates at different instants", [new Date(1), new Date(2)]],
		["a date and its epoch number", [new Date(1), 1]],
		["objects with different values", [{ id: 1 }, { id: 2 }]],
		[
			"arrays in a different order",
			[
				[1, 2],
				[2, 1],
			],
		],
		["strings that would read the same once joined", [["a,b"], ["a", "b"]]],
		["an object and an array holding the same value", [{ 0: "a" }, ["a"]]],
		["instances of different classes with equal fields", [new CatVariant(), new DogVariant()]],
		["an empty object and an empty array", [{}, []]],
		["an empty array", []],
	])("accepts %s", (_name: string, value: Array<unknown>) => {
		expect(validate(value)).toBe(true);
	});

	it.each([
		["a string", "a"],
		["undefined", undefined],
		["null", null],
		["an object", { a: 1 }],
	])("leaves %s to IsArray", (_name: string, value: unknown) => {
		expect(validate(value)).toBe(true);
	});

	it("compares objects without a prototype the way it compares plain objects", () => {
		const withoutPrototype = (): Record<string, unknown> => withFields<Record<string, unknown>>(Object.create(null), { id: 1 });

		expect(validate([withoutPrototype(), withoutPrototype()])).toBe(false);
		expect(validate([withoutPrototype(), { id: 1 }])).toBe(false);
		expect(validate([withoutPrototype(), { id: 2 }])).toBe(true);
	});

	it("does not throw on a prototype without a constructor", () => {
		const orphan = (fields: Record<string, unknown>): object => withFields<object>(Object.create(Object.create(null)), fields);

		expect(validate([orphan({ id: 1 }), orphan({ id: 2 })])).toBe(true);
		expect(validate([orphan({}), orphan({})])).toBe(true);
	});

	it("rejects objects whose keys are canonically equal but not the same string, in another order", () => {
		const composed: string = "\u00E9";
		const decomposed: string = "e\u0301";

		expect(validate([withFields({}, { [composed]: 1, [decomposed]: 2 }), withFields({}, { [decomposed]: 2, [composed]: 1 })])).toBe(false);
		expect(validate([withFields({}, { [composed]: 1 }), withFields({}, { [decomposed]: 1 })])).toBe(true);
	});

	it.each([
		["maps", (): unknown => new Map([["a", 1]])],
		["sets", (): unknown => new Set([1])],
		["regular expressions", (): unknown => /a/],
		["instances with only private fields", (): unknown => new PrivateStateItem(1)],
		["functions", (): unknown => (): number => 1],
		["symbols", (): unknown => Symbol("a")],
	])("compares %s by identity", (_name: string, build: () => unknown) => {
		const same: unknown = build();

		expect(validate([build(), build()])).toBe(true);
		expect(validate([same, same])).toBe(false);
		expect(validate([{ value: build() }, { value: build() }])).toBe(true);
		expect(validate([{ value: same }, { value: same }])).toBe(false);
	});

	it("keys a class instance on its declared properties only", () => {
		const child = (fields: Record<string, unknown>): DeclaredChild => withFields(new DeclaredChild(), fields);

		expect(validate([child({}), child({ junk: 2 })])).toBe(false);
		expect(validate([child({ junk: 1 }), child({ junk: 2 })])).toBe(false);
		expect(validate([child({ id: 1 }), child({ id: 2, junk: 2 })])).toBe(true);
	});

	it("counts a property declared on a parent class", () => {
		const child = (fields: Record<string, unknown>): InheritingChild => withFields(new InheritingChild(), fields);

		expect(validate([child({ id: 1 }), child({ id: 2 })])).toBe(true);
		expect(validate([child({ id: 1 }), child({ id: 1, junk: 2 })])).toBe(false);
	});

	it("keys a nested class instance on its declared properties too", () => {
		const parent = (fields: Record<string, unknown>): DeclaredParent => withFields(new DeclaredParent(), { child: withFields(new DeclaredChild(), fields), junk: fields.junk });

		expect(validate([parent({}), parent({ junk: 2 })])).toBe(false);
		expect(validate([parent({ id: 1 }), parent({ id: 2 })])).toBe(true);
	});

	it("keeps every key of an item with no declared properties", () => {
		expect(validate([withFields(new FreeFormItem(), { id: 1 }), withFields(new FreeFormItem(), { id: 1, other: 2 })])).toBe(true);
		expect(validate([withFields(new FreeFormItem(), { id: 1 }), withFields(new FreeFormItem(), { id: 1 })])).toBe(false);
		expect(validate([{ id: 1 }, { id: 1, other: 2 }])).toBe(true);
	});

	it("compares empty instances of a class with no validators by identity, and plain empty objects by value", () => {
		const same: FreeFormItem = new FreeFormItem();

		expect(validate([new FreeFormItem(), new FreeFormItem()])).toBe(true);
		expect(validate([same, same])).toBe(false);
		expect(validate([{}, {}])).toBe(false);
	});

	it.each([
		["arrays", nestInArrays],
		["objects", nestInObjects],
	])("accepts items nested in %s up to the cap of 64 levels, and still finds duplicates there", (_name: string, nest: (levels: number) => unknown) => {
		expect(validate([nest(64), "other"])).toBe(true);
		expect(validate([nest(64), nest(64)])).toBe(false);
		expect(validator.defaultMessage({ constraints: [], object: {}, property: "items", targetName: "Dto", value: [nest(64), nest(64)] })).toBe("$property must not contain duplicate items");
	});

	it.each([
		["arrays", nestInArrays],
		["objects", nestInObjects],
	])("rejects items nested in %s past the cap with their own message", (_name: string, nest: (levels: number) => unknown) => {
		expect(validate([nest(65), "other"])).toBe(false);
		expect(validator.defaultMessage({ constraints: [], object: {}, property: "items", targetName: "Dto", value: [nest(65), "other"] })).toBe("$property must not nest items more than 64 levels deep");
	});

	it("does not walk a far deeper value, and does not overflow the stack", () => {
		expect(validate([nestInArrays(200_000), "other"])).toBe(false);
	});

	it("does not count undeclared keys of a class instance against the cap", () => {
		expect(validate([withFields(new DeclaredChild(), { junk: nestInArrays(65) }), withFields(new DeclaredChild(), { id: 2 })])).toBe(true);
	});

	it("handles a body-sized array of distinct values in linear time", () => {
		const values: Array<number> = Array.from({ length: 500_000 }, (_value: unknown, index: number): number => index);

		expect(validate(values)).toBe(true);
	});

	it("applies a normalize constraint to string items only", () => {
		const lower = (item: string): string => item.toLowerCase();
		const validateWith = (value: unknown): boolean => validator.validate(value, { constraints: [lower], object: {}, property: "items", targetName: "Dto", value });

		expect(validateWith(["A", "a"])).toBe(false);
		expect(validateWith(["A", "b", 1])).toBe(true);
	});

	it("names the property in its message", () => {
		expect(validator.defaultMessage()).toBe("$property must not contain duplicate items");
	});

	it("leaves the normalize constraint to string items at the top level only", () => {
		const lower = (item: string): string => item.toLowerCase();

		expect(validator.validate([{ id: "A" }, { id: "a" }], { constraints: [lower], object: {}, property: "items", targetName: "Dto", value: [] })).toBe(true);
	});
});
