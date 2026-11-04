import type { IApiAuthorizationIamColumn, IApiAuthorizationIamDateValue, IApiAuthorizationIamDecimal, IApiAuthorizationIamPredicateCompare, IApiAuthorizationIamPredicateIn, IApiAuthorizationIamPredicateLike, IApiAuthorizationIamPredicateLowered } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamIntegerCompare } from "@type/class/api/authorization/iam";

import { ApiAuthorizationIamDateValue } from "@class/api/authorization/iam/date-value.class";
import { ApiAuthorizationIamDecimal } from "@class/api/authorization/iam/decimal.class";
import { ApiAuthorizationIamPortableLowerer } from "@class/api/authorization/iam/lowerer/portable.class";
import { AUTHORIZATION_IAM_DIALECT_CONSTANT } from "@constant/class/authorization";

/**
 * Lowers the IAM predicate IR for MySQL and MariaDB. Their default collations ignore letter case and accents, and the
 * PAD SPACE ones trailing spaces, while the in-memory evaluator compares code points. So every text comparison
 * converts the column to `utf8mb4` and compares it under the server's NO PAD binary collation: `utf8mb4_0900_bin` on
 * MySQL, `utf8mb4_nopad_bin` on MariaDB. A server without that collation, or a connection whose charset is not
 * `utf8mb4`, which could not carry every bound character, has none in its dialect, and every text comparison fails closed.
 *
 * MySQL compares a string with a DECIMAL as a double, so a Numeric literal for an integer or a DECIMAL column compares
 * as a `CAST` to DECIMAL. A FLOAT reads back rounded to fewer digits than it holds, so memory cannot agree with it, and it
 * fails closed. An instant binds as a `Date`, which the driver writes in the connection's time zone, as it reads the
 * column; a literal more precise than the column fails closed, and so does the second occurrence of a repeated hour.
 * IgnoreCase, Arn and IP fail closed: their exactness would depend on server flags the Automator cannot verify.
 */
export class ApiAuthorizationIamMysqlLowerer extends ApiAuthorizationIamPortableLowerer {
	/**
	 * Lowers a Date comparison on a `date`, `datetime` or `timestamp` column.
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

		if (date.isCalendar || (column.type !== undefined && column.type !== "datetime" && column.type !== "timestamp")) {
			return { isExact: false };
		}

		const digits: number = column.precision ?? (column.isAutoDate === true ? AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_AUTO_DATE_PRECISION : 0);

		if (this.isMorePrecise(date, digits)) {
			return { isExact: false };
		}

		return this.lowerInstantCompare(atom, date, { isFiner: digits > AUTHORIZATION_IAM_DIALECT_CONSTANT.MILLISECOND_DIGITS, isWallClock: true, toParameter: (instant: Date): Date => instant });
	}

	/**
	 * Lowers a glob with `LIKE`, positive or negated, under the binary collation.
	 * @param {IApiAuthorizationIamPredicateLike} atom - `LIKE` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerLike(atom: IApiAuthorizationIamPredicateLike): IApiAuthorizationIamPredicateLowered {
		const expression: ((columnAlias: string) => string) | undefined = this.isLikeColumn(atom) ? this.readTextExpression() : undefined;

		return expression ? this.createRawLike(atom, expression) : { isExact: false };
	}

	/**
	 * Lowers a Numeric comparison by column type.
	 * @param {IApiAuthorizationIamPredicateCompare} atom - `COMPARE` atom with a `NUMERIC` comparison.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerNumericCompare(atom: IApiAuthorizationIamPredicateCompare): IApiAuthorizationIamPredicateLowered {
		const column: IApiAuthorizationIamColumn | undefined = atom.column.field.column;
		const decimal: IApiAuthorizationIamDecimal | undefined = ApiAuthorizationIamDecimal.parse(atom.value);

		if (!column || !decimal) {
			return { isExact: false };
		}

		if (this.readIntegerBits(column) !== undefined) {
			return this.lowerIntegerCompare(atom, decimal);
		}

		if (column.type !== undefined && AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_DECIMAL_TYPES.has(column.type)) {
			return ApiAuthorizationIamDecimal.countIntegerDigits(decimal) <= AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_MAX_DECIMAL_DIGITS - AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_MAX_DECIMAL_SCALE && decimal.scale <= AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_MAX_DECIMAL_SCALE
				? this.createRawCompare(atom, atom.operator, ApiAuthorizationIamDecimal.toText(decimal), { parameter: (parameter: string): string => `CAST(${parameter} AS DECIMAL(${String(AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_MAX_DECIMAL_DIGITS)},${String(AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_MAX_DECIMAL_SCALE)}))` })
				: { isExact: false };
		}

		if (column.type !== undefined && AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_DOUBLE_TYPES.has(column.type) && this.isFloatExact(decimal, AUTHORIZATION_IAM_DIALECT_CONSTANT.DOUBLE_MAX_DIGITS, AUTHORIZATION_IAM_DIALECT_CONSTANT.DOUBLE_MIN_MAGNITUDE, AUTHORIZATION_IAM_DIALECT_CONSTANT.DOUBLE_MAX_MAGNITUDE)) {
			return this.createRawCompare(atom, atom.operator, Number(ApiAuthorizationIamDecimal.toText(decimal)));
		}

		return { isExact: false };
	}

	/**
	 * Lowers a text comparison under the binary collation.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `TEXT` comparison on a text column.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerTextIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		const expression: ((columnAlias: string) => string) | undefined = this.readTextExpression();

		return expression ? this.createRawIn(atom, expression) : { isExact: false };
	}

	/**
	 * Lowers an integer comparison: the literal rewritten exactly, and bound as a DECIMAL of scale 0. The driver writes a
	 * bound value as text, and a BigInt would reach the server as a string that compares as a double.
	 * @param {IApiAuthorizationIamPredicateCompare} atom - `COMPARE` atom on an integer column.
	 * @param {IApiAuthorizationIamDecimal} decimal - Literal.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	private lowerIntegerCompare(atom: IApiAuthorizationIamPredicateCompare, decimal: IApiAuthorizationIamDecimal): IApiAuthorizationIamPredicateLowered {
		const rewritten: TApiAuthorizationIamIntegerCompare = this.rewriteIntegerCompare(atom.operator, decimal);

		if (typeof rewritten === "string") {
			return this.createConstant(rewritten === "all");
		}

		const text: string = rewritten.value.toString();

		// A CAST past the largest DECIMAL saturates, so the comparison would no longer be exact.
		if (text.replace("-", "").length > AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_MAX_DECIMAL_DIGITS) {
			return { isExact: false };
		}

		return this.createRawCompare(atom, rewritten.operator, text, { parameter: (parameter: string): string => `CAST(${parameter} AS DECIMAL(${String(AUTHORIZATION_IAM_DIALECT_CONSTANT.MYSQL_MAX_DECIMAL_DIGITS)},0))` });
	}

	/**
	 * Builds the expression that compares a column's text code point by code point.
	 * @returns {((columnAlias: string) => string) | undefined} The expression, or undefined when the dialect has no binary collation.
	 */
	private readTextExpression(): ((columnAlias: string) => string) | undefined {
		const collation: string | undefined = this.dialect.binaryCollation;

		// The collation name comes from the registry's own constants, never from a document or a request.
		return collation === undefined ? undefined : (columnAlias: string): string => `CONVERT(${columnAlias} USING utf8mb4) COLLATE ${collation}`;
	}
}
