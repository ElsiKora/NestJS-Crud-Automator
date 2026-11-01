import { ErrorException } from "@utility/error/exception.utility";
import { InstanceChecker } from "typeorm";

/**
 * Rejects a WHERE expression that TypeORM would widen or reject before it reaches the repository.
 * An undefined or null condition, an empty branch, an empty OR list, and an empty nested relation object
 * are refused instead of being dropped, so a missing criterion can never turn into a broader query.
 * A missing or empty top-level WHERE is allowed: it reads every row on purpose.
 * @param {unknown} where - WHERE expression passed to a TypeORM repository or query builder.
 * @returns {void}
 * @throws {Error} If the expression contains a condition that would be dropped or widened.
 */
export function DatabaseTypeOrmAssertEffectiveWhere(where: unknown): void {
	if (where === undefined || (isPlainRecord(where) && Object.keys(where).length === 0)) {
		return;
	}

	if (Array.isArray(where)) {
		if (where.length === 0) {
			throw ErrorException("WHERE cannot be an empty array of branches");
		}

		for (const [index, branch] of where.entries()) {
			if (!isPlainRecord(branch)) {
				throw ErrorException(`WHERE branch ${String(index)} must be a plain object`);
			}

			assertRecord(branch, `[${String(index)}]`);
		}

		return;
	}

	if (!isPlainRecord(where)) {
		throw ErrorException("WHERE must be a plain object or an array of plain objects");
	}

	assertRecord(where, "");
}

/**
 * Validates an array condition: either a list of nested branches or a list of scalar values.
 * @param {Array<unknown>} value - Array condition.
 * @param {string} path - Dotted path of the condition, used in error messages.
 * @returns {void}
 * @throws {Error} If an item is undefined or null, or a nested branch is invalid.
 */
function assertArrayValue(value: Array<unknown>, path: string): void {
	for (const [index, item] of value.entries()) {
		if (item === undefined || item === null) {
			throw ErrorException(`WHERE property "${path}[${String(index)}]" is ${String(item)}`);
		}

		if (isWhereObject(item)) {
			assertRecord(item, `${path}[${String(index)}]`);
		}
	}
}

/**
 * Validates every condition of one WHERE branch or nested relation object.
 * @param {Record<string, unknown>} record - WHERE branch or nested relation object.
 * @param {string} path - Dotted path of the record, used in error messages.
 * @returns {void}
 * @throws {Error} If the record is empty or holds a condition that would be dropped.
 */
function assertRecord(record: Record<string, unknown>, path: string): void {
	const entries: Array<[string, unknown]> = Object.entries(record);

	if (entries.length === 0) {
		throw ErrorException(`WHERE property "${path}" must contain at least one condition`);
	}

	for (const [key, value] of entries) {
		const propertyPath: string = path ? `${path}.${key}` : key;

		if (value === undefined || value === null) {
			throw ErrorException(`WHERE property "${propertyPath}" is ${String(value)}; use IsNull() or remove the property`);
		}

		if (Array.isArray(value)) {
			assertArrayValue(value, propertyPath);
		} else if (isWhereObject(value)) {
			assertRecord(value, propertyPath);
		}
	}
}

/**
 * Detects a plain object that TypeORM treats as a nested WHERE branch.
 * @param {unknown} value - Candidate value.
 * @returns {boolean} True for plain objects that are not dates, buffers, or FindOperators.
 */
function isPlainRecord(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date || ArrayBuffer.isView(value) || InstanceChecker.isFindOperator(value)) {
		return false;
	}

	const prototype: null | object = Object.getPrototypeOf(value) as null | object;

	return prototype === null || prototype === Object.prototype;
}

/**
 * Detects an object condition that TypeORM walks property by property: a plain object or an entity instance.
 * @param {unknown} value - Candidate value.
 * @returns {boolean} True for objects that are not dates, buffers, or FindOperators.
 */
function isWhereObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !ArrayBuffer.isView(value) && !InstanceChecker.isFindOperator(value));
}
