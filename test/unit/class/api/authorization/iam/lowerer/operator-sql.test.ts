import type { IApiAuthorizationIamColumn, IApiAuthorizationIamDialect, IApiAuthorizationIamPredicateColumn, IApiAuthorizationIamToken } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate } from "@type/class/api/authorization/iam";
import type { DataSource } from "typeorm";

import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamDialect, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind, EApiAuthorizationIamPredicateOperator, EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { createIamLowererColumn, createIamLowererDataSource, renderIamLowererWhere } from "@test/unit/class/api/authorization/iam/fixture/lowerer";
import { beforeAll, describe, expect, it } from "vitest";

const POSTGRES: IApiAuthorizationIamDialect = { driverType: "postgres", type: EApiAuthorizationIamDialect.POSTGRES };
const COCKROACH: IApiAuthorizationIamDialect = { driverType: "cockroachdb", type: EApiAuthorizationIamDialect.POSTGRES };
const MYSQL: IApiAuthorizationIamDialect = { binaryCollation: "utf8mb4_0900_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "8.4.2" };
const MARIADB: IApiAuthorizationIamDialect = { binaryCollation: "utf8mb4_nopad_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MARIADB, version: "11.4.2-MariaDB" };
const SQLITE: IApiAuthorizationIamDialect = { driverType: "better-sqlite3", type: EApiAuthorizationIamDialect.SQLITE };
const PORTABLE: IApiAuthorizationIamDialect = { type: EApiAuthorizationIamDialect.PORTABLE };

const { EQUAL, GREATER_THAN, GREATER_THAN_EQUAL, LESS_THAN, LESS_THAN_EQUAL, NOT_EQUAL }: typeof EApiAuthorizationIamPredicateOperator = EApiAuthorizationIamPredicateOperator;

const numericColumn = (type: string): IApiAuthorizationIamPredicateColumn => createIamLowererColumn("rank", { family: EApiAuthorizationIamColumnFamily.NUMERIC, type });
const dateColumn = (column: Partial<IApiAuthorizationIamColumn>): IApiAuthorizationIamPredicateColumn => createIamLowererColumn("code", { family: EApiAuthorizationIamColumnFamily.DATE, ...column });

const numeric = (type: string, operator: EApiAuthorizationIamPredicateOperator, value: string): TApiAuthorizationIamPredicate => ({ column: numericColumn(type), comparison: EApiAuthorizationIamPredicateComparison.NUMERIC, kind: EApiAuthorizationIamPredicateKind.COMPARE, operator, value });
const date = (column: Partial<IApiAuthorizationIamColumn>, operator: EApiAuthorizationIamPredicateOperator, value: string): TApiAuthorizationIamPredicate => ({ column: dateColumn(column), comparison: EApiAuthorizationIamPredicateComparison.DATE, kind: EApiAuthorizationIamPredicateKind.COMPARE, operator, value });
const ignoreCase = (column: Partial<IApiAuthorizationIamColumn>, value: string, isNegated: boolean = false): TApiAuthorizationIamPredicate => ({ column: createIamLowererColumn("name", column), comparison: EApiAuthorizationIamPredicateComparison.TEXT_IGNORE_CASE, isNegated, kind: EApiAuthorizationIamPredicateKind.IN, values: [value] });
const glob = (pattern: Array<IApiAuthorizationIamToken>, isNegated: boolean = false): TApiAuthorizationIamPredicate => ({ column: createIamLowererColumn("name"), isConditionKey: true, isNegated, kind: EApiAuthorizationIamPredicateKind.LIKE, pattern });
const arn = (pattern: Array<IApiAuthorizationIamToken>, column: Partial<IApiAuthorizationIamColumn> = {}, isNegated: boolean = false): TApiAuthorizationIamPredicate => ({ column: createIamLowererColumn("name", column), isNegated, kind: EApiAuthorizationIamPredicateKind.ARN, pattern });
const ip = (range: string, isNegated: boolean = false): TApiAuthorizationIamPredicate => ({ column: createIamLowererColumn("code", { family: EApiAuthorizationIamColumnFamily.NETWORK, type: "inet" }), isNegated, kind: EApiAuthorizationIamPredicateKind.IP_CONTAINED, range });

const INSTANT: string = "2024-01-15T10:00:00.000Z";
const MILLISECOND_INSTANT: string = "2024-01-15T10:00:00.123Z";

const literal = (value: string): IApiAuthorizationIamToken => ({ type: EApiAuthorizationIamTokenType.LITERAL, value });
const STAR: IApiAuthorizationIamToken = { type: EApiAuthorizationIamTokenType.STAR };
const QUESTION_MARK: IApiAuthorizationIamToken = { type: EApiAuthorizationIamTokenType.QUESTION_MARK };

// `arn:a.b+c:*:?x`: punctuation that must stay literal, and a wildcard in two segments.
const ARN_PATTERN: Array<IApiAuthorizationIamToken> = [literal("arn:a.b+c:"), STAR, literal(":"), QUESTION_MARK, literal("x")];

describe("IAM operator lowering to SQL", () => {
	let postgres: DataSource;
	let mysql: DataSource;
	let sqlite: DataSource;

	beforeAll(async () => {
		[postgres, mysql, sqlite] = await Promise.all([createIamLowererDataSource("postgres"), createIamLowererDataSource("mysql"), createIamLowererDataSource("better-sqlite3")]);
	});

	describe("PostgreSQL", () => {
		const render = (predicate: TApiAuthorizationIamPredicate): unknown => renderIamLowererWhere(postgres, POSTGRES, predicate) ?? "fails closed";

		it("compares integers with a text parameter, rewriting a fraction and folding what the type cannot hold", () => {
			expect({
				"bigint past 2^53": render(numeric("bigint", EQUAL, "9223372036854775807")),
				"bigint past its range": render(numeric("bigint", GREATER_THAN, "9223372036854775808")),
				"int <= 1.5": render(numeric("int", LESS_THAN_EQUAL, "1.5")),
				"int < -1.5": render(numeric("int", LESS_THAN, "-1.5")),
				"int <> 1.5": render(numeric("int", NOT_EQUAL, "1.5")),
				"int = 1.5": render(numeric("int", EQUAL, "1.5")),
				"smallint past its range": render(numeric("smallint", LESS_THAN, "40000")),
			}).toMatchInlineSnapshot(`
				{
				  "bigint past 2^53": {
				    "parameters": [
				      "9223372036854775807",
				    ],
				    "where": "(((("IamLowererItemEntity"."rank" = $1))))",
				  },
				  "bigint past its range": {
				    "parameters": [],
				    "where": "((((0=1))))",
				  },
				  "int < -1.5": {
				    "parameters": [
				      "-1",
				    ],
				    "where": "(((("IamLowererItemEntity"."rank" < $1))))",
				  },
				  "int <= 1.5": {
				    "parameters": [
				      "1",
				    ],
				    "where": "(((("IamLowererItemEntity"."rank" <= $1))))",
				  },
				  "int <> 1.5": {
				    "parameters": [],
				    "where": "((((NOT("IamLowererItemEntity"."rank" IS NULL)))))",
				  },
				  "int = 1.5": {
				    "parameters": [],
				    "where": "((((0=1))))",
				  },
				  "smallint past its range": {
				    "parameters": [],
				    "where": "((((NOT("IamLowererItemEntity"."rank" IS NULL)))))",
				  },
				}
			`);
		});

		it("compares a numeric with a text parameter, and a float only within its digits", () => {
			expect({
				"double 15 digits": render(numeric("double precision", LESS_THAN, "1.23456789012345")),
				"double 16 digits": render(numeric("double precision", LESS_THAN, "1.234567890123456")),
				float: render(numeric("float", LESS_THAN, "1")),
				money: render(numeric("money", LESS_THAN, "1")),
				"numeric many digits": render(numeric("numeric", GREATER_THAN_EQUAL, "12345678901234567890.123456789")),
				"real 6 digits": render(numeric("real", LESS_THAN, "1.23456")),
				"real 7 digits": render(numeric("real", LESS_THAN, "1.234567")),
			}).toMatchInlineSnapshot(`
				{
				  "double 15 digits": {
				    "parameters": [
				      "1.23456789012345",
				    ],
				    "where": "(((("IamLowererItemEntity"."rank" < $1))))",
				  },
				  "double 16 digits": "fails closed",
				  "float": "fails closed",
				  "money": "fails closed",
				  "numeric many digits": {
				    "parameters": [
				      "12345678901234567890.123456789",
				    ],
				    "where": "(((("IamLowererItemEntity"."rank" >= $1))))",
				  },
				  "real 6 digits": {
				    "parameters": [
				      "1.23456",
				    ],
				    "where": "(((("IamLowererItemEntity"."rank" < $1))))",
				  },
				  "real 7 digits": "fails closed",
				}
			`);
		});

		it("compares instants as UTC text or a bound Date, flooring a column finer than milliseconds", () => {
			expect({
				"date with a calendar literal": render(date({ type: "date" }, LESS_THAN, "2024-01-15")),
				"date with an instant": render(date({ type: "date" }, LESS_THAN, INSTANT)),
				"timestamp(3)": render(date({ precision: 3, type: "timestamp" }, GREATER_THAN, INSTANT)),
				"timestamptz <": render(date({ type: "timestamptz" }, LESS_THAN, INSTANT)),
				"timestamptz <=": render(date({ type: "timestamptz" }, LESS_THAN_EQUAL, INSTANT)),
				"timestamptz <>": render(date({ type: "timestamptz" }, NOT_EQUAL, INSTANT)),
				"timestamptz =": render(date({ type: "timestamptz" }, EQUAL, INSTANT)),
				"timestamptz >": render(date({ type: "timestamptz" }, GREATER_THAN, INSTANT)),
				"timestamptz >=": render(date({ type: "timestamptz" }, GREATER_THAN_EQUAL, INSTANT)),
				"timestamptz past year 9999": render(date({ type: "timestamptz" }, GREATER_THAN, "9999-12-31T23:59:59.999Z")),
				"timestamptz with a calendar literal": render(date({ type: "timestamptz" }, LESS_THAN, "2024-01-15")),
			}).toMatchInlineSnapshot(`
				{
				  "date with a calendar literal": {
				    "parameters": [
				      "2024-01-15",
				    ],
				    "where": "(((("IamLowererItemEntity"."code" < $1))))",
				  },
				  "date with an instant": "fails closed",
				  "timestamp(3)": {
				    "parameters": [
				      2024-01-15T10:00:00.000Z,
				    ],
				    "where": "(((("IamLowererItemEntity"."code" > $1))))",
				  },
				  "timestamptz <": {
				    "parameters": [
				      "2024-01-15T10:00:00.000Z",
				    ],
				    "where": "(((("IamLowererItemEntity"."code" < $1))))",
				  },
				  "timestamptz <=": {
				    "parameters": [
				      "2024-01-15T10:00:00.001Z",
				    ],
				    "where": "(((("IamLowererItemEntity"."code" < $1))))",
				  },
				  "timestamptz <>": {
				    "parameters": [
				      "2024-01-15T10:00:00.000Z",
				      "2024-01-15T10:00:00.001Z",
				    ],
				    "where": "((((("IamLowererItemEntity"."code" < $1 OR "IamLowererItemEntity"."code" >= $2)))))",
				  },
				  "timestamptz =": {
				    "parameters": [
				      "2024-01-15T10:00:00.000Z",
				      "2024-01-15T10:00:00.001Z",
				    ],
				    "where": "((((("IamLowererItemEntity"."code" >= $1 AND "IamLowererItemEntity"."code" < $2)))))",
				  },
				  "timestamptz >": {
				    "parameters": [
				      "2024-01-15T10:00:00.001Z",
				    ],
				    "where": "(((("IamLowererItemEntity"."code" >= $1))))",
				  },
				  "timestamptz >=": {
				    "parameters": [
				      "2024-01-15T10:00:00.000Z",
				    ],
				    "where": "(((("IamLowererItemEntity"."code" >= $1))))",
				  },
				  "timestamptz past year 9999": "fails closed",
				  "timestamptz with a calendar literal": "fails closed",
				}
			`);
		});

		it("folds only A-Z under the C collation, reads citext as text, and fails closed on fixed-length text", () => {
			expect({
				char: render(ignoreCase({ type: "char" }, "ann")),
				citext: render(ignoreCase({ type: "citext" }, "ann")),
				negated: render(ignoreCase({}, "ann", true)),
				varchar: render(ignoreCase({}, "ann")),
			}).toMatchInlineSnapshot(`
				{
				  "char": "fails closed",
				  "citext": {
				    "parameters": [
				      "ann",
				    ],
				    "where": "((((lower(CAST("IamLowererItemEntity"."name" AS text) COLLATE "C") = $1))))",
				  },
				  "negated": {
				    "parameters": [
				      "ann",
				    ],
				    "where": "((((lower("IamLowererItemEntity"."name" COLLATE "C") <> $1))))",
				  },
				  "varchar": {
				    "parameters": [
				      "ann",
				    ],
				    "where": "((((lower("IamLowererItemEntity"."name" COLLATE "C") = $1))))",
				  },
				}
			`);
		});

		it("matches a condition glob with LIKE, positive or negated", () => {
			expect({ negated: render(glob([literal("a%_!"), STAR], true)), positive: render(glob([literal("a%_!"), QUESTION_MARK, STAR])) }).toMatchInlineSnapshot(`
				{
				  "negated": {
				    "parameters": [
				      "a!%!_!!%",
				    ],
				    "where": "(((("IamLowererItemEntity"."name" NOT LIKE $1 ESCAPE '!'))))",
				  },
				  "positive": {
				    "parameters": [
				      "a!%!_!!_%",
				    ],
				    "where": "(((("IamLowererItemEntity"."name" LIKE $1 ESCAPE '!'))))",
				  },
				}
			`);
		});

		it("matches an Arn with an anchored expression whose literals are escaped", () => {
			expect({
				char: render(arn(ARN_PATTERN, { type: "char" })),
				citext: render(arn(ARN_PATTERN, { type: "citext" })),
				collated: render(arn(ARN_PATTERN, { collation: "und-x-icu" })),
				negated: render(arn(ARN_PATTERN, {}, true)),
				positive: render(arn(ARN_PATTERN)),
			}).toMatchInlineSnapshot(`
				{
				  "char": "fails closed",
				  "citext": {
				    "parameters": [
				      "^arn:a\\.b\\+c:[^:]*:[^:]x$",
				    ],
				    "where": "((((CAST("IamLowererItemEntity"."name" AS text) ~ $1))))",
				  },
				  "collated": {
				    "parameters": [
				      "^arn:a\\.b\\+c:[^:]*:[^:]x$",
				    ],
				    "where": "(((("IamLowererItemEntity"."name" COLLATE "C" ~ $1))))",
				  },
				  "negated": {
				    "parameters": [
				      "^arn:a\\.b\\+c:[^:]*:[^:]x$",
				    ],
				    "where": "(((("IamLowererItemEntity"."name" !~ $1))))",
				  },
				  "positive": {
				    "parameters": [
				      "^arn:a\\.b\\+c:[^:]*:[^:]x$",
				    ],
				    "where": "(((("IamLowererItemEntity"."name" ~ $1))))",
				  },
				}
			`);
		});

		it("tests a network range on an inet column", () => {
			expect({ negated: render(ip("2001:db8::/32", true)), positive: render(ip("10.0.0.0/8")), text: renderIamLowererWhere(postgres, POSTGRES, { column: createIamLowererColumn("name"), isNegated: false, kind: EApiAuthorizationIamPredicateKind.IP_CONTAINED, range: "10.0.0.0/8" }) ?? "fails closed" }).toMatchInlineSnapshot(`
				{
				  "negated": {
				    "parameters": [
				      "2001:db8::/32",
				    ],
				    "where": "((((NOT ("IamLowererItemEntity"."code" <<= CAST($1 AS inet))))))",
				  },
				  "positive": {
				    "parameters": [
				      "10.0.0.0/8",
				    ],
				    "where": "(((("IamLowererItemEntity"."code" <<= CAST($1 AS inet)))))",
				  },
				  "text": "fails closed",
				}
			`);
		});

		it("names a parameter after the column, because PostgreSQL deduces one type per parameter", () => {
			const left: TApiAuthorizationIamPredicate = { column: createIamLowererColumn("rank", { family: EApiAuthorizationIamColumnFamily.NUMERIC, type: "numeric" }), comparison: EApiAuthorizationIamPredicateComparison.NUMERIC, kind: EApiAuthorizationIamPredicateKind.COMPARE, operator: EQUAL, value: "1" };
			const right: TApiAuthorizationIamPredicate = { column: createIamLowererColumn("code", { family: EApiAuthorizationIamColumnFamily.NUMERIC, type: "int" }), comparison: EApiAuthorizationIamPredicateComparison.NUMERIC, kind: EApiAuthorizationIamPredicateKind.COMPARE, operator: EQUAL, value: "1" };

			expect(renderIamLowererWhere(postgres, POSTGRES, { children: [left, right], kind: EApiAuthorizationIamPredicateKind.AND })?.parameters).toEqual(["1", "1"]);
		});
	});

	describe("CockroachDB", () => {
		const render = (predicate: TApiAuthorizationIamPredicate): unknown => renderIamLowererWhere(postgres, COCKROACH, predicate) ?? "fails closed";

		it("reads an integer of no named size as 64 bits, and has no C collation or citext to rely on", () => {
			expect({
				"int past 32 bits": render(numeric("int", EQUAL, "3000000000")),
				"int past 64 bits": render(numeric("int", GREATER_THAN, "9223372036854775808")),
				"int4 past 32 bits": render(numeric("int4", EQUAL, "3000000000")),
				ignoreCase: render(ignoreCase({}, "ann")),
			}).toMatchInlineSnapshot(`
				{
				  "ignoreCase": "fails closed",
				  "int past 32 bits": {
				    "parameters": [
				      "3000000000",
				    ],
				    "where": "(((("IamLowererItemEntity"."rank" = $1))))",
				  },
				  "int past 64 bits": {
				    "parameters": [],
				    "where": "((((0=1))))",
				  },
				  "int4 past 32 bits": {
				    "parameters": [],
				    "where": "((((0=1))))",
				  },
				}
			`);
		});
	});

	describe.each([
		["MySQL", MYSQL],
		["MariaDB", MARIADB],
	])("%s", (_name: string, dialect: IApiAuthorizationIamDialect) => {
		const render = (predicate: TApiAuthorizationIamPredicate): unknown => renderIamLowererWhere(mysql, dialect, predicate) ?? "fails closed";

		it("fails closed on IgnoreCase, Arn and IP", () => {
			for (const predicate of [ignoreCase({}, "ann"), arn(ARN_PATTERN), ip("10.0.0.0/8")]) {
				expect(render(predicate)).toBe("fails closed");
			}
		});

		it("compares a glob under the binary collation", () => {
			expect(renderIamLowererWhere(mysql, dialect, glob([literal("a"), STAR]))?.where).toContain("LIKE");
		});
	});

	describe("MySQL", () => {
		const render = (predicate: TApiAuthorizationIamPredicate): unknown => renderIamLowererWhere(mysql, MYSQL, predicate) ?? "fails closed";

		it("compares an integer and a DECIMAL as DECIMAL, a double as a number, and fails closed on FLOAT", () => {
			expect({
				bigint: render(numeric("bigint", EQUAL, "9223372036854775807")),
				decimal: render(numeric("decimal", LESS_THAN, "12.5")),
				"decimal past its scale": render(numeric("decimal", LESS_THAN, `0.${"1".repeat(31)}`)),
				double: render(numeric("double", LESS_THAN, "1.5")),
				float: render(numeric("float", LESS_THAN, "1.5")),
				"int <= 1.5": render(numeric("int", LESS_THAN_EQUAL, "1.5")),
				"int = 1.5": render(numeric("int", EQUAL, "1.5")),
				"int past 65 digits": render(numeric("int", LESS_THAN, "1".repeat(66))),
			}).toMatchInlineSnapshot(`
				{
				  "bigint": {
				    "parameters": [
				      "9223372036854775807",
				    ],
				    "where": "((((\`IamLowererItemEntity\`.\`rank\` = CAST(? AS DECIMAL(65,0))))))",
				  },
				  "decimal": {
				    "parameters": [
				      "12.5",
				    ],
				    "where": "((((\`IamLowererItemEntity\`.\`rank\` < CAST(? AS DECIMAL(65,30))))))",
				  },
				  "decimal past its scale": "fails closed",
				  "double": {
				    "parameters": [
				      1.5,
				    ],
				    "where": "((((\`IamLowererItemEntity\`.\`rank\` < ?))))",
				  },
				  "float": "fails closed",
				  "int <= 1.5": {
				    "parameters": [
				      "1",
				    ],
				    "where": "((((\`IamLowererItemEntity\`.\`rank\` <= CAST(? AS DECIMAL(65,0))))))",
				  },
				  "int = 1.5": {
				    "parameters": [],
				    "where": "((((0=1))))",
				  },
				  "int past 65 digits": "fails closed",
				}
			`);
		});

		it("compares an instant as a bound Date, and fails closed on a literal more precise than the column", () => {
			expect({
				date: render(date({ type: "date" }, LESS_THAN, "2024-01-15")),
				datetime: render(date({ type: "datetime" }, LESS_THAN, INSTANT)),
				"datetime with milliseconds": render(date({ type: "datetime" }, LESS_THAN, MILLISECOND_INSTANT)),
				"datetime(3) with milliseconds": render(date({ precision: 3, type: "datetime" }, GREATER_THAN, MILLISECOND_INSTANT)),
				"datetime(6) =": render(date({ precision: 6, type: "datetime" }, EQUAL, MILLISECOND_INSTANT)),
				"datetime(6) >": render(date({ precision: 6, type: "datetime" }, GREATER_THAN, MILLISECOND_INSTANT)),
				time: render(date({ type: "time" }, LESS_THAN, INSTANT)),
				"timestamp, created date": render(date({ isAutoDate: true, type: "timestamp" }, LESS_THAN_EQUAL, MILLISECOND_INSTANT)),
			}).toMatchInlineSnapshot(`
				{
				  "date": {
				    "parameters": [
				      "2024-01-15",
				    ],
				    "where": "((((\`IamLowererItemEntity\`.\`code\` < ?))))",
				  },
				  "datetime": {
				    "parameters": [
				      2024-01-15T10:00:00.000Z,
				    ],
				    "where": "((((\`IamLowererItemEntity\`.\`code\` < ?))))",
				  },
				  "datetime with milliseconds": "fails closed",
				  "datetime(3) with milliseconds": {
				    "parameters": [
				      2024-01-15T10:00:00.123Z,
				    ],
				    "where": "((((\`IamLowererItemEntity\`.\`code\` > ?))))",
				  },
				  "datetime(6) =": {
				    "parameters": [
				      2024-01-15T10:00:00.123Z,
				      2024-01-15T10:00:00.124Z,
				    ],
				    "where": "(((((\`IamLowererItemEntity\`.\`code\` >= ? AND \`IamLowererItemEntity\`.\`code\` < ?)))))",
				  },
				  "datetime(6) >": {
				    "parameters": [
				      2024-01-15T10:00:00.124Z,
				    ],
				    "where": "((((\`IamLowererItemEntity\`.\`code\` >= ?))))",
				  },
				  "time": "fails closed",
				  "timestamp, created date": {
				    "parameters": [
				      2024-01-15T10:00:00.124Z,
				    ],
				    "where": "((((\`IamLowererItemEntity\`.\`code\` < ?))))",
				  },
				}
			`);
		});
	});

	describe("SQLite", () => {
		const render = (predicate: TApiAuthorizationIamPredicate): unknown => renderIamLowererWhere(sqlite, SQLITE, predicate) ?? "fails closed";

		it("binds a Numeric literal a double holds, and compares it with any numeric type", () => {
			expect({
				"bigint past 2^53": render(numeric("bigint", EQUAL, "9007199254740993")),
				decimal: render(numeric("decimal", LESS_THAN, "12.5")),
				"int <= 1.5": render(numeric("int", LESS_THAN_EQUAL, "1.5")),
				"real 16 digits": render(numeric("real", LESS_THAN, "1.234567890123456")),
			}).toMatchInlineSnapshot(`
				{
				  "bigint past 2^53": "fails closed",
				  "decimal": {
				    "parameters": [],
				    "where": "(((("IamLowererItemEntity"."rank" < 12.5))))",
				  },
				  "int <= 1.5": {
				    "parameters": [],
				    "where": "(((("IamLowererItemEntity"."rank" <= 1.5))))",
				  },
				  "real 16 digits": "fails closed",
				}
			`);
		});

		it("compares an instant as the text TypeORM stores", () => {
			expect({
				date: render(date({ type: "date" }, LESS_THAN, "2024-01-15")),
				datetime: render(date({ type: "datetime" }, LESS_THAN, MILLISECOND_INSTANT)),
				"datetime with a calendar literal": render(date({ type: "datetime" }, LESS_THAN, "2024-01-15")),
				timestamp: render(date({ type: "timestamp" }, LESS_THAN, MILLISECOND_INSTANT)),
			}).toMatchInlineSnapshot(`
				{
				  "date": {
				    "parameters": [
				      "2024-01-15",
				    ],
				    "where": "(((("IamLowererItemEntity"."code" < ?))))",
				  },
				  "datetime": {
				    "parameters": [
				      "2024-01-15 10:00:00.123",
				    ],
				    "where": "((((strftime('%Y-%m-%d %H:%M:%f', "IamLowererItemEntity"."code") < ?))))",
				  },
				  "datetime with a calendar literal": "fails closed",
				  "timestamp": "fails closed",
				}
			`);
		});

		it("folds A-Z in a GLOB with every other special character escaped", () => {
			expect({ negated: render(ignoreCase({}, "a*b?[é]", true)), positive: render(ignoreCase({}, "ann")) }).toMatchInlineSnapshot(`
				{
				  "negated": {
				    "parameters": [
				      "[aA][*][bB][?][[]é]",
				    ],
				    "where": "((((("IamLowererItemEntity"."name" NOT GLOB ? AND instr(CAST("IamLowererItemEntity"."name" AS BLOB), X'00') = 0)))))",
				  },
				  "positive": {
				    "parameters": [
				      "[aA][nN][nN]",
				    ],
				    "where": "((((("IamLowererItemEntity"."name" GLOB ? AND instr(CAST("IamLowererItemEntity"."name" AS BLOB), X'00') = 0)))))",
				  },
				}
			`);
		});

		it("matches a condition glob with GLOB, and fails closed on Arn and IP", () => {
			expect({ arn: render(arn(ARN_PATTERN)), glob: render(glob([literal("a*["), QUESTION_MARK, STAR])), ip: render(ip("10.0.0.0/8")) }).toMatchInlineSnapshot(`
				{
				  "arn": "fails closed",
				  "glob": {
				    "parameters": [
				      "a[*][[]?*",
				    ],
				    "where": "((((("IamLowererItemEntity"."name" GLOB ? AND instr(CAST("IamLowererItemEntity"."name" AS BLOB), X'00') = 0)))))",
				  },
				  "ip": "fails closed",
				}
			`);
		});
	});

	describe("portable", () => {
		const render = (predicate: TApiAuthorizationIamPredicate): unknown => renderIamLowererWhere(sqlite, PORTABLE, predicate) ?? "fails closed";

		it("compares only an integer within its type, and fails closed on the rest", () => {
			expect({
				"bigint past 2^53": render(numeric("bigint", LESS_THAN, "9007199254740993")),
				decimal: render(numeric("decimal", LESS_THAN, "1")),
				"int <": render(numeric("int", LESS_THAN, "1.5")),
				"int <>": render(numeric("int", NOT_EQUAL, "1")),
				"int =": render(numeric("int", EQUAL, "1")),
				"int = 1.5": render(numeric("int", EQUAL, "1.5")),
				"int >": render(numeric("int", GREATER_THAN, "1")),
				"int past 32 bits": render(numeric("int", GREATER_THAN_EQUAL, "3000000000")),
			}).toMatchInlineSnapshot(`
				{
				  "bigint past 2^53": "fails closed",
				  "decimal": "fails closed",
				  "int <": {
				    "parameters": [],
				    "where": "(((("IamLowererItemEntity"."rank" < 2))))",
				  },
				  "int <>": {
				    "parameters": [],
				    "where": "((((NOT("IamLowererItemEntity"."rank" = 1)))))",
				  },
				  "int =": {
				    "parameters": [],
				    "where": "(((("IamLowererItemEntity"."rank" = 1))))",
				  },
				  "int = 1.5": {
				    "parameters": [],
				    "where": "((((0=1))))",
				  },
				  "int >": {
				    "parameters": [],
				    "where": "(((("IamLowererItemEntity"."rank" > 1))))",
				  },
				  "int past 32 bits": "fails closed",
				}
			`);
		});

		it("fails closed on every other new atom, a positive or negated condition glob among them", () => {
			for (const predicate of [date({ type: "date" }, EQUAL, "2024-01-15"), date({ type: "timestamptz" }, EQUAL, INSTANT), ignoreCase({}, "ann"), arn(ARN_PATTERN), ip("10.0.0.0/8"), glob([literal("a"), STAR]), glob([literal("a"), STAR], true)]) {
				expect(render(predicate)).toBe("fails closed");
			}
		});
	});

	describe("a value transformer", () => {
		it("fails every SQL comparison closed, since Raw would bypass it", () => {
			const transformed: TApiAuthorizationIamPredicate = { column: createIamLowererColumn("rank", { family: EApiAuthorizationIamColumnFamily.NUMERIC, hasTransformer: true, type: "numeric" }), comparison: EApiAuthorizationIamPredicateComparison.NUMERIC, kind: EApiAuthorizationIamPredicateKind.COMPARE, operator: EQUAL, value: "1" };

			expect(renderIamLowererWhere(postgres, POSTGRES, transformed)).toBeUndefined();
		});
	});
});
