import { AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT } from "@constant/class/authorization/column-family-iam.constant";
import { EApiAuthorizationIamColumnFamily } from "@enum/class/authorization";
import { EApiPropertyDescribeType } from "@enum/decorator/api";

import { ApiControllerParametersIsIntegerColumn } from "./numeric-type.utility";

const KEY_TYPES_NONE: ReadonlySet<EApiPropertyDescribeType> = new Set<EApiPropertyDescribeType>();
const KEY_TYPES_BOOLEAN: ReadonlySet<EApiPropertyDescribeType> = new Set<EApiPropertyDescribeType>([EApiPropertyDescribeType.BOOLEAN]);
const KEY_TYPES_DATE: ReadonlySet<EApiPropertyDescribeType> = new Set<EApiPropertyDescribeType>([EApiPropertyDescribeType.DATE]);
const KEY_TYPES_ENUM: ReadonlySet<EApiPropertyDescribeType> = new Set<EApiPropertyDescribeType>([EApiPropertyDescribeType.ENUM]);
const KEY_TYPES_UUID: ReadonlySet<EApiPropertyDescribeType> = new Set<EApiPropertyDescribeType>([EApiPropertyDescribeType.UUID]);

// The families whose every type has a described type of its own.
const KEY_TYPES_BY_FAMILY: ReadonlyMap<EApiAuthorizationIamColumnFamily, ReadonlySet<EApiPropertyDescribeType>> = new Map<EApiAuthorizationIamColumnFamily, ReadonlySet<EApiPropertyDescribeType>>([
	[EApiAuthorizationIamColumnFamily.ENUM, KEY_TYPES_ENUM],
	[EApiAuthorizationIamColumnFamily.UUID, KEY_TYPES_UUID],
]);
// A `createDate`, `updateDate` or `deleteDate` column names no type, and neither does a `version` column, which holds an integer.
const KEY_TYPES_UNNAMED: ReadonlySet<EApiPropertyDescribeType> = new Set<EApiPropertyDescribeType>([EApiPropertyDescribeType.DATE, EApiPropertyDescribeType.NUMBER]);

/**
 * Tells which described types give a path value in a column exactly one accepted spelling, so the text a policy compares names one row.
 * A text column compares the text itself, and an integer column is checked for its canonical decimal text whatever describes it, so any described type fits them.
 * A UUID, enum, boolean, date or date-and-time column fits only its own described type, which accepts one spelling of each value.
 * A database reads several spellings of a decimal, a floating-point number, a time of day, a year, an interval, a network address, a set and any other type as one key, and no described type accepts only one of them.
 * @param {unknown} type - Column type as declared to TypeORM, or the property type TypeORM takes when the decorator names none.
 * @returns {ReadonlySet<EApiPropertyDescribeType> | undefined} The described types that fit, an empty set when none does, or undefined when any does.
 */
export function ApiControllerParametersReadKeyDescribeTypes(type: unknown): ReadonlySet<EApiPropertyDescribeType> | undefined {
	if (type === undefined) {
		return KEY_TYPES_UNNAMED;
	}

	if (ApiControllerParametersIsIntegerColumn(type)) {
		return undefined;
	}

	const name: string | undefined = typeof type === "string" ? type.trim().toLowerCase() : undefined;
	const family: EApiAuthorizationIamColumnFamily | undefined = AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.TYPES.get(name ?? type);

	// A boolean or date type name outside the exact lists, such as `bit`, `time` or `interval`, has no type of its own.
	if (family === EApiAuthorizationIamColumnFamily.BOOLEAN) {
		return name === undefined || AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.BOOLEAN_TYPES.has(name) ? KEY_TYPES_BOOLEAN : KEY_TYPES_NONE;
	}

	if (family === EApiAuthorizationIamColumnFamily.DATE) {
		return name === undefined || AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.DATE_TYPES.has(name) ? KEY_TYPES_DATE : KEY_TYPES_NONE;
	}

	if (family === EApiAuthorizationIamColumnFamily.TEXT) {
		return undefined;
	}

	// A list, bytes, JSON, a network address, a decimal or float, and a type no family names take several spellings as one key.
	return (family === undefined ? undefined : KEY_TYPES_BY_FAMILY.get(family)) ?? KEY_TYPES_NONE;
}
