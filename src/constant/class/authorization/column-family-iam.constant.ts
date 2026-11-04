import { Buffer } from "node:buffer";

import { EApiAuthorizationIamColumnFamily } from "@enum/class/authorization";

/**
 * Column families of TypeORM column types, keyed by the lower-case type a decorator names or by the property type
 * TypeORM takes when it names none. A type not listed is `OTHER`.
 * Internal: the IAM query field reader is its only user.
 */
export const AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT: {
	readonly FIXED_LENGTH_TEXT_TYPES: ReadonlySet<string>;
	readonly TYPES: ReadonlyMap<unknown, EApiAuthorizationIamColumnFamily>;
} = Object.freeze({
	// Fixed-length text, which PostgreSQL pads with spaces that its own equality ignores and the read value keeps.
	FIXED_LENGTH_TEXT_TYPES: new Set<string>(["bpchar", "char", "character", "national char", "national character", "nchar"]),
	TYPES: new Map<unknown, EApiAuthorizationIamColumnFamily>([
		...["simple-array", "set"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.ARRAY]),
		[Array, EApiAuthorizationIamColumnFamily.ARRAY],
		...["binary", "blob", "bytea", "image", "long raw", "longblob", "mediumblob", "raw", "tinyblob", "varbinary"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.BINARY]),
		[Buffer, EApiAuthorizationIamColumnFamily.BINARY],
		...["bit", "bool", "boolean"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.BOOLEAN]),
		[Boolean, EApiAuthorizationIamColumnFamily.BOOLEAN],
		...["date", "datetime", "datetime2", "datetimeoffset", "interval", "smalldatetime", "time", "time with time zone", "time without time zone", "timestamp", "timestamp with local time zone", "timestamp with time zone", "timestamp without time zone", "timestamptz", "timetz", "year"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.DATE]),
		[Date, EApiAuthorizationIamColumnFamily.DATE],
		...["enum", "simple-enum"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.ENUM]),
		...["json", "jsonb", "simple-json"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.JSON]),
		...["bigint", "dec", "decimal", "double", "double precision", "fixed", "float", "float4", "float8", "float64", "int", "int2", "int4", "int8", "int64", "integer", "mediumint", "money", "number", "numeric", "real", "smalldecimal", "smallint", "smallmoney", "tinyint"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.NUMERIC]),
		[Number, EApiAuthorizationIamColumnFamily.NUMERIC],
		...["alphanum", "bpchar", "char", "character", "character varying", "citext", "clob", "long", "longtext", "mediumtext", "national char", "national character", "national varchar", "nchar", "nclob", "ntext", "nvarchar", "nvarchar2", "shorttext", "string", "text", "tinytext", "varchar", "varchar2"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.TEXT]),
		[String, EApiAuthorizationIamColumnFamily.TEXT],
		...["uniqueidentifier", "uuid"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.UUID]),
	]),
});
