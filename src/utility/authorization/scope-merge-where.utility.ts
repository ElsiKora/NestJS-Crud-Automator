import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { FindOptionsWhere } from "typeorm";

import { In } from "typeorm";

interface ITypeormFindOperatorShape {
	_type: string;
	_value: unknown;
}

/**
 * Merges two WHERE expressions by building a Cartesian product of OR branches.
 * @template E - Entity type
 * @param {TApiAuthorizationScopeWhere<E>} baseWhere - Existing filter.
 * @param {TApiAuthorizationScopeWhere<E>} scopedWhere - Additional scope filter.
 * @returns {TApiAuthorizationScopeWhere<E>} Combined filter.
 */
export function AuthorizationScopeMergeWhere<E extends IApiBaseEntity>(baseWhere: TApiAuthorizationScopeWhere<E>, scopedWhere: TApiAuthorizationScopeWhere<E>): TApiAuthorizationScopeWhere<E> {
	if (!baseWhere) {
		return scopedWhere;
	}

	if (!scopedWhere) {
		return baseWhere;
	}

	const baseVariants: Array<FindOptionsWhere<E>> = Array.isArray(baseWhere) ? baseWhere : [baseWhere];
	const scopedVariants: Array<FindOptionsWhere<E>> = Array.isArray(scopedWhere) ? scopedWhere : [scopedWhere];
	const mergedVariants: Array<FindOptionsWhere<E>> = [];

	for (const baseVariant of baseVariants) {
		for (const scopedVariant of scopedVariants) {
			mergedVariants.push(mergeWhereVariant(baseVariant, scopedVariant));
		}
	}

	return mergedVariants.length === 1 ? mergedVariants[0] : mergedVariants;
}

/**
 * Compares two where-clause leaf values for semantic equality.
 * @param {unknown} left - Existing value.
 * @param {unknown} right - Scoped value.
 * @returns {boolean} True when both values represent the same condition.
 */
function areValuesEquivalent(left: unknown, right: unknown): boolean {
	if (isFindOperator(left) && isFindOperator(right)) {
		return left._type === right._type && areValuesEquivalent(left._value, right._value);
	}

	if (Array.isArray(left) && Array.isArray(right)) {
		if (left.length !== right.length) {
			return false;
		}

		return left.every((value: unknown, index: number): boolean => areValuesEquivalent(value, right[index]));
	}

	if (isRecord(left) && isRecord(right)) {
		const leftKeys: Array<string> = Object.keys(left).sort((a: string, b: string) => a.localeCompare(b));
		const rightKeys: Array<string> = Object.keys(right).sort((a: string, b: string) => a.localeCompare(b));

		if (!areValuesEquivalent(leftKeys, rightKeys)) {
			return false;
		}

		return leftKeys.every((key: string): boolean => areValuesEquivalent(left[key], right[key]));
	}

	return left === right;
}

/**
 * Compares two scalar-like values for ordering-sensitive operators.
 * @param {unknown} left - Current value.
 * @param {unknown} right - Operator boundary value.
 * @returns {number} Comparison result suitable for inequality operators.
 */
function compareValues(left: unknown, right: unknown): number {
	const leftDate: number | undefined = normalizeDateValue(left);
	const rightDate: number | undefined = normalizeDateValue(right);

	if (leftDate !== undefined && rightDate !== undefined) {
		return leftDate - rightDate;
	}

	const leftNumber: number | undefined = normalizeNumberValue(left);
	const rightNumber: number | undefined = normalizeNumberValue(right);

	if (leftNumber !== undefined && rightNumber !== undefined) {
		return leftNumber - rightNumber;
	}

	return toComparableText(left).localeCompare(toComparableText(right));
}

/**
 * Builds a match-nothing FindOperator branch for impossible conflicts.
 * @returns {ITypeormFindOperatorShape} TypeORM `In([])` operator.
 */
function createMatchNothingOperator(): ITypeormFindOperatorShape {
	return In([]) as unknown as ITypeormFindOperatorShape;
}

/**
 * Detects TypeORM FindOperator-like values without depending on private typings.
 * @param {unknown} value - Candidate value.
 * @returns {boolean} True when the value looks like a FindOperator.
 */
function isFindOperator(value: unknown): value is ITypeormFindOperatorShape {
	return Boolean(value && typeof value === "object" && "_type" in value && "_value" in value);
}

/**
 * Detects plain record objects that can be merged recursively.
 * @param {unknown} value - Candidate value.
 * @returns {boolean} True when the value is a mergeable record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	return Boolean(value) && typeof value === "object" && !Array.isArray(value) && !isFindOperator(value);
}

/**
 * Checks whether a concrete scalar satisfies a TypeORM FindOperator condition.
 * @param {unknown} value - Concrete value.
 * @param {ITypeormFindOperatorShape} operator - FindOperator to evaluate.
 * @returns {boolean} True when the scalar satisfies the operator.
 */
function matchesFindOperator(value: unknown, operator: ITypeormFindOperatorShape): boolean {
	switch (operator._type) {
		case "between": {
			const boundaries: Array<unknown> = Array.isArray(operator._value) ? operator._value : [undefined, undefined];
			const start: unknown = boundaries[0];
			const end: unknown = boundaries[1];

			return compareValues(value, start) >= 0 && compareValues(value, end) <= 0;
		}

		case "equal": {
			return areValuesEquivalent(value, operator._value);
		}

		case "ilike": {
			return matchesLike(value, operator._value, true);
		}

		case "in": {
			const values: Array<unknown> = Array.isArray(operator._value) ? operator._value : [operator._value];

			return values.some((entry: unknown): boolean => (isFindOperator(entry) ? matchesFindOperator(value, entry) : areValuesEquivalent(value, entry)));
		}

		case "isnull": {
			return value === null || value === undefined;
		}

		case "lessThan": {
			return compareValues(value, operator._value) < 0;
		}

		case "lessThanOrEqual": {
			return compareValues(value, operator._value) <= 0;
		}

		case "like": {
			return matchesLike(value, operator._value, false);
		}

		case "moreThan": {
			return compareValues(value, operator._value) > 0;
		}

		case "moreThanOrEqual": {
			return compareValues(value, operator._value) >= 0;
		}

		case "not": {
			return isFindOperator(operator._value) ? !matchesFindOperator(value, operator._value) : !areValuesEquivalent(value, operator._value);
		}

		default: {
			return false;
		}
	}
}

/**
 * Evaluates SQL-like wildcard matching against a concrete scalar.
 * @param {unknown} value - Concrete value.
 * @param {unknown} pattern - SQL-like pattern.
 * @param {boolean} isCaseInsensitive - Whether matching should ignore case.
 * @returns {boolean} True when the value matches the pattern.
 */
function matchesLike(value: unknown, pattern: unknown, isCaseInsensitive: boolean): boolean {
	if (value === null || value === undefined) {
		return false;
	}

	const text: string = toComparableText(value);
	const rawPattern: string = toComparableText(pattern);
	const needle: string = rawPattern.replaceAll("%", "");

	if (needle.length === 0) {
		return true;
	}

	if (isCaseInsensitive) {
		return text.toLowerCase().includes(needle.toLowerCase());
	}

	return text.includes(needle);
}

/**
 * Recursively merges nested record values using logical AND semantics.
 * @param {Record<string, unknown>} baseValue - Existing branch.
 * @param {Record<string, unknown>} scopedValue - Scoped branch.
 * @returns {Record<string, unknown>} Merged branch.
 */
function mergeRecordValues(baseValue: Record<string, unknown>, scopedValue: Record<string, unknown>): Record<string, unknown> {
	const mergedValue: Record<string, unknown> = { ...baseValue };
	const keys: Set<string> = new Set<string>([...Object.keys(baseValue), ...Object.keys(scopedValue)]);

	for (const key of keys) {
		const currentBaseValue: unknown = baseValue[key];
		const currentScopedValue: unknown = scopedValue[key];

		if (currentBaseValue === undefined) {
			mergedValue[key] = currentScopedValue;
			continue;
		}

		if (currentScopedValue === undefined) {
			mergedValue[key] = currentBaseValue;
			continue;
		}

		mergedValue[key] = mergeWhereValue(currentBaseValue, currentScopedValue);
	}

	return mergedValue;
}

/**
 * Merges two where-clause leaf values without allowing overwrite semantics.
 * @param {unknown} baseValue - Existing value.
 * @param {unknown} scopedValue - Scoped value.
 * @returns {unknown} Narrowed value or a match-nothing operator on conflict.
 */
function mergeWhereValue(baseValue: unknown, scopedValue: unknown): unknown {
	if (isRecord(baseValue) && isRecord(scopedValue)) {
		return mergeRecordValues(baseValue, scopedValue);
	}

	if (areValuesEquivalent(baseValue, scopedValue)) {
		return baseValue;
	}

	if (isFindOperator(baseValue) && !isFindOperator(scopedValue)) {
		return matchesFindOperator(scopedValue, baseValue) ? scopedValue : createMatchNothingOperator();
	}

	if (!isFindOperator(baseValue) && isFindOperator(scopedValue)) {
		return matchesFindOperator(baseValue, scopedValue) ? baseValue : createMatchNothingOperator();
	}

	return createMatchNothingOperator();
}

/**
 * Merges a single TypeORM where variant using logical AND semantics.
 * @param {FindOptionsWhere<E>} baseVariant - Existing branch.
 * @param {FindOptionsWhere<E>} scopedVariant - Scoped branch.
 * @returns {FindOptionsWhere<E>} Merged branch.
 * @template E - Entity type
 */
function mergeWhereVariant<E extends IApiBaseEntity>(baseVariant: FindOptionsWhere<E>, scopedVariant: FindOptionsWhere<E>): FindOptionsWhere<E> {
	return mergeRecordValues(baseVariant as Record<string, unknown>, scopedVariant as Record<string, unknown>) as FindOptionsWhere<E>;
}

/**
 * Normalizes date-like values into comparable timestamps.
 * @param {unknown} value - Candidate date-like value.
 * @returns {number | undefined} Timestamp when the value is date-like.
 */
function normalizeDateValue(value: unknown): number | undefined {
	if (value instanceof Date) {
		return value.getTime();
	}

	if (typeof value === "string" || typeof value === "number") {
		const date: Date = new Date(value);
		const timestamp: number = date.getTime();

		return Number.isNaN(timestamp) ? undefined : timestamp;
	}

	return undefined;
}

/**
 * Normalizes numeric values and numeric strings into numbers.
 * @param {unknown} value - Candidate numeric value.
 * @returns {number | undefined} Numeric representation when available.
 */
function normalizeNumberValue(value: unknown): number | undefined {
	if (typeof value === "number") {
		return value;
	}

	if (typeof value === "bigint") {
		return Number(value);
	}

	if (typeof value === "string" && value.trim().length > 0) {
		const parsedValue: number = Number(value);

		return Number.isNaN(parsedValue) ? undefined : parsedValue;
	}

	return undefined;
}

/**
 * Converts scalar-like values into safe comparable text.
 * @param {unknown} value - Candidate scalar.
 * @returns {string} Text representation without object default stringification.
 */
function toComparableText(value: unknown): string {
	if (typeof value === "string") {
		return value;
	}

	if (typeof value === "number" || typeof value === "bigint" || typeof value === "boolean") {
		return value.toString();
	}

	if (value instanceof Date) {
		return value.toISOString();
	}

	return "";
}
