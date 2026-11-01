import type { EFilterOperation, EFilterOperationBoolean, EFilterOperationDate, EFilterOperationEnum, EFilterOperationNumber, EFilterOperationString, EFilterOperationUuid } from "@enum/filter";

/**
 * Operations a typed GET_LIST filter field may list, from what its TypeScript value can carry.
 * A string can hold any described kind stored as text (string, UUID, enum, a `date`/`time` column, a decimal or bigint number), so it offers every one of their operations; bootstrap then checks the exact set against the field's `@ApiPropertyDescribe` kind.
 */
export type TApiControllerGetListQueryFilterOperationForValue<V> =
	| ([NonNullable<V>] extends [boolean]
			? Exclude<`${EFilterOperationBoolean}`, `${EFilterOperation.EXCL | EFilterOperation.ISNULL | EFilterOperation.NOTNULL}`>
			: [NonNullable<V>] extends [Date]
				? Exclude<`${EFilterOperationDate}`, `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}`>
				: [NonNullable<V>] extends [number]
					? Exclude<`${EFilterOperationNumber}`, `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}`>
					: [NonNullable<V>] extends [string]
						? Exclude<`${EFilterOperationDate | EFilterOperationEnum | EFilterOperationNumber | EFilterOperationString | EFilterOperationUuid}`, `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}`>
						: never)
	| (null extends V ? `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}` : undefined extends V ? `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}` : never);
