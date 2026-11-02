import { ApiRequestValidationException } from "@class/api/request-validation-exception.class";
import { REQUEST_BODY_SHAPE_CONSTANT } from "@constant/request-body-shape.constant";
import { ValidationError } from "class-validator";

/**
 * Refuses a parsed request body too deep or too wide for the transformers behind it: `plainToInstance` overflows the stack on deep nesting and is quadratic in the keys of one object.
 * The body is level 1 and each object or array inside it adds a level; scalars add none, and an array counts as a level whatever its length.
 * Anything but a plain object or an array is left alone, so a Buffer, a stream or a class instance a consumer interceptor built passes unread.
 * The walk goes level by level without recursion and stops at the first breach. `__proto__` from `JSON.parse` is an own key like any other.
 * Each object is walked once, at its shallowest level: a multipart parser points every field back at the body, and a walk by path would double on each level.
 * @param {unknown} body - Request body.
 * @returns {void}
 * @throws {ApiRequestValidationException} If the body nests too deeply or holds an object with too many keys. The failure's `property` is the path of the object in the body, empty for the body itself.
 */
export function ApiRouteAssertRequestBodyShape(body: unknown): void {
	if (!isNestingValue(body)) {
		return;
	}

	// Each object links to the one it was reached from, so only a refusal pays for its path.
	const parents: Map<object, null | object> = new Map<object, null | object>([[body, null]]);
	let values: Array<object> = [body];
	let level: number = 1;

	while (values.length > 0) {
		const nextValues: Array<object> = [];

		for (const value of values) {
			// `Object.values` skips the holes of a sparse array, whose length can be far beyond its items.
			const children: Array<unknown> = Object.values(value);

			if (!Array.isArray(value) && children.length > REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_OBJECT_KEYS) {
				throw createRefusal(REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_KEYS_CONSTRAINT, `request body must not hold an object with more than ${String(REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_OBJECT_KEYS)} keys`, value, parents);
			}

			for (const child of children) {
				if (isNestingValue(child) && !parents.has(child)) {
					parents.set(child, value);

					if (level === REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_DEPTH) {
						throw createRefusal(REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_DEPTH_CONSTRAINT, `request body must not nest more than ${String(REQUEST_BODY_SHAPE_CONSTANT.MAXIMUM_DEPTH)} levels deep`, child, parents);
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
 * Builds the refusal of an object in the body. The failure holds no `value` or `target`, so it carries nothing of the body but the path.
 * @param {string} constraint - Stable constraint name.
 * @param {string} message - Message of the failure.
 * @param {object} value - The object refused.
 * @param {Map<object, null | object>} parents - The object each walked object was reached from.
 * @returns {ApiRequestValidationException} The exception to throw.
 */
function createRefusal(constraint: string, message: string, value: object, parents: Map<object, null | object>): ApiRequestValidationException {
	return new ApiRequestValidationException([Object.assign(new ValidationError(), { children: [], constraints: { [constraint]: message }, property: getBodyPath(value, parents) })]);
}

/**
 * Builds the dotted path of an object in the body by following its parent links.
 * @param {object} value - The object.
 * @param {Map<object, null | object>} parents - The object each walked object was reached from.
 * @returns {string} The path, empty for the body itself.
 */
function getBodyPath(value: object, parents: Map<object, null | object>): string {
	const segments: Array<string> = [];
	let current: object = value;
	let parent: null | object | undefined = parents.get(current);

	while (parent) {
		segments.push(getKeyOfChild(parent, current));
		current = parent;
		parent = parents.get(current);
	}

	return segments.toReversed().join(".");
}

/**
 * Finds the key an object holds a child under.
 * @param {object} parent - The holding object.
 * @param {object} child - The held object.
 * @returns {string} The first key that holds the child, or an empty string if a getter no longer gives it.
 */
function getKeyOfChild(parent: object, child: object): string {
	return Object.keys(parent).find((key: string): boolean => Reflect.get(parent, key) === child) ?? "";
}

/**
 * Checks whether a value is one the limits apply to: an array, or an object with no class of its own.
 * @param {unknown} value - Body or a value nested in it.
 * @returns {boolean} True for an array, a plain or null-prototype object, and an object whose prototype has no prototype, which is what `fast-querystring` builds for a Fastify form body.
 */
function isNestingValue(value: unknown): value is object {
	if (typeof value !== "object" || value === null) {
		return false;
	}

	if (Array.isArray(value)) {
		return true;
	}

	const prototype: null | object = Reflect.getPrototypeOf(value);

	return prototype === null || Reflect.getPrototypeOf(prototype) === null;
}
