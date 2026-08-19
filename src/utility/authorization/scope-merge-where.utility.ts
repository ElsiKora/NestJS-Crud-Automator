import type { IApiBaseEntity } from "@interface/api-base-entity.interface";
import type { TApiAuthorizationScopeWhere } from "@type/class/api/authorization/scope-where.type";
import type { FindOperator, FindOptionsWhere } from "typeorm";

import { ErrorException } from "@utility/error/exception.utility";
import { And, Equal, In, InstanceChecker } from "typeorm";

const UNSAFE_WHERE_PROPERTY_NAMES: ReadonlySet<string> = new Set<string>([...Object.getOwnPropertyNames(Object.prototype), "prototype"]);

/**
 * Merges two WHERE expressions by building a Cartesian product of OR branches.
 * @template E - Entity type
 * @param {TApiAuthorizationScopeWhere<E>} baseWhere - Existing filter.
 * @param {TApiAuthorizationScopeWhere<E>} scopedWhere - Additional scope filter.
 * @returns {TApiAuthorizationScopeWhere<E>} Combined filter.
 */
export function AuthorizationScopeMergeWhere<E extends IApiBaseEntity>(baseWhere: TApiAuthorizationScopeWhere<E>, scopedWhere: TApiAuthorizationScopeWhere<E>): TApiAuthorizationScopeWhere<E> {
	validateWhereOperand(baseWhere);
	validateWhereOperand(scopedWhere);

	if (!baseWhere) {
		return scopedWhere ? normalizeWhereOperand(scopedWhere) : scopedWhere;
	}

	if (!scopedWhere) {
		return baseWhere;
	}

	const baseVariants: Array<FindOptionsWhere<E>> = Array.isArray(baseWhere) ? baseWhere : [baseWhere];
	const scopedVariants: Array<FindOptionsWhere<E>> = Array.isArray(scopedWhere) ? scopedWhere : [scopedWhere];
	const mergedVariants: Array<FindOptionsWhere<E>> = [];

	for (const baseVariant of baseVariants) {
		for (const scopedVariant of scopedVariants) {
			mergedVariants.push(mergeRecordValues(baseVariant, scopedVariant) as FindOptionsWhere<E>);
		}
	}

	const mergedWhere: Array<FindOptionsWhere<E>> | FindOptionsWhere<E> | undefined = mergedVariants.length === 1 ? mergedVariants[0] : mergedVariants;

	if (!mergedWhere) {
		throw ErrorException("Authorization scope WHERE merge produced no branches");
	}

	return normalizeWhereOperand(mergedWhere);
}

/**
 * Compares two where-clause leaf values for semantic equality.
 * @param {unknown} left - Existing value.
 * @param {unknown} right - Scoped value.
 * @returns {boolean} True when both values represent the same condition.
 */
function areValuesEquivalent(left: unknown, right: unknown): boolean {
	if (left instanceof Date || right instanceof Date) {
		return left instanceof Date && right instanceof Date && left.getTime() === right.getTime();
	}

	if (isFindOperator(left) && isFindOperator(right)) {
		return left === right;
	}

	if (Array.isArray(left) && Array.isArray(right)) {
		if (left.length !== right.length) {
			return false;
		}

		return left.every((value: unknown, index: number): boolean => areValuesEquivalent(value, right[index]));
	}

	if (isRecord(left) && isRecord(right)) {
		const leftKeys: Array<string> = Object.keys(left).toSorted((a: string, b: string) => a.localeCompare(b));
		const rightKeys: Array<string> = Object.keys(right).toSorted((a: string, b: string) => a.localeCompare(b));

		if (!areValuesEquivalent(leftKeys, rightKeys)) {
			return false;
		}

		return leftKeys.every((key: string): boolean => areValuesEquivalent(left[key], right[key]));
	}

	return left === right;
}

/**
 * Builds a TypeORM conjunction without approximating database operator semantics.
 * @param {unknown} baseValue - Existing scalar or operator.
 * @param {unknown} scopedValue - Scoped scalar or operator.
 * @returns {FindOperator<unknown>} TypeORM `And(...)` operator.
 */
function createConjunctionOperator(baseValue: unknown, scopedValue: unknown): FindOperator<unknown> {
	const baseOperator: FindOperator<unknown> = isFindOperator(baseValue) ? baseValue : Equal(baseValue);
	const scopedOperator: FindOperator<unknown> = isFindOperator(scopedValue) ? scopedValue : Equal(scopedValue);

	return And(baseOperator, scopedOperator);
}

/**
 * Builds a match-nothing FindOperator branch for impossible conflicts.
 * @returns {FindOperator<unknown>} TypeORM `In([])` operator.
 */
function createMatchNothingOperator(): FindOperator<unknown> {
	return In([]);
}

/**
 * Defines an own enumerable WHERE property without invoking prototype setters.
 * @param {Record<string, unknown>} target - WHERE branch receiving the property.
 * @param {string} key - Entity property name.
 * @param {unknown} value - WHERE condition value.
 * @returns {void}
 */
function defineWhereProperty(target: Record<string, unknown>, key: string, value: unknown): void {
	Object.defineProperty(target, key, {
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		configurable: true,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		enumerable: true,
		value,
		// eslint-disable-next-line @elsikora/typescript/naming-convention
		writable: true,
	});
}

/**
 * Reads a dense array through own data descriptors without invoking accessors.
 * @param {Array<unknown>} value - Candidate array.
 * @returns {Array<unknown> | undefined} Stable item values, or undefined for sparse/extended/accessor arrays.
 */
function getDenseArrayDataValues(value: Array<unknown>): Array<unknown> | undefined {
	const ownKeys: Array<PropertyKey> = Reflect.ownKeys(value);
	const lengthDescriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, "length");

	if (ownKeys.length !== value.length + 1 || !lengthDescriptor || lengthDescriptor.enumerable || !("value" in lengthDescriptor) || lengthDescriptor.value !== value.length) {
		return undefined;
	}

	const values: Array<unknown> = [];

	for (let index: number = 0; index < value.length; index++) {
		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, String(index));

		if (!descriptor?.enumerable || !("value" in descriptor)) {
			return undefined;
		}

		values.push(descriptor.value);
	}

	return values;
}

/**
 * Reads enumerable string-keyed data properties without invoking accessors.
 * @param {Record<string, unknown>} value - Candidate WHERE record.
 * @returns {Array<[string, unknown]> | undefined} Stable entries, or undefined for hidden, symbol, or accessor properties.
 */
function getWhereRecordDataEntries(value: Record<string, unknown>): Array<[string, unknown]> | undefined {
	const entries: Array<[string, unknown]> = [];

	for (const key of Reflect.ownKeys(value)) {
		if (typeof key !== "string") {
			return undefined;
		}

		const descriptor: PropertyDescriptor | undefined = Object.getOwnPropertyDescriptor(value, key);

		if (!descriptor?.enumerable || !("value" in descriptor)) {
			return undefined;
		}

		entries.push([key, descriptor.value]);
	}

	return entries;
}

/**
 * Detects whether every declared WHERE property contains a condition TypeORM will not discard.
 * @param {Record<string, unknown>} branch - Plain WHERE branch.
 * @returns {boolean} True when the branch is non-empty and every condition is effective.
 */
function hasOnlyEffectiveWherePredicates(branch: Record<string, unknown>): boolean {
	const entries: Array<[string, unknown]> | undefined = getWhereRecordDataEntries(branch);

	if (!entries?.length) {
		return false;
	}

	return entries.every(([, value]: [string, unknown]): boolean => {
		if (value === undefined || value === null) {
			return false;
		}

		if (Array.isArray(value)) {
			const arrayValues: Array<unknown> | undefined = getDenseArrayDataValues(value);

			if (!arrayValues) {
				return false;
			}

			if (arrayValues.length === 0) {
				return true;
			}

			const objectBranches: Array<boolean> = arrayValues.map((branchValue: unknown): boolean => isWhereBranchObject(branchValue));

			if (objectBranches.every(Boolean)) {
				return arrayValues.every((branchValue: unknown): boolean => hasOnlyEffectiveWherePredicates(branchValue as Record<string, unknown>));
			}

			if (objectBranches.some(Boolean)) {
				return false;
			}

			return arrayValues.every((scalarValue: unknown): boolean => scalarValue !== undefined && scalarValue !== null && !Array.isArray(scalarValue) && (isAtomicWhereValue(scalarValue) || ["bigint", "boolean", "number", "string"].includes(typeof scalarValue)));
		}

		if (isWhereBranchObject(value)) {
			return hasOnlyEffectiveWherePredicates(value);
		}

		return isAtomicWhereValue(value) || ["bigint", "boolean", "number", "string"].includes(typeof value);
	});
}

/**
 * Detects object-shaped values that the normalizer treats as scalar predicates.
 * @param {unknown} value - Candidate WHERE value.
 * @returns {boolean} True for supported atomic object values.
 */
function isAtomicWhereValue(value: unknown): boolean {
	return value instanceof Date || isFindOperator(value) || ArrayBuffer.isView(value);
}

/**
 * Detects TypeORM FindOperator-like values without depending on private typings.
 * @param {unknown} value - Candidate value.
 * @returns {boolean} True when the value looks like a FindOperator.
 */
function isFindOperator(value: unknown): value is FindOperator<unknown> {
	return InstanceChecker.isFindOperator(value);
}

/**
 * Detects plain record objects that can be merged recursively.
 * @param {unknown} value - Candidate value.
 * @returns {boolean} True when the value is a mergeable record.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
	if (!value || typeof value !== "object" || Array.isArray(value) || value instanceof Date || isFindOperator(value)) {
		return false;
	}

	const prototype: null | object = Object.getPrototypeOf(value) as null | object;

	return prototype === null || prototype === Object.prototype;
}

/**
 * Detects object values that TypeORM may interpret as nested relation criteria.
 * @param {unknown} value - Candidate nested WHERE value.
 * @returns {boolean} True when the object must be inspected recursively.
 */
function isWhereBranchObject(value: unknown): value is Record<string, unknown> {
	return Boolean(value && typeof value === "object" && !Array.isArray(value) && !isAtomicWhereValue(value));
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
			defineWhereProperty(mergedValue, key, currentScopedValue);
			continue;
		}

		if (currentScopedValue === undefined) {
			defineWhereProperty(mergedValue, key, currentBaseValue);
			continue;
		}

		defineWhereProperty(mergedValue, key, mergeWhereValue(currentBaseValue, currentScopedValue));
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

	if (isFindOperator(baseValue) || isFindOperator(scopedValue)) {
		return createConjunctionOperator(baseValue, scopedValue);
	}

	return createMatchNothingOperator();
}

/**
 * Normalizes a validated WHERE operand before TypeORM receives it.
 * @template E - Entity type
 * @param {TApiAuthorizationScopeWhere<E>} value - Validated operand.
 * @returns {TApiAuthorizationScopeWhere<E>} Operand with scalar leaves represented by exact Equal operators.
 */
function normalizeWhereOperand<E extends IApiBaseEntity>(value: NonNullable<TApiAuthorizationScopeWhere<E>>): TApiAuthorizationScopeWhere<E> {
	if (Array.isArray(value)) {
		return value.map((branch: FindOptionsWhere<E>): FindOptionsWhere<E> => normalizeWhereRecord(branch) as FindOptionsWhere<E>);
	}

	return normalizeWhereRecord(value) as FindOptionsWhere<E>;
}

/**
 * Normalizes every value in a WHERE branch without invoking prototype setters.
 * @param {Record<string, unknown>} value - Validated WHERE branch.
 * @returns {Record<string, unknown>} Normalized branch.
 */
function normalizeWhereRecord(value: Record<string, unknown>): Record<string, unknown> {
	const normalized: Record<string, unknown> = {};
	const entries: Array<[string, unknown]> | undefined = getWhereRecordDataEntries(value);

	if (!entries) {
		throw ErrorException("Authorization scope WHERE object must contain enumerable data properties only");
	}

	for (const [key, nestedValue] of entries) {
		defineWhereProperty(normalized, key, normalizeWhereValue(nestedValue));
	}

	return normalized;
}

/**
 * Converts scalar leaves to exact TypeORM equality while retaining relation structure.
 * @param {unknown} value - Validated WHERE value.
 * @returns {unknown} Normalized TypeORM condition.
 */
function normalizeWhereValue(value: unknown): unknown {
	if (isFindOperator(value)) {
		return value;
	}

	if (Array.isArray(value)) {
		const arrayValues: Array<unknown> | undefined = getDenseArrayDataValues(value);

		if (!arrayValues) {
			throw ErrorException("Authorization scope WHERE arrays must contain dense enumerable data items only");
		}

		if (arrayValues.length === 0) {
			return Equal(arrayValues);
		}

		const objectBranches: Array<boolean> = arrayValues.map((branchValue: unknown): boolean => isWhereBranchObject(branchValue));

		return objectBranches.every(Boolean) ? arrayValues.map((branchValue: unknown): Record<string, unknown> => normalizeWhereRecord(branchValue as Record<string, unknown>)) : Equal(arrayValues);
	}

	return isWhereBranchObject(value) ? normalizeWhereRecord(value) : Equal(value);
}

/**
 * Rejects array-form WHERE expressions that TypeORM would interpret as unconstrained.
 * @param {unknown} value - Candidate array-form WHERE expression.
 * @returns {void}
 */
function validateWhereArray(value: unknown): void {
	if (!Array.isArray(value)) {
		return;
	}

	const branches: Array<unknown> | undefined = getDenseArrayDataValues(value);

	if (!branches) {
		throw ErrorException("Authorization scope WHERE array branches must be non-empty plain objects");
	}

	if (branches.length === 0) {
		throw ErrorException("Authorization scope WHERE cannot be an empty array");
	}

	if (branches.some((branch: unknown): boolean => !isRecord(branch) || !hasOnlyEffectiveWherePredicates(branch))) {
		throw ErrorException("Authorization scope WHERE array branches must be non-empty plain objects");
	}

	for (const branch of branches as Array<Record<string, unknown>>) {
		validateWhereRecordKeys(branch);
	}
}

/**
 * Rejects malformed or non-empty but ineffective scalar WHERE expressions.
 * @param {unknown} value - Candidate WHERE expression.
 * @returns {void}
 */
function validateWhereOperand(value: unknown): void {
	if (value === undefined) {
		return;
	}

	if (Array.isArray(value)) {
		validateWhereArray(value);

		return;
	}

	if (!isRecord(value)) {
		throw ErrorException("Authorization scope WHERE must be undefined, a plain object, or an array of plain objects");
	}

	const entries: Array<[string, unknown]> | undefined = getWhereRecordDataEntries(value);

	if (!entries || (entries.length > 0 && !hasOnlyEffectiveWherePredicates(value))) {
		throw ErrorException("Authorization scope WHERE object must contain an effective predicate");
	}

	validateWhereRecordKeys(value);
}

/**
 * Rejects prototype-sensitive entity paths recursively.
 * @param {Record<string, unknown>} value - WHERE branch to inspect.
 * @returns {void}
 */
function validateWhereRecordKeys(value: Record<string, unknown>): void {
	const entries: Array<[string, unknown]> | undefined = getWhereRecordDataEntries(value);

	if (!entries) {
		throw ErrorException("Authorization scope WHERE object must contain enumerable data properties only");
	}

	for (const [key, nestedValue] of entries) {
		if (UNSAFE_WHERE_PROPERTY_NAMES.has(key)) {
			throw ErrorException(`Authorization scope WHERE property "${key}" is not a safe property name`);
		}

		if (Array.isArray(nestedValue)) {
			const branches: Array<unknown> | undefined = getDenseArrayDataValues(nestedValue);

			if (!branches) {
				throw ErrorException("Authorization scope WHERE arrays must contain dense enumerable data items only");
			}

			for (const branch of branches) {
				if (isWhereBranchObject(branch)) {
					validateWhereRecordKeys(branch);
				}
			}
		} else if (isWhereBranchObject(nestedValue)) {
			validateWhereRecordKeys(nestedValue);
		}
	}
}
