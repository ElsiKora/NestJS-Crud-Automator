import { ApiControllerParametersIsDecimalColumn, ApiControllerParametersIsIntegerColumn } from "@utility/api/controller/parameters/column/numeric-type.utility";
import { describe, expect, it } from "vitest";

describe("the numeric column types", () => {
	it.each(["bigint", "int", "int2", "int4", "int8", "int64", "integer", "INT", "long", "mediumint", "smallint", "tinyint", "unsigned big int", Number])("reads %s as an integer column", (type: unknown) => {
		expect(ApiControllerParametersIsIntegerColumn(type)).toBe(true);
		expect(ApiControllerParametersIsDecimalColumn(type)).toBe(false);
	});

	it.each(["dec", "decimal", "double", "double precision", "fixed", "float", "float4", "float8", "float64", "money", "NUMERIC", "number", "numeric", "real", "smalldecimal", "smallmoney"])("reads %s as a decimal column", (type: unknown) => {
		expect(ApiControllerParametersIsDecimalColumn(type)).toBe(true);
		expect(ApiControllerParametersIsIntegerColumn(type)).toBe(false);
	});

	it.each(["varchar", "uuid", "boolean", "many-to-one", String, Date, undefined])("reads %s as neither", (type: unknown) => {
		expect(ApiControllerParametersIsIntegerColumn(type)).toBe(false);
		expect(ApiControllerParametersIsDecimalColumn(type)).toBe(false);
	});
});
