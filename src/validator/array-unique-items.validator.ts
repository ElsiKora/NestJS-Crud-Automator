import type { ValidationArguments, ValidatorConstraintInterface } from "class-validator";

import { ARRAY_UNIQUE_ITEMS_CONSTANT } from "@constant/validator/array-unique-items.constant";
import { DtoGetDeclaredPropertyNames } from "@utility/dto/get/declared-property-names.utility";
import { ValidatorConstraint } from "class-validator";

/**
 * Enforces `isUniqueItems` on a request array. Items count as equal the way JSON Schema `uniqueItems` compares them, whatever their key order,
 * and a Date by its instant. Items are keyed into a Set rather than compared in pairs, so the cost follows the body size; class-validator's
 * `ArrayUnique` is quadratic in the number of distinct items. An array whose items nest past `ARRAY_UNIQUE_ITEMS_CONSTANT.MAXIMUM_DEPTH` levels fails.
 */
@ValidatorConstraint({ name: "arrayUniqueItems" })
export class ArrayUniqueItemsValidator implements ValidatorConstraintInterface {
	/**
	 * Returns the error message of the failed check.
	 * @param {ValidationArguments} [validationArguments] - `value` tells a too deeply nested array from one with duplicates.
	 * @returns {string} The message, with `$property` replaced by class-validator.
	 */
	defaultMessage(validationArguments?: ValidationArguments): string {
		const value: unknown = validationArguments?.value;

		if (Array.isArray(value) && getItemKeys(value) === undefined) {
			return `$property must not nest items more than ${String(ARRAY_UNIQUE_ITEMS_CONSTANT.MAXIMUM_DEPTH)} levels deep`;
		}

		return "$property must not contain duplicate items";
	}

	/**
	 * Checks that an array holds no two equal items; any other value is left to `IsArray`.
	 * @param {unknown} value - Value of the decorated property.
	 * @param {ValidationArguments} [validationArguments] - `constraints[0]` may normalize top-level string items before they are compared.
	 * @returns {boolean} False when two items are equal, or when items are nested too deeply to compare.
	 */
	validate(value: unknown, validationArguments?: ValidationArguments): boolean {
		if (!Array.isArray(value)) {
			return true;
		}

		// class-validator leaves `constraints` undefined when the decorator passes none.
		const normalize: unknown = validationArguments?.constraints?.[0];
		const keys: Array<string> | undefined = getItemKeys(value, isItemNormalizer(normalize) ? normalize : undefined);

		return keys !== undefined && new Set<string>(keys).size === value.length;
	}
}

/**
 * Appends the comparison key of one value. Parts are appended rather than returned, so a nesting level does not copy the keys below it.
 * @param {unknown} item - Array item or a value nested in one.
 * @param {number} depth - Level of the value; an array item is at level 1.
 * @param {Array<string>} parts - Key parts built so far.
 * @param {Map<unknown, number>} identities - Numbers given so far to values compared by identity.
 * @returns {boolean} False when the value nests too deeply.
 */
function appendItemKey(item: unknown, depth: number, parts: Array<string>, identities: Map<unknown, number>): boolean {
	if (depth > ARRAY_UNIQUE_ITEMS_CONSTANT.MAXIMUM_DEPTH) {
		return false;
	}

	if (item instanceof Date) {
		parts.push(`date:${String(item.getTime())}`);

		return true;
	}

	if (Array.isArray(item)) {
		parts.push("[");

		for (const nested of item) {
			if (!appendItemKey(nested, depth + 1, parts, identities)) {
				return false;
			}

			parts.push(",");
		}

		parts.push("]");

		return true;
	}

	if (typeof item === "object" && item !== null) {
		return appendObjectKey(item, depth, parts, identities);
	}

	if (typeof item === "function" || typeof item === "symbol") {
		parts.push(getIdentityKey(item, identities));
	} else {
		parts.push(typeof item === "string" ? JSON.stringify(item) : `${typeof item}:${String(item)}`);
	}

	return true;
}

/**
 * Appends the comparison key of an object: its class and its data, read from the declared properties of a class instance and from all keys otherwise.
 * ValidationPipe `whitelist` strips undeclared keys only after this check runs, so they must not tell two items apart.
 * @param {object} item - Object to key.
 * @param {number} depth - Level of the object.
 * @param {Array<string>} parts - Key parts built so far.
 * @param {Map<unknown, number>} identities - Numbers given so far to values compared by identity.
 * @returns {boolean} False when the object nests too deeply.
 */
function appendObjectKey(item: object, depth: number, parts: Array<string>, identities: Map<unknown, number>): boolean {
	const prototype: null | object = Reflect.getPrototypeOf(item);
	const isPlainObject: boolean = prototype === null || prototype === Object.prototype;
	const declaredPropertyNames: ReadonlySet<string> | undefined = DtoGetDeclaredPropertyNames(item);
	const hasDeclaredProperties: boolean = declaredPropertyNames !== undefined && declaredPropertyNames.size > 0;

	const keys: Array<string> = Object.keys(item)
		.filter((key: string): boolean => (!hasDeclaredProperties || declaredPropertyNames?.has(key) === true) && Reflect.get(item, key) !== undefined)
		// eslint-disable-next-line @elsikora/sonar/no-alphabetical-sort -- By code unit: localeCompare calls canonically equal keys one key, and their order would then decide.
		.toSorted();

	// A Map, a Set, a RegExp or a class with only private fields shows no data to compare.
	if (keys.length === 0 && !isPlainObject && !hasDeclaredProperties) {
		parts.push(getIdentityKey(item, identities));

		return true;
	}

	// The class tells apart instances of different DTOs with equal data.
	parts.push(isPlainObject ? "{" : `${getIdentityKey(prototype, identities)}{`);

	for (const key of keys) {
		parts.push(JSON.stringify(key), ":");

		if (!appendItemKey(Reflect.get(item, key), depth + 1, parts, identities)) {
			return false;
		}

		parts.push(",");
	}

	parts.push("}");

	return true;
}

/**
 * Numbers a value compared by identity, the same number for the same value within one array.
 * @param {unknown} value - Value compared by identity.
 * @param {Map<unknown, number>} identities - Numbers given so far.
 * @returns {string} Comparison key.
 */
function getIdentityKey(value: unknown, identities: Map<unknown, number>): string {
	const identity: number = identities.get(value) ?? identities.size;

	identities.set(value, identity);

	return `identity:${String(identity)}`;
}

/**
 * Builds a string for each array item that is equal for two items exactly when the items are equal.
 * @param {Array<unknown>} items - Array items.
 * @param {(item: string) => string} [normalize] - Normalizes top-level string items.
 * @returns {Array<string> | undefined} Comparison keys, or undefined when an item nests too deeply.
 */
function getItemKeys(items: Array<unknown>, normalize?: (item: string) => string): Array<string> | undefined {
	const identities: Map<unknown, number> = new Map<unknown, number>();
	const keys: Array<string> = [];

	for (const item of items) {
		const parts: Array<string> = [];

		if (!appendItemKey(typeof item === "string" && normalize ? normalize(item) : item, 1, parts, identities)) {
			return undefined;
		}

		keys.push(parts.join(""));
	}

	return keys;
}

/**
 * Tells a normalize constraint from any other constraint value.
 * @param {unknown} candidate - Value of `constraints[0]`.
 * @returns {boolean} True for a function.
 */
function isItemNormalizer(candidate: unknown): candidate is (item: string) => string {
	return typeof candidate === "function";
}
