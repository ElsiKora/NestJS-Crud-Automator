import type { FindOperator } from "typeorm";

import { EFilterOperation } from "@enum/filter";
import { ApiControllerGetListQueryLike } from "@utility/api/controller/get-list/query/like.utility";
import { Between, Equal, In, IsNull, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, Not } from "typeorm";

/**
 * Converts filter operation enum values to TypeORM query operators.
 * Supports various operations like BETWEEN, CONTAINS, EQUALS, GREATER_THAN, etc. The client text of a LIKE family operation matches itself, see {@link ApiControllerGetListQueryLike}.
 * @param {EFilterOperation} operation - The filter operation type from the enum
 * @param {unknown} value - The value to filter by
 * @param {string} [driverType] - Driver type of the DataSource the list reads.
 * @returns {FindOperator<unknown>} The TypeORM FindOperator for the specified operation and value
 */
export function ApiControllerGetListTransformOperation(operation: EFilterOperation, value: unknown, driverType?: string): FindOperator<unknown> {
	switch (operation) {
		case EFilterOperation.BETWEEN: {
			// eslint-disable-next-line @elsikora/typescript/no-unsafe-assignment
			const [start, end]: Array<unknown> = Array.isArray(value) ? value : [null, null];

			return Between(start, end);
		}

		case EFilterOperation.CONT: {
			return ApiControllerGetListQueryLike(String(value), { hasLeadingWildcard: true, hasTrailingWildcard: true, isCaseInsensitive: false }, driverType);
		}

		case EFilterOperation.CONTL: {
			return ApiControllerGetListQueryLike(String(value), { hasLeadingWildcard: true, hasTrailingWildcard: true, isCaseInsensitive: true }, driverType);
		}

		case EFilterOperation.ENDS: {
			return ApiControllerGetListQueryLike(String(value), { hasLeadingWildcard: true, hasTrailingWildcard: false, isCaseInsensitive: false }, driverType);
		}

		case EFilterOperation.ENDSL: {
			return ApiControllerGetListQueryLike(String(value), { hasLeadingWildcard: true, hasTrailingWildcard: false, isCaseInsensitive: true }, driverType);
		}

		case EFilterOperation.EQ: {
			return Equal(toComparisonOperand(value));
		}

		case EFilterOperation.EQL: {
			return ApiControllerGetListQueryLike(String(value), { hasLeadingWildcard: false, hasTrailingWildcard: false, isCaseInsensitive: true }, driverType);
		}

		case EFilterOperation.EXCL: {
			return Not(ApiControllerGetListQueryLike(String(value), { hasLeadingWildcard: true, hasTrailingWildcard: true, isCaseInsensitive: false }, driverType));
		}

		case EFilterOperation.EXCLL: {
			return Not(ApiControllerGetListQueryLike(String(value), { hasLeadingWildcard: true, hasTrailingWildcard: true, isCaseInsensitive: true }, driverType));
		}

		case EFilterOperation.GT: {
			return MoreThan(toComparisonOperand(value));
		}

		case EFilterOperation.GTE: {
			return MoreThanOrEqual(toComparisonOperand(value));
		}

		case EFilterOperation.IN: {
			return In(Array.isArray(value) ? value : [value]);
		}

		case EFilterOperation.INL: {
			return In((Array.isArray(value) ? value : [value]).map((item: unknown) => ApiControllerGetListQueryLike(String(item), { hasLeadingWildcard: false, hasTrailingWildcard: false, isCaseInsensitive: true }, driverType)));
		}

		case EFilterOperation.ISNULL: {
			return IsNull();
		}

		case EFilterOperation.LT: {
			return LessThan(toComparisonOperand(value));
		}

		case EFilterOperation.LTE: {
			return LessThanOrEqual(toComparisonOperand(value));
		}

		case EFilterOperation.NE: {
			return Not(toComparisonOperand(value));
		}

		case EFilterOperation.NEL: {
			return Not(ApiControllerGetListQueryLike(String(value), { hasLeadingWildcard: false, hasTrailingWildcard: false, isCaseInsensitive: true }, driverType));
		}

		case EFilterOperation.NOTIN: {
			return Not(In(Array.isArray(value) ? value : [value]));
		}

		case EFilterOperation.NOTINL: {
			return Not(In((Array.isArray(value) ? value : [value]).map((item: unknown) => ApiControllerGetListQueryLike(String(item), { hasLeadingWildcard: false, hasTrailingWildcard: false, isCaseInsensitive: true }, driverType))));
		}

		case EFilterOperation.NOTNULL: {
			return Not(IsNull());
		}

		case EFilterOperation.STARTS: {
			return ApiControllerGetListQueryLike(String(value), { hasLeadingWildcard: false, hasTrailingWildcard: true, isCaseInsensitive: false }, driverType);
		}

		case EFilterOperation.STARTSL: {
			return ApiControllerGetListQueryLike(String(value), { hasLeadingWildcard: false, hasTrailingWildcard: true, isCaseInsensitive: true }, driverType);
		}
	}
}

/**
 * Keeps a Date or boolean comparison operand as it is, so the read binds it for its column, and compares any other value as its text.
 * A boolean as text would compare `'true'` with the stored `1` on SQLite and match no row.
 * @param {unknown} value - Parsed filter value
 * @returns {unknown} The operand of the comparison
 */
function toComparisonOperand(value: unknown): unknown {
	return value instanceof Date || typeof value === "boolean" ? value : String(value);
}
