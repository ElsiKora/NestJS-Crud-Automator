import type { EFilterOperation } from "@enum/filter";
import type { TNonEmptyReadonlyArray } from "@type/utility";

import type { TApiControllerGetListQueryFilterValue } from "./value.type";

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
				values: readonly [TApiControllerGetListQueryFilterValue<TValue>, TApiControllerGetListQueryFilterValue<TValue>];
			}
		: TOperation extends `${EFilterOperation.IN | EFilterOperation.INL | EFilterOperation.NOTIN | EFilterOperation.NOTINL}`
			? {
					operator: TOperation;
					value?: never;
					values: TNonEmptyReadonlyArray<TApiControllerGetListQueryFilterValue<TValue>>;
				}
			: {
					operator: TOperation;
					value: TApiControllerGetListQueryFilterValue<TValue>;
					values?: never;
				};
