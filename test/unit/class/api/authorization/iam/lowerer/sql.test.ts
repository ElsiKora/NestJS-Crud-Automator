import type { IApiAuthorizationIamCollection, IApiAuthorizationIamDialect, IApiAuthorizationIamPredicateColumn, IApiAuthorizationIamToken } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate } from "@type/class/api/authorization/iam";
import type { DataSource } from "typeorm";

import { ApiAuthorizationIamPredicateBuilder } from "@class/api/authorization/iam";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamDialect, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind, EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { createIamLowerer, createIamLowererColumn, createIamLowererDataSource, renderIamLowererWhere } from "@test/unit/class/api/authorization/iam/fixture/lowerer";
import { beforeAll, describe, expect, it } from "vitest";

const NAME: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("name");
const UUID_CODE: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("code", { family: EApiAuthorizationIamColumnFamily.UUID, type: "uuid" });
const ENUM_NAME: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("name", { enumValues: ["alpha", "beta"], family: EApiAuthorizationIamColumnFamily.ENUM, type: "enum" });
const CANONICAL_UUID: string = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";

const textIn = (column: IApiAuthorizationIamPredicateColumn, values: Array<string>, isNegated: boolean = false): TApiAuthorizationIamPredicate => ({ column, comparison: EApiAuthorizationIamPredicateComparison.TEXT, isNegated, kind: EApiAuthorizationIamPredicateKind.IN, values });

const ignoreCaseValues = (column: IApiAuthorizationIamPredicateColumn, values: Array<string>, isNegated: boolean = false): TApiAuthorizationIamPredicate => ({ column, comparison: EApiAuthorizationIamPredicateComparison.TEXT_IGNORE_CASE, isNegated, kind: EApiAuthorizationIamPredicateKind.IN, values });

const like = (column: IApiAuthorizationIamPredicateColumn, pattern: Array<IApiAuthorizationIamToken>, isNegated: boolean = false): TApiAuthorizationIamPredicate => ({ column, isNegated, kind: EApiAuthorizationIamPredicateKind.LIKE, pattern });

// `a%b_c!*[x]?` followed by a wildcard: every character either dialect escapes.
const ESCAPED_PATTERN: Array<IApiAuthorizationIamToken> = [{ type: EApiAuthorizationIamTokenType.LITERAL, value: "a%b_c!*[x]?" }, { type: EApiAuthorizationIamTokenType.QUESTION_MARK }, { type: EApiAuthorizationIamTokenType.STAR }];

const POSTGRES: IApiAuthorizationIamDialect = { driverType: "postgres", type: EApiAuthorizationIamDialect.POSTGRES };
const COCKROACH: IApiAuthorizationIamDialect = { driverType: "cockroachdb", type: EApiAuthorizationIamDialect.POSTGRES };
const MYSQL: IApiAuthorizationIamDialect = { binaryCollation: "utf8mb4_0900_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "8.4.2" };
const MARIADB: IApiAuthorizationIamDialect = { binaryCollation: "utf8mb4_nopad_bin", driverType: "mysql", type: EApiAuthorizationIamDialect.MARIADB, version: "11.4.2-MariaDB" };
const SQLITE: IApiAuthorizationIamDialect = { driverType: "better-sqlite3", type: EApiAuthorizationIamDialect.SQLITE };
const PORTABLE: IApiAuthorizationIamDialect = { type: EApiAuthorizationIamDialect.PORTABLE };

describe("IAM predicate lowering to SQL", () => {
	let postgres: DataSource;
	let mysql: DataSource;
	let sqlite: DataSource;

	beforeAll(async () => {
		[postgres, mysql, sqlite] = await Promise.all([createIamLowererDataSource("postgres"), createIamLowererDataSource("mysql"), createIamLowererDataSource("better-sqlite3")]);
	});

	describe("PostgreSQL", () => {
		it("compares a plain text column natively, with the NULL branch of a Deny", () => {
			expect(renderIamLowererWhere(postgres, POSTGRES, ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column: NAME, comparison: EApiAuthorizationIamPredicateComparison.TEXT, value: "ann" }).fails)).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "ann",
				  ],
				  "where": "((((NOT("IamLowererItemEntity"."name" = $1)))) OR ((("IamLowererItemEntity"."name" IS NULL))))",
				}
			`);
		});

		it("compares several values with IN", () => {
			expect(renderIamLowererWhere(postgres, POSTGRES, textIn(NAME, ["ann", "bob"]))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "ann",
				    "bob",
				  ],
				  "where": "(((("IamLowererItemEntity"."name" IN ($1, $2)))))",
				}
			`);
		});

		it("compares a citext column through its text cast", () => {
			expect(renderIamLowererWhere(postgres, POSTGRES, textIn(createIamLowererColumn("name", { type: "citext" }), ["Ann"]))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "Ann",
				  ],
				  "where": "((((CAST("IamLowererItemEntity"."name" AS text) = $1))))",
				}
			`);
		});

		it('compares a column with a declared collation under COLLATE "C"', () => {
			expect(renderIamLowererWhere(postgres, POSTGRES, textIn(createIamLowererColumn("name", { collation: "und-x-icu" }), ["Ann"], true))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "Ann",
				  ],
				  "where": "(((("IamLowererItemEntity"."name" COLLATE "C" <> $1))))",
				}
			`);
		});

		it("matches a glob with LIKE and an explicit ESCAPE", () => {
			expect(renderIamLowererWhere(postgres, POSTGRES, like(NAME, ESCAPED_PATTERN))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "a!%b!_c!!*[x]?_%",
				  ],
				  "where": "(((("IamLowererItemEntity"."name" LIKE $1 ESCAPE '!'))))",
				}
			`);
		});

		it("fails closed on fixed-length char, and on citext or a collation on CockroachDB", () => {
			expect(renderIamLowererWhere(postgres, POSTGRES, textIn(createIamLowererColumn("name", { type: "char" }), ["ann"]))).toBeUndefined();
			expect(renderIamLowererWhere(postgres, POSTGRES, like(createIamLowererColumn("name", { type: "bpchar" }), ESCAPED_PATTERN, true))).toBeUndefined();
			expect(renderIamLowererWhere(postgres, COCKROACH, textIn(createIamLowererColumn("name", { type: "citext" }), ["ann"]))).toBeUndefined();
			expect(renderIamLowererWhere(postgres, COCKROACH, textIn(createIamLowererColumn("name", { collation: "en-US-u-ks-level2" }), ["ann"]))).toBeUndefined();
			expect(renderIamLowererWhere(postgres, COCKROACH, textIn(NAME, ["ann"]))).toBeDefined();
		});

		it("compares only canonical lower-case values on a uuid column, natively", () => {
			expect(renderIamLowererWhere(postgres, POSTGRES, textIn(UUID_CODE, [CANONICAL_UUID, CANONICAL_UUID.toUpperCase(), "not-a-uuid"]))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
				  ],
				  "where": "(((("IamLowererItemEntity"."code" = $1))))",
				}
			`);
		});

		it.each([POSTGRES, COCKROACH])("lowers to a condition that matches no row when no value is a canonical uuid, and every non-NULL row when negated ($driverType)", (dialect: IApiAuthorizationIamDialect) => {
			for (const value of [CANONICAL_UUID.toUpperCase(), `{${CANONICAL_UUID}}`, CANONICAL_UUID.replaceAll("-", ""), "not-a-uuid", ""]) {
				// A branch that matches no row, not an empty predicate: the scope still compiles, as on every other database.
				expect(renderIamLowererWhere(postgres, dialect, textIn(UUID_CODE, [value]))).toEqual({ parameters: [], where: "((((0=1))))" });
				expect(renderIamLowererWhere(postgres, dialect, textIn(UUID_CODE, [value], true))?.where).toBe('((((NOT("IamLowererItemEntity"."code" IS NULL)))))');
			}
		});

		it('keeps the NULL-complete pair of a "" placeholder on a uuid column without binding ""', () => {
			const pair = ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column: UUID_CODE, comparison: EApiAuthorizationIamPredicateComparison.TEXT, value: "" });

			expect(renderIamLowererWhere(postgres, POSTGRES, pair.holds)).toEqual({ parameters: [], where: '(((("IamLowererItemEntity"."code" IS NULL))) OR (((0=1))))' });
			expect(renderIamLowererWhere(postgres, POSTGRES, pair.fails)).toEqual({ parameters: [], where: '(((((NOT("IamLowererItemEntity"."code" IS NULL) AND NOT("IamLowererItemEntity"."code" IS NULL))))))' });
		});

		it("compares only declared values on an enum column, natively, and matches no row for any other", () => {
			expect(renderIamLowererWhere(postgres, POSTGRES, textIn(ENUM_NAME, ["alpha", "gamma"]))).toEqual({ parameters: ["alpha"], where: '(((("IamLowererItemEntity"."name" = $1))))' });
			expect(renderIamLowererWhere(postgres, POSTGRES, textIn(ENUM_NAME, ["Alpha", "gamma"]))).toEqual({ parameters: [], where: "((((0=1))))" });
			expect(renderIamLowererWhere(postgres, POSTGRES, textIn(ENUM_NAME, ["gamma"], true))?.where).toBe('((((NOT("IamLowererItemEntity"."name" IS NULL)))))');
		});

		it("compares the text cast of an enum column whose values TypeORM does not declare", () => {
			const undeclared: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("name", { family: EApiAuthorizationIamColumnFamily.ENUM, type: "enum" });

			expect(renderIamLowererWhere(postgres, POSTGRES, textIn(undeclared, ["gamma"]))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "gamma",
				  ],
				  "where": "((((CAST("IamLowererItemEntity"."name" AS text) = $1))))",
				}
			`);
			expect(renderIamLowererWhere(postgres, POSTGRES, textIn(createIamLowererColumn("name", { family: EApiAuthorizationIamColumnFamily.ENUM, hasTransformer: true, type: "enum" }), ["gamma"]))).toBeUndefined();
		});
	});

	describe("MySQL and MariaDB", () => {
		it("compares text under the MySQL NO PAD binary collation", () => {
			expect(renderIamLowererWhere(mysql, MYSQL, ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column: NAME, comparison: EApiAuthorizationIamPredicateComparison.TEXT, value: "ann" }).fails)).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "ann",
				  ],
				  "where": "((((CONVERT(\`IamLowererItemEntity\`.\`name\` USING utf8mb4) COLLATE utf8mb4_0900_bin <> ?))) OR (((\`IamLowererItemEntity\`.\`name\` IS NULL))))",
				}
			`);
		});

		it("compares text under the MariaDB NO PAD binary collation", () => {
			expect(renderIamLowererWhere(mysql, MARIADB, textIn(NAME, ["ann", "bob"]))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "ann",
				    "bob",
				  ],
				  "where": "((((CONVERT(\`IamLowererItemEntity\`.\`name\` USING utf8mb4) COLLATE utf8mb4_nopad_bin IN (?, ?)))))",
				}
			`);
		});

		it("matches a glob with LIKE under the binary collation", () => {
			expect(renderIamLowererWhere(mysql, MYSQL, like(NAME, ESCAPED_PATTERN, true))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "a!%b!_c!!*[x]?_%",
				  ],
				  "where": "((((CONVERT(\`IamLowererItemEntity\`.\`name\` USING utf8mb4) COLLATE utf8mb4_0900_bin NOT LIKE ? ESCAPE '!'))))",
				}
			`);
		});

		it("fails closed on a server without the binary collation", () => {
			expect(renderIamLowererWhere(mysql, { driverType: "mysql", type: EApiAuthorizationIamDialect.MYSQL, version: "8.0.16" }, textIn(NAME, ["ann"]))).toBeUndefined();
			expect(renderIamLowererWhere(mysql, { driverType: "mysql", type: EApiAuthorizationIamDialect.MARIADB, version: "10.1.0" }, like(NAME, ESCAPED_PATTERN, true))).toBeUndefined();
		});

		it("keeps IS NULL native", () => {
			expect(renderIamLowererWhere(mysql, MYSQL, { column: NAME, kind: EApiAuthorizationIamPredicateKind.IS_NULL })).toMatchInlineSnapshot(`
				{
				  "parameters": [],
				  "where": "((((\`IamLowererItemEntity\`.\`name\` IS NULL))))",
				}
			`);
		});
	});

	describe("uuid and enum columns outside PostgreSQL", () => {
		it.each([
			["MySQL", MYSQL],
			["MariaDB", MARIADB],
			["SQLite", SQLITE],
			["portable", PORTABLE],
		])("binds every value on %s, which compares it as text without refusing it", (_name: string, dialect: IApiAuthorizationIamDialect) => {
			for (const column of [UUID_CODE, ENUM_NAME]) {
				const lowered = createIamLowerer(dialect).lower(textIn(column, [CANONICAL_UUID.toUpperCase(), "gamma", ""]), 128);

				expect(lowered.isCompilable).toBe(true);
				expect(lowered.branches).toHaveLength(1);
			}
		});
	});

	describe("SQLite", () => {
		it("compares text natively under the default BINARY collation", () => {
			expect(renderIamLowererWhere(sqlite, SQLITE, textIn(NAME, ["ann"], true))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "ann",
				  ],
				  "where": "((((NOT("IamLowererItemEntity"."name" = ?)))))",
				}
			`);
		});

		it("compares a column with a declared collation under COLLATE BINARY", () => {
			expect(renderIamLowererWhere(sqlite, SQLITE, textIn(createIamLowererColumn("name", { collation: "NOCASE" }), ["Ann"]))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "Ann",
				  ],
				  "where": "(((("IamLowererItemEntity"."name" COLLATE BINARY = ?))))",
				}
			`);
			expect(renderIamLowererWhere(sqlite, SQLITE, textIn(createIamLowererColumn("name", { collation: "BINARY" }), ["Ann"]))).toEqual(renderIamLowererWhere(sqlite, SQLITE, textIn(NAME, ["Ann"])));
		});

		it("matches a glob with GLOB, escaping *, ? and [", () => {
			expect(renderIamLowererWhere(sqlite, SQLITE, like(NAME, ESCAPED_PATTERN))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "a%b_c![*][[]x][?]?*",
				  ],
				  "where": "(((("IamLowererItemEntity"."name" GLOB ?))))",
				}
			`);
		});
	});

	describe("portable", () => {
		it("emits the 5.1.0 forms: native equality and a negated LIKE", () => {
			expect(renderIamLowererWhere(sqlite, PORTABLE, textIn(NAME, ["ann"]))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "ann",
				  ],
				  "where": "(((("IamLowererItemEntity"."name" = ?))))",
				}
			`);
			expect(renderIamLowererWhere(sqlite, PORTABLE, like(NAME, ESCAPED_PATTERN, true))).toMatchInlineSnapshot(`
				{
				  "parameters": [
				    "a!%b!_c!!*[x]?_%",
				  ],
				  "where": "(((("IamLowererItemEntity"."name" NOT LIKE ? ESCAPE '!'))))",
				}
			`);
		});

		it("fails closed on a positive LIKE, which a case-insensitive collation could widen", () => {
			expect(renderIamLowererWhere(sqlite, PORTABLE, like(NAME, ESCAPED_PATTERN))).toBeUndefined();
		});

		it("lowers no atom for an unresolved dialect, while constants still lower", () => {
			const unresolved: IApiAuthorizationIamDialect = { type: EApiAuthorizationIamDialect.UNRESOLVED };

			expect(renderIamLowererWhere(sqlite, unresolved, textIn(NAME, ["ann"]))).toBeUndefined();
			expect(renderIamLowererWhere(sqlite, unresolved, { kind: EApiAuthorizationIamPredicateKind.TRUE })).toEqual({ parameters: [], where: "" });
		});
	});

	describe("a subquery on a to-many relation", () => {
		const ID: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("id", { isPrimary: true });
		const TEXT: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("text");
		const COLLECTION: IApiAuthorizationIamCollection = { correlationPath: "id", element: "row.text", elementPath: "text", from: "notes row", link: "row.itemId" };
		const exists = (predicate: TApiAuthorizationIamPredicate, isNegated: boolean = false, collection: IApiAuthorizationIamCollection = COLLECTION): TApiAuthorizationIamPredicate => ({ collection, column: ID, isNegated, kind: EApiAuthorizationIamPredicateKind.EXISTS, predicate });

		it.each<[string, IApiAuthorizationIamDialect, () => DataSource, string, string]>([
			["PostgreSQL", POSTGRES, () => postgres, `"IamLowererItemEntity"."id"`, "row.text IN ($1, $2)"],
			["MySQL", MYSQL, () => mysql, "`IamLowererItemEntity`.`id`", "CONVERT(row.text USING utf8mb4) COLLATE utf8mb4_0900_bin IN (?, ?)"],
			["MariaDB", MARIADB, () => mysql, "`IamLowererItemEntity`.`id`", "CONVERT(row.text USING utf8mb4) COLLATE utf8mb4_nopad_bin IN (?, ?)"],
			["SQLite", SQLITE, () => sqlite, `"IamLowererItemEntity"."id"`, "row.text IN (?, ?)"],
		])("%s correlates on the column of the resource and compares a related row as its dialect compares any column", (_name: string, dialect: IApiAuthorizationIamDialect, dataSource: () => DataSource, correlation: string, comparison: string) => {
			const rendered = renderIamLowererWhere(dataSource(), dialect, exists(textIn(TEXT, ["a", "b"])));

			expect(rendered?.where).toContain(`EXISTS (SELECT 1 FROM notes row WHERE row.itemId = ${correlation} AND (${comparison}))`);
			expect(rendered?.where).not.toContain("NOT EXISTS");
			expect(rendered?.parameters).toEqual(["a", "b"]);
		});

		it("negates the subquery, not what it compares", () => {
			expect(renderIamLowererWhere(sqlite, SQLITE, exists(textIn(TEXT, ["a"]), true))?.where).toContain("NOT EXISTS (SELECT 1 FROM notes row WHERE");
		});

		it("adds the condition on a related row, for a soft-deletable entity", () => {
			expect(renderIamLowererWhere(sqlite, SQLITE, exists(textIn(TEXT, ["a"]), false, { ...COLLECTION, rowCondition: "row.deletedAt IS NULL" }))?.where).toContain(`row.itemId = "IamLowererItemEntity"."id" AND row.deletedAt IS NULL AND (`);
		});

		it("writes the branches of the related predicate as an OR of ANDs", () => {
			const other: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("text", {}, {});
			const predicate: TApiAuthorizationIamPredicate = ApiAuthorizationIamPredicateBuilder.or([ApiAuthorizationIamPredicateBuilder.and([textIn(other, ["a"], true), textIn(other, ["b"], true)]), { column: TEXT, kind: EApiAuthorizationIamPredicateKind.IS_NULL }]);

			expect(renderIamLowererWhere(sqlite, SQLITE, exists(predicate))?.where).toContain("((NOT (row.text = ?) AND NOT (row.text = ?)) OR (row.text IS NULL))");
		});

		it("writes every row for the TRUE predicate and no row for an empty IN", () => {
			expect(renderIamLowererWhere(sqlite, SQLITE, exists({ kind: EApiAuthorizationIamPredicateKind.TRUE }, true))?.where).toContain("AND (1=1)");
			expect(renderIamLowererWhere(sqlite, SQLITE, exists({ kind: EApiAuthorizationIamPredicateKind.FALSE }))?.where).toContain("AND (1=0)");
		});

		it("binds a value in a subquery under another name than the same value on a column of the resource", () => {
			const outer = ApiAuthorizationIamPredicateBuilder.and([exists(ignoreCaseValues(TEXT, ["a"])), ignoreCaseValues(NAME, ["a"])]);
			const parameters = renderIamLowererWhere(postgres, POSTGRES, outer)?.parameters;

			expect(parameters).toEqual(["a", "a"]);
		});

		it.each<[string, IApiAuthorizationIamDialect, () => DataSource]>([
			["the portable dialect, whose collation nothing checks", PORTABLE, () => sqlite],
			["an unresolved dialect", { type: EApiAuthorizationIamDialect.UNRESOLVED }, () => sqlite],
		])("does not lower on %s", (_name: string, dialect: IApiAuthorizationIamDialect, dataSource: () => DataSource) => {
			expect(renderIamLowererWhere(dataSource(), dialect, exists(textIn(TEXT, ["a"])))).toBeUndefined();
		});

		it("does not lower a related column with a value transformer, which the subquery bypasses", () => {
			expect(renderIamLowererWhere(sqlite, SQLITE, exists(textIn(createIamLowererColumn("text", { hasTransformer: true }), ["a"])))).toBeUndefined();
		});

		it("does not lower an atom that reads anything but the related column", () => {
			expect(renderIamLowererWhere(sqlite, SQLITE, exists(textIn(NAME, ["a"])))).toBeUndefined();
		});

		it("does not lower a related atom its dialect cannot express", () => {
			expect(renderIamLowererWhere(mysql, MYSQL, exists(ignoreCaseValues(TEXT, ["a"])))).toBeUndefined();
		});
	});

	describe("several values", () => {
		it("SQLite compares IgnoreCase with one GLOB per value, positive or negated", () => {
			expect(renderIamLowererWhere(sqlite, SQLITE, ignoreCaseValues(NAME, ["ab", "c"]))).toEqual({ parameters: ["[aA][bB]", "[cC]"], where: `((((("IamLowererItemEntity"."name" GLOB ? OR "IamLowererItemEntity"."name" GLOB ?)))))` });
			expect(renderIamLowererWhere(sqlite, SQLITE, ignoreCaseValues(NAME, ["ab", "c"], true))).toEqual({ parameters: ["[aA][bB]", "[cC]"], where: `((((("IamLowererItemEntity"."name" NOT GLOB ? AND "IamLowererItemEntity"."name" NOT GLOB ?)))))` });
		});

		it("PostgreSQL folds the column and binds every value of IgnoreCase", () => {
			expect(renderIamLowererWhere(postgres, POSTGRES, ignoreCaseValues(NAME, ["ab", "c"]))?.parameters).toEqual(["ab", "c"]);
		});

		it.each([
			["PostgreSQL", POSTGRES, () => postgres],
			["MySQL", MYSQL, () => mysql],
			["SQLite", SQLITE, () => sqlite],
		] as Array<[string, IApiAuthorizationIamDialect, () => DataSource]>)("%s binds every value of a text comparison", (_name: string, dialect: IApiAuthorizationIamDialect, dataSource: () => DataSource) => {
			expect(renderIamLowererWhere(dataSource(), dialect, textIn(NAME, ["a", "b"]))?.parameters).toEqual(["a", "b"]);
			expect(renderIamLowererWhere(dataSource(), dialect, textIn(NAME, ["a", "b"], true))?.parameters).toEqual(["a", "b"]);
		});
	});

	describe("every dialect", () => {
		const DIALECTS: Array<[string, IApiAuthorizationIamDialect, () => DataSource]> = [
			["PostgreSQL", POSTGRES, () => postgres],
			["MySQL", MYSQL, () => mysql],
			["SQLite", SQLITE, () => sqlite],
			["portable", PORTABLE, () => sqlite],
		];

		it.each(DIALECTS)("%s fails closed on a String comparison of a numeric, date, JSON or list column", (_name: string, dialect: IApiAuthorizationIamDialect, dataSource: () => DataSource) => {
			for (const family of [EApiAuthorizationIamColumnFamily.NUMERIC, EApiAuthorizationIamColumnFamily.DATE, EApiAuthorizationIamColumnFamily.JSON, EApiAuthorizationIamColumnFamily.ARRAY, EApiAuthorizationIamColumnFamily.BINARY, EApiAuthorizationIamColumnFamily.OTHER]) {
				expect(renderIamLowererWhere(dataSource(), dialect, textIn(createIamLowererColumn("rank", { family }), ["1"]))).toBeUndefined();
			}
		});

		it.each(DIALECTS)("%s compares a resource placeholder natively only negated, on a numeric or date column", (_name: string, dialect: IApiAuthorizationIamDialect, dataSource: () => DataSource) => {
			const rank: IApiAuthorizationIamPredicateColumn = createIamLowererColumn("rank", { family: EApiAuthorizationIamColumnFamily.NUMERIC, type: "int" });

			expect(renderIamLowererWhere(dataSource(), dialect, ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column: rank, comparison: EApiAuthorizationIamPredicateComparison.NATIVE, value: "7" }).fails)).toBeDefined();
			expect(renderIamLowererWhere(dataSource(), dialect, ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column: rank, comparison: EApiAuthorizationIamPredicateComparison.NATIVE, value: "7" }).holds)).toBeUndefined();
			expect(renderIamLowererWhere(dataSource(), dialect, ApiAuthorizationIamPredicateBuilder.buildExactConstraint({ column: createIamLowererColumn("rank", { family: EApiAuthorizationIamColumnFamily.JSON }), comparison: EApiAuthorizationIamPredicateComparison.NATIVE, value: "7" }).fails)).toBeUndefined();
		});

		it.each(DIALECTS)("%s fails closed on SQL it would have to build around a column with a value transformer", (_name: string, dialect: IApiAuthorizationIamDialect, dataSource: () => DataSource) => {
			expect(renderIamLowererWhere(dataSource(), dialect, like(createIamLowererColumn("name", { hasTransformer: true }), ESCAPED_PATTERN, true))).toBeUndefined();
		});

		it.each(DIALECTS)("%s names parameters after the dialect and the value, the same each time", (_name: string, dialect: IApiAuthorizationIamDialect, dataSource: () => DataSource) => {
			const first: string | undefined = renderIamLowererWhere(dataSource(), dialect, like(NAME, ESCAPED_PATTERN, true))?.where;

			expect(first).toBeDefined();
			expect(renderIamLowererWhere(dataSource(), dialect, like(NAME, ESCAPED_PATTERN, true))?.where).toBe(first);
		});
	});
});
