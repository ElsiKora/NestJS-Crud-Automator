import type { EFilterOperation, EFilterOperationBoolean, EFilterOperationDate, EFilterOperationEnum, EFilterOperationNumber, EFilterOperationString, EFilterOperationUuid } from "@enum/filter";

export type TApiControllerGetListQueryFilterOperationForValue<V> =
	| ([NonNullable<V>] extends [boolean]
			? Exclude<`${EFilterOperationBoolean}`, `${EFilterOperation.EXCL | EFilterOperation.ISNULL | EFilterOperation.NOTNULL}`>
			: [NonNullable<V>] extends [Date]
				? Exclude<`${EFilterOperationDate}`, `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}`>
				: [NonNullable<V>] extends [number]
					? Exclude<`${EFilterOperationNumber}`, `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}`>
					: [NonNullable<V>] extends [string]
						? Exclude<`${EFilterOperationEnum | EFilterOperationString | EFilterOperationUuid}`, `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}`>
						: never)
	| (null extends V ? `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}` : undefined extends V ? `${EFilterOperation.ISNULL | EFilterOperation.NOTNULL}` : never);
