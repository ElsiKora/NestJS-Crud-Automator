/**
 * What the column an IAM `resource.*` key reads holds, as its TypeORM column type says. The query planner and the
 * in-memory evaluator decide from it which condition operators compare the column exactly.
 */
export enum EApiAuthorizationIamColumnFamily {
	// A list: a TypeORM `array: true` column, `simple-array`, or a MySQL `set`.
	ARRAY = "array",
	// Bytes, such as `bytea` or `blob`.
	BINARY = "binary",
	// A boolean, `bit` included.
	BOOLEAN = "boolean",
	// A date, a time, a date and time, or an interval.
	DATE = "date",
	// One value of a fixed list of text values.
	ENUM = "enum",
	// A JSON document, `simple-json` included.
	JSON = "json",
	// An integer, a decimal, or a floating-point number.
	NUMERIC = "numeric",
	// Any other type, such as a network address or a geometry.
	OTHER = "other",
	// Text.
	TEXT = "text",
	// A UUID.
	UUID = "uuid",
}
