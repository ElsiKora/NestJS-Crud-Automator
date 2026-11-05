import { EApiPropertyDescribeType } from "@enum/decorator/api";
import { ApiControllerParametersReadKeyDescribeTypes } from "@utility/api/controller/parameters/column/key-type.utility";
import { describe, expect, it } from "vitest";

describe("the described types that give a path value one spelling", () => {
	it.each(["varchar", "text", "citext", "char", "CHARACTER VARYING", String, "bigint", "int", "integer", "smallint", "tinyint", Number])("lets any described type hold a %s column", (type: unknown) => {
		expect(ApiControllerParametersReadKeyDescribeTypes(type)).toBeUndefined();
	});

	it.each([
		["uuid", EApiPropertyDescribeType.UUID],
		["uniqueidentifier", EApiPropertyDescribeType.UUID],
		["enum", EApiPropertyDescribeType.ENUM],
		["simple-enum", EApiPropertyDescribeType.ENUM],
		["boolean", EApiPropertyDescribeType.BOOLEAN],
		["bool", EApiPropertyDescribeType.BOOLEAN],
		[Boolean, EApiPropertyDescribeType.BOOLEAN],
		["date", EApiPropertyDescribeType.DATE],
		["datetime", EApiPropertyDescribeType.DATE],
		["timestamp", EApiPropertyDescribeType.DATE],
		["timestamptz", EApiPropertyDescribeType.DATE],
		["timestamp with time zone", EApiPropertyDescribeType.DATE],
		[Date, EApiPropertyDescribeType.DATE],
	])("lets only its own described type hold a %s column", (type: unknown, ownType: EApiPropertyDescribeType) => {
		expect(ApiControllerParametersReadKeyDescribeTypes(type)).toEqual(new Set([ownType]));
	});

	it("lets a date or a number hold a column that names no type, such as a createDate or version column", () => {
		expect(ApiControllerParametersReadKeyDescribeTypes(undefined)).toEqual(new Set([EApiPropertyDescribeType.DATE, EApiPropertyDescribeType.NUMBER]));
	});

	it.each(["decimal", "numeric", "float", "double", "double precision", "real", "money", "time", "timetz", "time with time zone", "year", "interval", "inet", "cidr", "macaddr", "set", "simple-array", "json", "jsonb", "bytea", "bit", "point", Buffer, Array, Object])("lets no described type hold a %s column", (type: unknown) => {
		expect(ApiControllerParametersReadKeyDescribeTypes(type)).toEqual(new Set());
	});
});
