import { REQUEST_BODY_SHAPE_CONSTANT } from "@constant/request-body-shape.constant";
import { BadRequestException } from "@nestjs/common";

/**
 * Refuses a parsed request body too deep or too wide for the transformers behind it: `plainToInstance` overflows the stack on deep nesting and is quadratic in the keys of one object.
 * The body is level 1 and each object or array inside it adds a level; scalars add none, and an array counts as a level whatever its length.
 * Anything but a plain object or an array is left alone, so a Buffer, a stream or a class instance a consumer interceptor built passes unread.
 * The walk goes level by level without recursion and stops at the first breach. `__proto__` from `JSON.parse` is an own key like any other.
 * @param {unknown} body - Request body.
 * @returns {void}
 * @throws {BadRequestException} If the body nests too deeply or holds an object with too many keys.
 */
export function ApiRouteAssertRequestBodyShape(body: unknown): void {
	if (!isNestingValue(body)) {
		return;
	}

	let values: Array<object> = [body];
	let level: number = 1;

	while (values.length > 0) {
		const nextValues: Array<object> = [];

		for (const value of values) {
			// `Object.values` skips the holes of a sparse array, whose length can be far beyond its items.
			const children: Array<unknown> = Object.values(value);

			if (!Array.isArray(value) && children.length > REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_OBJECT_KEYS) {
				throw new BadRequestException([`request body must not hold an object with more than ${String(REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_OBJECT_KEYS)} keys`]);
			}

			for (const child of children) {
				if (isNestingValue(child)) {
					if (level === REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_DEPTH) {
						throw new BadRequestException([`request body must not nest more than ${String(REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_DEPTH)} levels deep`]);
					}

					nextValues.push(child);
				}
			}
		}

		values = nextValues;
		level += 1;
	}
}

/**
 * Checks whether a value is one the limits apply to: an array, or an object with no class of its own.
 * @param {unknown} value - Body or a value nested in it.
 * @returns {boolean} True for an array and for a plain or null-prototype object.
 */
function isNestingValue(value: unknown): value is object {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	if (Array.isArray(value)) {
		return true;
	}

	const prototype: null | object = Reflect.getPrototypeOf(value);

	return prototype === null || prototype === Object.prototype;
}
