import { AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT } from "@constant/class/authorization/column-family-iam.constant";

const BIGINT_COLUMN_BITS: number = 64;

/**
 * Tells whether a TypeORM column type names a signed 64-bit integer column, such as `bigint` or `int8`, whose request values must be in the signed 64-bit range.
 * @param {unknown} type - Column type as declared to TypeORM.
 * @returns {boolean} Whether the column holds a signed 64-bit integer.
 */
export function IsBigIntColumnType(type: unknown): boolean {
	return typeof type === "string" && AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.INTEGER_BITS.get(type.trim().toLowerCase()) === BIGINT_COLUMN_BITS;
}
