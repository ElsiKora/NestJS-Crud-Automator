import { EnumValues } from "@utility/enum/values.utility";

/**
 * Checks whether the candidate is a member value of the given enum.
 * @template T - Enum object type.
 * @param {T} enumObject - Runtime enum object whose member values are allowed.
 * @param {unknown} candidate - Value to inspect.
 * @returns {boolean} True when candidate equals one of the enum member values.
 */
export function EnumIsValue<T extends Readonly<Record<string, number | string>>>(enumObject: T, candidate: unknown): candidate is T[keyof T] {
	const values: ReadonlyArray<unknown> = EnumValues(enumObject);

	return values.includes(candidate);
}
