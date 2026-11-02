import { Readable } from "node:stream";

import { REQUEST_BODY_SHAPE_CONSTANT } from "@constant/request-body-shape.constant";
import { ARRAY_UNIQUE_ITEMS_CONSTANT } from "@constant/validator/array-unique-items.constant";
import { BadRequestException } from "@nestjs/common";
import { ApiRouteAssertRequestBodyShape } from "@utility/api/route/assert-request-body-shape.utility";
import { describe, expect, it, vi } from "vitest";

const DEPTH_MESSAGE: string = "request body must not nest more than 64 levels deep";
const KEYS_MESSAGE: string = "request body must not hold an object with more than 1000 keys";

/**
 * Builds a chain of objects without recursion.
 * @param {number} levels - Objects nested in each other.
 * @returns {object} The outermost object.
 */
function nestedObjects(levels: number): object {
	let value: object = {};

	for (let level: number = 1; level < levels; level += 1) {
		value = { nested: value };
	}

	return value;
}

/**
 * Builds a chain of arrays without recursion.
 * @param {number} levels - Arrays nested in each other.
 * @returns {Array<unknown>} The outermost array.
 */
function nestedArrays(levels: number): Array<unknown> {
	let value: Array<unknown> = [];

	for (let level: number = 1; level < levels; level += 1) {
		value = [value];
	}

	return value;
}

/**
 * Builds an object of the given number of keys.
 * @param {number} count - Keys in the object.
 * @param {object | null} prototype - Prototype of the object.
 * @returns {Record<string, number>} The object.
 */
function wideObject(count: number, prototype: null | object = Object.prototype): Record<string, number> {
	const value: Record<string, number> = Object.create(prototype) as Record<string, number>;

	for (let index: number = 0; index < count; index += 1) {
		value[`key${String(index)}`] = 0;
	}

	return value;
}

/**
 * Runs the check and returns what it threw.
 * @param {unknown} body - Request body.
 * @returns {unknown} The thrown value.
 */
function refusal(body: unknown): unknown {
	try {
		ApiRouteAssertRequestBodyShape(body);
	} catch (error) {
		return error;
	}

	return undefined;
}

describe("ApiRouteAssertRequestBodyShape", () => {
	it("keeps one depth for the body and for unique array items", () => {
		expect(REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_DEPTH).toBe(64);
		expect(ARRAY_UNIQUE_ITEMS_CONSTANT.MAXIMUM_DEPTH).toBe(REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_DEPTH);
		expect(REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_OBJECT_KEYS).toBe(1000);
	});

	it.each([
		{ at: nestedObjects(64), name: "objects", over: nestedObjects(65) },
		{ at: nestedArrays(64), name: "arrays", over: nestedArrays(65) },
		{ at: [nestedObjects(63)], name: "an array around objects", over: [nestedObjects(64)] },
		{ at: { list: nestedArrays(63) }, name: "an object around arrays", over: { list: nestedArrays(64) } },
	])("passes 64 levels and refuses 65 for $name", ({ at, over }: { at: unknown; over: unknown }) => {
		expect(() => {
			ApiRouteAssertRequestBodyShape(at);
		}).not.toThrow();

		const error: unknown = refusal(over);

		expect(error).toBeInstanceOf(BadRequestException);
		expect((error as BadRequestException).getResponse()).toEqual({ error: "Bad Request", message: [DEPTH_MESSAGE], statusCode: 400 });
	});

	it("does not count a scalar as a level", () => {
		expect(() => {
			ApiRouteAssertRequestBodyShape(JSON.parse(`${'{"a":'.repeat(64)}1${"}".repeat(64)}`));
		}).not.toThrow();
	});

	it.each([
		{ body: nestedObjects(100_000), name: "objects" },
		{ body: nestedArrays(100_000), name: "arrays" },
	])("refuses 100000 levels of $name without a stack overflow", ({ body }: { body: unknown }) => {
		expect((refusal(body) as BadRequestException).getResponse()).toMatchObject({ message: [DEPTH_MESSAGE] });
	});

	it.each([
		{ name: "the body", wrap: (value: object): object => value },
		{ name: "a nested object", wrap: (value: object): object => ({ nested: value }) },
		{ name: "an array item", wrap: (value: object): object => [value] },
	])("passes 1000 keys and refuses 1001 on $name", ({ wrap }: { wrap: (value: object) => object }) => {
		expect(() => {
			ApiRouteAssertRequestBodyShape(wrap(wideObject(1000)));
		}).not.toThrow();

		expect((refusal(wrap(wideObject(1001))) as BadRequestException).getResponse()).toMatchObject({ message: [KEYS_MESSAGE] });
	});

	it("checks a null-prototype object like a plain one", () => {
		expect(() => {
			ApiRouteAssertRequestBodyShape(wideObject(1000, null));
		}).not.toThrow();

		expect((refusal(wideObject(1001, null)) as BadRequestException).getResponse()).toMatchObject({ message: [KEYS_MESSAGE] });
	});

	it("does not limit the length of an array", () => {
		expect(() => {
			ApiRouteAssertRequestBodyShape({ items: Array.from({ length: 5000 }, (): number => 0) });
		}).not.toThrow();
	});

	it("walks only the items of a sparse array", () => {
		const sparse: Array<unknown> = [];
		sparse[4_294_967_294] = nestedObjects(64);

		expect((refusal(sparse) as BadRequestException).getResponse()).toMatchObject({ message: [DEPTH_MESSAGE] });
	});

	it("does not echo client keys", () => {
		const wide: Record<string, number> = wideObject(1000);
		wide.clientKeyMarker = 0;

		expect(JSON.stringify((refusal(wide) as BadRequestException).getResponse())).not.toContain("clientKeyMarker");
	});

	it("counts an own __proto__ key from JSON.parse as one key and leaves prototypes alone", () => {
		const atLimit: unknown = JSON.parse(`{"__proto__":{"polluted":true},${JSON.stringify(wideObject(999)).slice(1)}`);
		const overLimit: unknown = JSON.parse(`{"__proto__":0,${JSON.stringify(wideObject(1000)).slice(1)}`);

		expect(() => {
			ApiRouteAssertRequestBodyShape(atLimit);
		}).not.toThrow();

		expect((refusal(overLimit) as BadRequestException).getResponse()).toMatchObject({ message: [KEYS_MESSAGE] });
		expect(({} as { polluted?: boolean }).polluted).toBeUndefined();
	});

	it("walks into a __proto__ key from JSON.parse", () => {
		const body: unknown = JSON.parse(`{"__proto__":${JSON.stringify(wideObject(1001))}}`);

		expect((refusal(body) as BadRequestException).getResponse()).toMatchObject({ message: [KEYS_MESSAGE] });
	});

	it.each([
		{ body: undefined, name: "no body" },
		{ body: null, name: "null" },
		{ body: "text", name: "a string" },
		{ body: 7, name: "a number" },
		{ body: true, name: "a boolean" },
		{ body: Buffer.from(JSON.stringify(wideObject(1001))), name: "a Buffer" },
		{ body: new Uint8Array(2048), name: "a typed array" },
		{ body: Readable.from(["text"]), name: "a stream" },
		{ body: new Date(), name: "a Date" },
		{ body: new Map([["key", wideObject(1001)]]), name: "a Map" },
	])("leaves $name alone", ({ body }: { body: unknown }) => {
		expect(() => {
			ApiRouteAssertRequestBodyShape(body);
		}).not.toThrow();
	});

	it("does not read a class instance a consumer interceptor built", () => {
		const getter = vi.fn((): object => wideObject(1001));

		class TransformedBody {
			public get nested(): object {
				return getter();
			}

			public wide: Record<string, number> = wideObject(1001);
		}

		expect(() => {
			ApiRouteAssertRequestBodyShape(new TransformedBody());
			ApiRouteAssertRequestBodyShape({ nested: new TransformedBody() });
		}).not.toThrow();

		expect(getter).not.toHaveBeenCalled();
	});

	it("refuses a cyclic body instead of walking it forever", () => {
		const cycle: Record<string, unknown> = {};
		cycle.self = cycle;

		expect((refusal(cycle) as BadRequestException).getResponse()).toMatchObject({ message: [DEPTH_MESSAGE] });
	});

	it("does not change the body it checks", () => {
		const body: Record<string, unknown> = { items: [{ id: 1 }], name: "row" };
		const copy: string = JSON.stringify(body);

		ApiRouteAssertRequestBodyShape(body);

		expect(JSON.stringify(body)).toBe(copy);
	});
});
