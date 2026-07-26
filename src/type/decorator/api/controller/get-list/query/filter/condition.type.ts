import type { EFilterOperation } from "@enum/filter";
import type { TNonEmptyReadonlyArray } from "@type/utility";

export type TApiControllerGetListQueryFilterCondition<TValue, TOperation extends `${EFilterOperation}`> = TOperation extends `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}`
	? {
			operator: TOperation;
			value?: never;
			values?: never;
		}
	: TOperation extends `${EFilterOperation.BETWEEN}`
		? {
				operator: TOperation;
				value?: never;
				values: readonly [NonNullable<TValue>, NonNullable<TValue>];
			}
		: TOperation extends `${EFilterOperation.IN | EFilterOperation.INL | EFilterOperation.NOTIN | EFilterOperation.NOTINL}`
			? {
					operator: TOperation;
					value?: never;
					values: TNonEmptyReadonlyArray<NonNullable<TValue>>;
				}
			: {
					operator: TOperation;
					value: NonNullable<TValue>;
					values?: never;
				};
