import type { FindOperator } from "typeorm";

import { EFilterOperation } from "@enum/filter";
import { Between, Equal, ILike, In, IsNull, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not } from "typeorm";

/**
 * Converts filter operation enum values to TypeORM query operators.
 * Supports various operations like BETWEEN, CONTAINS, EQUALS, GREATER_THAN, etc.
 * @param {EFilterOperation} operation - The filter operation type from the enum
 * @param {unknown} value - The value to filter by
 * @returns {FindOperator<unknown>} The TypeORM FindOperator for the specified operation and value
 */
export function ApiControllerGetListTransformOperation(operation: EFilterOperation, value: unknown): FindOperator<unknown> {
	switch (operation) {
		case EFilterOperation.BETWEEN: {
			// eslint-disable-next-line @elsikora/typescript/no-unsafe-assignment
			const [start, end]: Array<unknown> = Array.isArray(value) ? value : [null, null];

			return Between(start, end);
		}

		case EFilterOperation.CONT: {
			return Like(`%${String(value)}%`);
		}

		case EFilterOperation.CONTL: {
			return ILike(`%${String(value)}%`);
		}

		case EFilterOperation.ENDS: {
			return Like(`%${String(value)}`);
		}

		case EFilterOperation.ENDSL: {
			return ILike(`%${String(value)}`);
		}

		case EFilterOperation.EQ: {
			return Equal(toComparisonOperand(value));
		}

		case EFilterOperation.EQL: {
			return ILike(String(value));
		}

		case EFilterOperation.EXCL: {
			return Not(Like(`%${String(value)}%`));
		}

		case EFilterOperation.EXCLL: {
			return Not(ILike(`%${String(value)}%`));
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
			return In(Array.isArray(value) ? value.map((v: unknown) => ILike(v)) : [ILike(value)]);
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
			return Not(ILike(String(value)));
		}

		case EFilterOperation.NOTIN: {
			return Not(In(Array.isArray(value) ? value : [value]));
		}

		case EFilterOperation.NOTINL: {
			return Not(In(Array.isArray(value) ? value.map((v: unknown) => ILike(v)) : [ILike(value)]));
		}

		case EFilterOperation.NOTNULL: {
			return Not(IsNull());
		}

		case EFilterOperation.STARTS: {
			return Like(`${String(value)}%`);
		}

		case EFilterOperation.STARTSL: {
			return ILike(`${String(value)}%`);
		}
	}
}

/**
 * Keeps a Date comparison operand as the instant it names, so the read binds it for its column, and compares any other value as its text.
 * @param {unknown} value - Parsed filter value
 * @returns {unknown} The operand of the comparison
 */
function toComparisonOperand(value: unknown): unknown {
	return value instanceof Date ? value : String(value);
}
