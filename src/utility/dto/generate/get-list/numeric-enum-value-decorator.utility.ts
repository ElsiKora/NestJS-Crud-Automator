import type { TApiPropertyEnumProperties } from "@type/decorator/api/property";

import { EnumValues } from "@utility/enum/values.utility";
import { Transform } from "class-transformer";

/**
 * Builds the transform that reads a GET_LIST filter value on an enum property as the numeric member the published schema names, whether it arrives in `[value]` or `[values]`.
 * A query string carries the published number as text. Only the exact text of a numeric member converts, so `1.0` or the member's name stays what the enum validator rejects.
 * Apply it after the generated enum decorators and before the `[values]` scalar wrap, which class-transformer then runs first.
 * @param {TApiPropertyEnumProperties["enum"]} enumObject - Enum of the filtered property.
 * @returns {PropertyDecorator} Transform decorator for the filter property.
 */
export function DtoGenerateGetListNumericEnumValueDecorator(enumObject: TApiPropertyEnumProperties["enum"]): PropertyDecorator {
	const numericMembers: ReadonlyArray<number> = EnumValues(enumObject).filter((member: number | string): member is number => typeof member === "number");

	return Transform(({ value }: { value: unknown }): unknown => (Array.isArray(value) ? value.map((item: unknown): unknown => toNumericMember(item, numericMembers)) : toNumericMember(value, numericMembers)), { toClassOnly: true });
}

/**
 * Converts the exact text of a numeric enum member to that member.
 * @param {unknown} value - Raw filter value.
 * @param {ReadonlyArray<number>} numericMembers - Numeric members of the enum.
 * @returns {unknown} The member, or the value as it came.
 */
function toNumericMember(value: unknown, numericMembers: ReadonlyArray<number>): unknown {
	return typeof value === "string" ? (numericMembers.find((member: number): boolean => String(member) === value) ?? value) : value;
}
