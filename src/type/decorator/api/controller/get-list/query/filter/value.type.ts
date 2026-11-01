/**
 * Value a typed GET_LIST filter condition may hold for a field.
 * A `Date` property may map to a `date` or `time` column, whose values are calendar or time-of-day text, so it also takes a string; bootstrap checks the value against the field's `@ApiPropertyDescribe` format.
 */
export type TApiControllerGetListQueryFilterValue<V> = [NonNullable<V>] extends [Date] ? NonNullable<V> | string : NonNullable<V>;
