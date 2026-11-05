import type { IApiAuthorizationIamColumn, IApiAuthorizationIamDateValue, IApiAuthorizationIamDecimal, IApiAuthorizationIamPredicateCompare, IApiAuthorizationIamPredicateIn, IApiAuthorizationIamPredicateLike, IApiAuthorizationIamPredicateLowered, IApiAuthorizationIamToken } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicateValue } from "@type/class/api/authorization/iam";

import { ApiAuthorizationIamDateValue } from "@class/api/authorization/iam/date-value.class";
import { ApiAuthorizationIamDecimal } from "@class/api/authorization/iam/decimal.class";
import { ApiAuthorizationIamPortableLowerer } from "@class/api/authorization/iam/lowerer/portable.class";
import { AUTHORIZATION_IAM_DIALECT_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { Raw } from "typeorm";

// SQLite's default collation, which compares bytes.
const IAM_SQLITE_LOWERER_BINARY_COLLATION: string = "binary";

// The text TypeORM stores an instant as, which `strftime` also gives of a `datetime('now')` default.
const IAM_SQLITE_LOWERER_INSTANT_FORMAT: string = "%Y-%m-%d %H:%M:%f";

// U+0000, at which SQLite GLOB stops reading a text or a pattern.
const IAM_SQLITE_LOWERER_NUL: string = "\u0000";

// The characters a GLOB reads as more than themselves.
const IAM_SQLITE_LOWERER_GLOB_SPECIAL: RegExp = /[*?[]/g;

/**
 * Lowers the IAM predicate IR for the SQLite family. `=` compares bytes under the default `BINARY` collation, as
 * 5.1.0 compared it; a column that declares another collation, such as `NOCASE`, compares under `COLLATE BINARY`.
 * SQLite `LIKE` ignores ASCII letter case, so a glob lowers to `GLOB`, which compares bytes, with `*`, `?` and `[` of a
 * literal escaped as `[*]`, `[?]` and `[[]`, and an IgnoreCase comparison to a `GLOB` with `[aA]` for each ASCII letter.
 * `GLOB` stops at a NUL character, so a row whose text holds one is in neither form of a `GLOB`, and a pattern that
 * holds one does not lower.
 *
 * A Numeric literal binds as a number, since the driver reads every column as one: only a literal a double holds
 * exactly compares, with any type, and SQLite compares an integer with a real exactly. An instant compares as the
 * text TypeORM stores. Arn and IP fail closed: SQLite has neither a regular expression nor a network type.
 */
export class ApiAuthorizationIamSqliteLowerer extends ApiAuthorizationIamPortableLowerer {
	/**
	 * Lowers a Date comparison on a `date` or `datetime` column.
	 * @param {IApiAuthorizationIamPredicateCompare} atom - `COMPARE` atom with a `DATE` comparison.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerDateCompare(atom: IApiAuthorizationIamPredicateCompare): IApiAuthorizationIamPredicateLowered {
		const column: IApiAuthorizationIamColumn | undefined = atom.column.field.column;
		const date: IApiAuthorizationIamDateValue | undefined = ApiAuthorizationIamDateValue.parse(atom.value);

		if (!column || !date) {
			return { isExact: false };
		}

		if (column.type === "date") {
			return date.isCalendar ? this.createRawCompare(atom, atom.operator, date.text) : { isExact: false };
		}

		if (date.isCalendar || (column.type !== undefined && column.type !== "datetime")) {
			return { isExact: false };
		}

		// `2024-01-01T10:00:00.000Z` as `2024-01-01 10:00:00.000`.
		return this.createRawCompare(atom, atom.operator, `${date.text.slice(0, "YYYY-MM-DD".length)} ${date.text.slice("YYYY-MM-DDT".length, -"Z".length)}`, { expression: (columnAlias: string): string => `strftime('${IAM_SQLITE_LOWERER_INSTANT_FORMAT}', ${columnAlias})` });
	}

	/**
	 * Lowers an IgnoreCase comparison with `GLOB`, where a character class holds both cases of each ASCII letter: one
	 * `GLOB` per value, ORed, or for the negated form one `NOT GLOB` per value, ANDed.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `TEXT_IGNORE_CASE` comparison and folded values.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerIgnoreCaseIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		if (atom.values.length === 0 || atom.values.some((value: TApiAuthorizationIamPredicateValue): boolean => typeof value !== "string" || value.includes(IAM_SQLITE_LOWERER_NUL)) || atom.column.field.column?.family !== EApiAuthorizationIamColumnFamily.TEXT || atom.column.field.column.hasTransformer) {
			return { isExact: false };
		}

		const parameters: Record<string, string> = {};

		for (const value of atom.values as ReadonlyArray<string>) {
			const pattern: string = value.replaceAll(IAM_SQLITE_LOWERER_GLOB_SPECIAL, "[$&]").replaceAll(/[a-z]/g, (letter: string): string => `[${letter}${letter.toUpperCase()}]`);

			parameters[this.createParameterName("glob", pattern)] = pattern;
		}

		const parameterNames: Array<string> = Object.keys(parameters);

		return {
			isExact: true,
			operand: Raw((columnAlias: string): string => {
				const operator: string = atom.isNegated ? "NOT GLOB" : "GLOB";
				const comparisons: string = parameterNames.map((parameterName: string): string => `${columnAlias} ${operator} :${parameterName}`).join(atom.isNegated ? " AND " : " OR ");

				const grouped: string = parameterNames.length === 1 ? comparisons : `(${comparisons})`;

				return `(${grouped} AND ${this.createNoNulCondition(columnAlias)})`;
			}, parameters),
		};
	}

	/**
	 * Lowers a glob with `GLOB`, positive or negated.
	 * @param {IApiAuthorizationIamPredicateLike} atom - `LIKE` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerLike(atom: IApiAuthorizationIamPredicateLike): IApiAuthorizationIamPredicateLowered {
		// `Raw` bypasses a TypeORM value transformer, so a column that declares one is not exact here.
		if (!this.isLikeColumn(atom) || atom.column.field.column?.hasTransformer !== false) {
			return { isExact: false };
		}

		const pattern: string = atom.pattern.map((token: IApiAuthorizationIamToken): string => this.readGlobToken(token)).join("");

		if (pattern.includes(IAM_SQLITE_LOWERER_NUL)) {
			return { isExact: false };
		}

		const parameterName: string = this.createParameterName("glob", pattern);

		return { isExact: true, operand: Raw((columnAlias: string): string => `(${columnAlias} ${atom.isNegated ? "NOT GLOB" : "GLOB"} :${parameterName} AND ${this.createNoNulCondition(columnAlias)})`, { [parameterName]: pattern }) };
	}

	/**
	 * Lowers a Numeric comparison with a literal a double holds exactly.
	 * @param {IApiAuthorizationIamPredicateCompare} atom - `COMPARE` atom with a `NUMERIC` comparison.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerNumericCompare(atom: IApiAuthorizationIamPredicateCompare): IApiAuthorizationIamPredicateLowered {
		const decimal: IApiAuthorizationIamDecimal | undefined = ApiAuthorizationIamDecimal.parse(atom.value);

		if (!decimal) {
			return { isExact: false };
		}

		const value: number = Number(ApiAuthorizationIamDecimal.toText(decimal));
		const isExact: boolean = ApiAuthorizationIamDecimal.isInteger(decimal) ? Number.isSafeInteger(value) : this.isFloatExact(decimal, AUTHORIZATION_IAM_DIALECT_CONSTANT.DOUBLE_MAX_DIGITS, AUTHORIZATION_IAM_DIALECT_CONSTANT.DOUBLE_MIN_MAGNITUDE, AUTHORIZATION_IAM_DIALECT_CONSTANT.DOUBLE_MAX_MAGNITUDE);

		return isExact ? this.createRawCompare(atom, atom.operator, value) : { isExact: false };
	}

	/**
	 * Lowers a text comparison: native conditions under the default collation, `COLLATE BINARY` under a declared one.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `TEXT` comparison on a text column.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerTextIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		const collation: string | undefined = atom.column.field.column?.collation;

		return collation === undefined || collation.toLowerCase() === IAM_SQLITE_LOWERER_BINARY_COLLATION ? this.lowerNativeIn(atom) : this.createRawIn(atom, (columnAlias: string): string => `${columnAlias} COLLATE BINARY`);
	}

	/**
	 * Tells SQL that holds when a text column holds no NUL character, compared as bytes, since text functions stop at one.
	 * @param {string} columnAlias - Column alias TypeORM passes.
	 * @returns {string} The condition.
	 */
	private createNoNulCondition(columnAlias: string): string {
		return `instr(CAST(${columnAlias} AS BLOB), X'00') = 0`;
	}

	/**
	 * Writes one glob token as SQLite `GLOB` text.
	 * @param {IApiAuthorizationIamToken} token - Literal, `*` or `?` token.
	 * @returns {string} `GLOB` text.
	 */
	private readGlobToken(token: IApiAuthorizationIamToken): string {
		switch (token.type) {
			case EApiAuthorizationIamTokenType.LITERAL:
			// falls through

			case EApiAuthorizationIamTokenType.VARIABLE: {
				return (token.value ?? "").replaceAll(IAM_SQLITE_LOWERER_GLOB_SPECIAL, "[$&]");
			}

			case EApiAuthorizationIamTokenType.QUESTION_MARK: {
				return "?";
			}

			case EApiAuthorizationIamTokenType.STAR: {
				return "*";
			}
		}
	}
}
