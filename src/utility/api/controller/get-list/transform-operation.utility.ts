import type { FindOperator } from "typeorm/find-options/FindOperator";

import { Between, Equal, ILike, In, IsNull, LessThan, LessThanOrEqual, Like, MoreThan, MoreThanOrEqual, Not } from "typeorm/index";

import { EFilterOperation } from "../../../../enum/filter-operation.enum";

/**
 * Converts filter operation enum values to TypeORM query operators.
 * Supports various operations like BETWEEN, CONTAINS, EQUALS, GREATER_THAN, etc.
 * @param {EFilterOperation} operation - The filter operation type from the enum
 * @param {any} value - The value to filter by
 * @returns {FindOperator<any>} The TypeORM FindOperator for the specified operation and value
 */
// eslint-disable-next-line @elsikora/typescript/explicit-module-boundary-types
export function ApiControllerGetListTransformOperation(operation: EFilterOperation, value: any): FindOperator<any> {
	switch (operation) {
		case EFilterOperation.BETWEEN: {
			// eslint-disable-next-line @elsikora/typescript/no-unsafe-assignment
			const [start, end]: any = Array.isArray(value) ? value : [null, null];

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
			return Equal(String(value));
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
			return MoreThan(String(value));
		}

		case EFilterOperation.GTE: {
			return MoreThanOrEqual(String(value));
		}

		case EFilterOperation.IN: {
			return In(Array.isArray(value) ? value : [value]);
		}

		case EFilterOperation.INL: {
			return In(Array.isArray(value) ? value.map((v: any) => ILike(v)) : [ILike(value)]);
		}

		case EFilterOperation.ISNULL: {
			return IsNull();
		}

		case EFilterOperation.LT: {
			return LessThan(String(value));
		}

		case EFilterOperation.LTE: {
			return LessThanOrEqual(String(value));
		}

		case EFilterOperation.NE: {
			return Not(String(value));
		}

		case EFilterOperation.NEL: {
			return Not(ILike(String(value)));
		}

		case EFilterOperation.NOTIN: {
			return Not(In(Array.isArray(value) ? value : [value]));
		}

		case EFilterOperation.NOTINL: {
			return Not(In(Array.isArray(value) ? value.map((v: any) => ILike(v)) : [ILike(value)]));
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
