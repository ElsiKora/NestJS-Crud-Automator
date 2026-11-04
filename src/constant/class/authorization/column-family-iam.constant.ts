import { Buffer } from "node:buffer";

import { EApiAuthorizationIamColumnFamily } from "@enum/class/authorization";

const INTEGER_BITS_8: number = 8;
const INTEGER_BITS_16: number = 16;
const INTEGER_BITS_24: number = 24;
const INTEGER_BITS_32: number = 32;
const INTEGER_BITS_64: number = 64;

/**
 * Column families of TypeORM column types, keyed by the lower-case type a decorator names or by the property type
 * TypeORM takes when it names none. A type not listed is `OTHER`.
 * Internal: the IAM query field reader is its only user.
 */
export const AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT: {
	readonly BOOLEAN_TYPES: ReadonlySet<string>;
	readonly DATE_TYPES: ReadonlySet<string>;
	readonly FIXED_LENGTH_TEXT_TYPES: ReadonlySet<string>;
	readonly INTEGER_BITS: ReadonlyMap<string, number>;
	readonly MONEY_TYPES: ReadonlySet<string>;
	readonly TYPES: ReadonlyMap<unknown, EApiAuthorizationIamColumnFamily>;
} = Object.freeze({
	// Types a Bool operator compares: `bit` and the integer forms read back as a number, which is no boolean in memory.
	BOOLEAN_TYPES: new Set<string>(["bool", "boolean"]),
	// Types a Date operator compares: a calendar date or an instant, not a time of day, an interval or a year.
	DATE_TYPES: new Set<string>(["date", "datetime", "timestamp", "timestamptz", "timestamp without time zone", "timestamp with time zone"]),
	// Fixed-length text, which PostgreSQL pads with spaces that its own equality ignores and the read value keeps.
	FIXED_LENGTH_TEXT_TYPES: new Set<string>(["bpchar", "char", "character", "national char", "national character", "nchar"]),
	// Bits of each signed integer type.
	INTEGER_BITS: new Map<string, number>([
		["bigint", INTEGER_BITS_64],
		["int", INTEGER_BITS_32],
		["int2", INTEGER_BITS_16],
		["int4", INTEGER_BITS_32],
		["int64", INTEGER_BITS_64],
		["int8", INTEGER_BITS_64],
		["integer", INTEGER_BITS_32],
		["mediumint", INTEGER_BITS_24],
		["smallint", INTEGER_BITS_16],
		["tinyint", INTEGER_BITS_8],
	]),
	// Money types, which read back as formatted text.
	MONEY_TYPES: new Set<string>(["money", "smallmoney"]),
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
		...["cidr", "inet"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.NETWORK]),
		...["bigint", "dec", "decimal", "double", "double precision", "fixed", "float", "float4", "float8", "float64", "int", "int2", "int4", "int8", "int64", "integer", "mediumint", "money", "number", "numeric", "real", "smalldecimal", "smallint", "smallmoney", "tinyint"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.NUMERIC]),
		[Number, EApiAuthorizationIamColumnFamily.NUMERIC],
		...["alphanum", "bpchar", "char", "character", "character varying", "citext", "clob", "long", "longtext", "mediumtext", "national char", "national character", "national varchar", "nchar", "nclob", "ntext", "nvarchar", "nvarchar2", "shorttext", "string", "text", "tinytext", "varchar", "varchar2"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.TEXT]),
		[String, EApiAuthorizationIamColumnFamily.TEXT],
		...["uniqueidentifier", "uuid"].map((type: string): [string, EApiAuthorizationIamColumnFamily] => [type, EApiAuthorizationIamColumnFamily.UUID]),
	]),
});
