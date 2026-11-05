import type { IApiControllerGetListQueryOperator } from "@interface/class/api/controller/get-list/query";
import type { FindOperator } from "typeorm";

import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { EFilterOperand, EFilterOperation } from "@enum/filter";
import { ApiControllerGetListQueryLike } from "@utility/api/controller/get-list/query/like.utility";
import { Between, Equal, In, IsNull, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, Not, Or } from "typeorm";

// A case-insensitive comparison of the whole text, as `eql`, `nel`, `inl` and `notinl` make.
const EXACT_CASE_INSENSITIVE: Readonly<{ hasLeadingWildcard: boolean; hasTrailingWildcard: boolean; isCaseInsensitive: boolean }> = Object.freeze({ hasLeadingWildcard: false, hasTrailingWildcard: false, isCaseInsensitive: true });
const COMPARABLE_KINDS: ReadonlyArray<EApiPropertyDescribeType> = Object.freeze([EApiPropertyDescribeType.DATE, EApiPropertyDescribeType.NUMBER]);
const MEMBERSHIP_KINDS: ReadonlyArray<EApiPropertyDescribeType> = Object.freeze([EApiPropertyDescribeType.BOOLEAN, EApiPropertyDescribeType.ENUM, EApiPropertyDescribeType.NUMBER, EApiPropertyDescribeType.STRING, EApiPropertyDescribeType.UUID]);
const NO_KINDS: ReadonlyArray<EApiPropertyDescribeType> = Object.freeze([]);
const PAIR_OPERAND_COUNT: number = 2;
const SCALAR_KINDS: ReadonlyArray<EApiPropertyDescribeType> = Object.freeze([EApiPropertyDescribeType.BOOLEAN, EApiPropertyDescribeType.DATE, EApiPropertyDescribeType.ENUM, EApiPropertyDescribeType.NUMBER, EApiPropertyDescribeType.STRING, EApiPropertyDescribeType.UUID]);
const STRING_KINDS: ReadonlyArray<EApiPropertyDescribeType> = Object.freeze([EApiPropertyDescribeType.STRING]);
const VALUES_MINIMUM_OPERAND_COUNT: number = 1;

const OPERATOR_REGISTRY: Readonly<Record<EFilterOperation, IApiControllerGetListQueryOperator>> = Object.freeze({
	[EFilterOperation.BETWEEN]: Object.freeze({
		compile: (operand?: unknown): FindOperator<unknown> => {
			const values: ReadonlyArray<unknown> = operand as ReadonlyArray<unknown>;

			return Between(values[0], values[1]);
		},
		kinds: COMPARABLE_KINDS,
		operand: EFilterOperand.PAIR,
	}),
	[EFilterOperation.CONT]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => ApiControllerGetListQueryLike(operand as string, { hasLeadingWildcard: true, hasTrailingWildcard: true, isCaseInsensitive: false }, driverType),
		kinds: STRING_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.CONTL]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => ApiControllerGetListQueryLike(operand as string, { hasLeadingWildcard: true, hasTrailingWildcard: true, isCaseInsensitive: true }, driverType),
		kinds: STRING_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.ENDS]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => ApiControllerGetListQueryLike(operand as string, { hasLeadingWildcard: true, hasTrailingWildcard: false, isCaseInsensitive: false }, driverType),
		kinds: STRING_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.ENDSL]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => ApiControllerGetListQueryLike(operand as string, { hasLeadingWildcard: true, hasTrailingWildcard: false, isCaseInsensitive: true }, driverType),
		kinds: STRING_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.EQ]: Object.freeze({
		compile: (operand?: unknown): FindOperator<unknown> => Equal(operand),
		kinds: SCALAR_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.EQL]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => ApiControllerGetListQueryLike(operand as string, EXACT_CASE_INSENSITIVE, driverType),
		kinds: STRING_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.EXCL]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => Not(ApiControllerGetListQueryLike(operand as string, { hasLeadingWildcard: true, hasTrailingWildcard: true, isCaseInsensitive: false }, driverType)),
		kinds: NO_KINDS,
		operand: EFilterOperand.VALUES,
	}),
	[EFilterOperation.EXCLL]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => Not(ApiControllerGetListQueryLike(operand as string, { hasLeadingWildcard: true, hasTrailingWildcard: true, isCaseInsensitive: true }, driverType)),
		kinds: NO_KINDS,
		operand: EFilterOperand.VALUES,
	}),
	[EFilterOperation.GT]: Object.freeze({
		compile: (operand?: unknown): FindOperator<unknown> => MoreThan(operand),
		kinds: COMPARABLE_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.GTE]: Object.freeze({
		compile: (operand?: unknown): FindOperator<unknown> => MoreThanOrEqual(operand),
		kinds: COMPARABLE_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.IN]: Object.freeze({
		compile: (operand?: unknown): FindOperator<unknown> => In(operand as ReadonlyArray<unknown>),
		kinds: MEMBERSHIP_KINDS,
		operand: EFilterOperand.VALUES,
	}),
	[EFilterOperation.INL]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => Or(...(operand as ReadonlyArray<unknown>).map((value: unknown): FindOperator<string> => ApiControllerGetListQueryLike(value as string, EXACT_CASE_INSENSITIVE, driverType))),
		kinds: STRING_KINDS,
		operand: EFilterOperand.VALUES,
	}),
	[EFilterOperation.ISNULL]: Object.freeze({
		compile: (): FindOperator<unknown> => IsNull(),
		kinds: SCALAR_KINDS,
		operand: EFilterOperand.NONE,
	}),
	[EFilterOperation.LT]: Object.freeze({
		compile: (operand?: unknown): FindOperator<unknown> => LessThan(operand),
		kinds: COMPARABLE_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.LTE]: Object.freeze({
		compile: (operand?: unknown): FindOperator<unknown> => LessThanOrEqual(operand),
		kinds: COMPARABLE_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.NE]: Object.freeze({
		compile: (operand?: unknown): FindOperator<unknown> => Not(operand),
		kinds: SCALAR_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.NEL]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => Not(ApiControllerGetListQueryLike(operand as string, EXACT_CASE_INSENSITIVE, driverType)),
		kinds: STRING_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.NOTIN]: Object.freeze({
		compile: (operand?: unknown): FindOperator<unknown> => Not(In(operand as ReadonlyArray<unknown>)),
		kinds: MEMBERSHIP_KINDS,
		operand: EFilterOperand.VALUES,
	}),
	[EFilterOperation.NOTINL]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => Not(Or(...(operand as ReadonlyArray<unknown>).map((value: unknown): FindOperator<string> => ApiControllerGetListQueryLike(value as string, EXACT_CASE_INSENSITIVE, driverType)))),
		kinds: STRING_KINDS,
		operand: EFilterOperand.VALUES,
	}),
	[EFilterOperation.NOTNULL]: Object.freeze({
		compile: (): FindOperator<unknown> => Not(IsNull()),
		kinds: SCALAR_KINDS,
		operand: EFilterOperand.NONE,
	}),
	[EFilterOperation.STARTS]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => ApiControllerGetListQueryLike(operand as string, { hasLeadingWildcard: false, hasTrailingWildcard: true, isCaseInsensitive: false }, driverType),
		kinds: STRING_KINDS,
		operand: EFilterOperand.VALUE,
	}),
	[EFilterOperation.STARTSL]: Object.freeze({
		compile: (operand?: unknown, driverType?: string): FindOperator<unknown> => ApiControllerGetListQueryLike(operand as string, { hasLeadingWildcard: false, hasTrailingWildcard: true, isCaseInsensitive: true }, driverType),
		kinds: STRING_KINDS,
		operand: EFilterOperand.VALUE,
	}),
});

export const FILTER_OPERATOR_REGISTRY_CONSTANT: Readonly<{
	readonly OPERATORS: typeof OPERATOR_REGISTRY;
	readonly PAIR_OPERAND_COUNT: number;
	readonly VALUES_MINIMUM_OPERAND_COUNT: number;
}> = Object.freeze({
	OPERATORS: OPERATOR_REGISTRY,
	PAIR_OPERAND_COUNT,
	VALUES_MINIMUM_OPERAND_COUNT,
});
