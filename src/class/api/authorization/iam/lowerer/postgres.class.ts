import type { IApiAuthorizationIamColumn, IApiAuthorizationIamDateValue, IApiAuthorizationIamDecimal, IApiAuthorizationIamPredicateArn, IApiAuthorizationIamPredicateCompare, IApiAuthorizationIamPredicateIn, IApiAuthorizationIamPredicateIpContained, IApiAuthorizationIamPredicateLike, IApiAuthorizationIamPredicateLowered, IApiAuthorizationIamToken } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamIntegerCompare, TApiAuthorizationIamPredicateValue } from "@type/class/api/authorization/iam";

import { ApiAuthorizationIamDateValue } from "@class/api/authorization/iam/date-value.class";
import { ApiAuthorizationIamDecimal } from "@class/api/authorization/iam/decimal.class";
import { ApiAuthorizationIamPortableLowerer } from "@class/api/authorization/iam/lowerer/portable.class";
import { AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT, AUTHORIZATION_IAM_DIALECT_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { In, IsNull, Not, Raw } from "typeorm";

// TypeORM driver type of CockroachDB, which shares the PostgreSQL lowering but has no `"C"` collation or `citext` cast to rely on.
const IAM_POSTGRES_LOWERER_COCKROACH_DRIVER_TYPE: string = "cockroachdb";

// ASCII punctuation a regular expression may read as syntax: all of it but `:`, the delimiter, and `_`, which is a word character.
const IAM_POSTGRES_LOWERER_REGEX_SPECIAL: RegExp = /[!"#$%&'()*+,./;<=>?@[\\\]^`{|}~-]/g;

/**
 * Lowers the IAM predicate IR for PostgreSQL and CockroachDB. A text column with its default deterministic collation
 * compares code point by code point with `=` and `LIKE`, as 5.1.0 compared it. The lowering compares the stored text
 * exactly where the column would not:
 * - a column that declares a collation compares under `COLLATE "C"`, since a nondeterministic collation would make `=` ignore case or accents;
 * - a `citext` column compares its `text` cast, since `citext` equality ignores letter case;
 * - fixed-length `char(n)` fails closed: PostgreSQL ignores the trailing spaces it pads with, and the value read back keeps them.
 *
 * A `uuid` or enum column refuses a value it cannot hold with an error instead of comparing it, and a `uuid` reads
 * other spellings of a UUID, such as upper case, as the lower-case one it reads back. So the lowering leaves out of
 * each comparison every value such a column never reads back: on a `uuid` column every value but a lower-case UUID
 * in 8-4-4-4-12 groups, on an enum column every value it does not declare. The rest compare natively, so an index on
 * the column still serves them. With none left, the comparison lowers to a condition that matches no row, or for a
 * negated one every row that is not NULL, exactly as the text comparison of another database would; the predicate
 * itself is not changed, so no Allow becomes statically empty here. An enum column whose values TypeORM does not
 * declare compares its `text` cast.
 */
export class ApiAuthorizationIamPostgresLowerer extends ApiAuthorizationIamPortableLowerer {
	/**
	 * Lowers an Arn pattern with an anchored regular expression on the exact text expression of the column: `*` is
	 * `[^:]*`, `?` is `[^:]`, every ASCII punctuation character of a literal is escaped, and a literal `:` stays the
	 * delimiter, so the segment counts must be equal.
	 * @param {IApiAuthorizationIamPredicateArn} atom - `ARN` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerArn(atom: IApiAuthorizationIamPredicateArn): IApiAuthorizationIamPredicateLowered {
		const column: IApiAuthorizationIamColumn | undefined = atom.column.field.column;
		const expression: ((columnAlias: string) => string) | undefined = column?.family === EApiAuthorizationIamColumnFamily.TEXT && !column.hasTransformer ? this.readTextExpression(column) : undefined;

		if (!expression) {
			return { isExact: false };
		}

		const pattern: string = `^${atom.pattern.map((token: IApiAuthorizationIamToken): string => readIamPostgresRegexToken(token)).join("")}$`;
		const parameterName: string = this.createParameterName("arn", pattern);

		return { isExact: true, operand: Raw((columnAlias: string): string => `${expression(columnAlias)} ${atom.isNegated ? "!~" : "~"} :${parameterName}`, { [parameterName]: pattern }) };
	}

	/**
	 * Lowers a Date comparison: a `timestamptz` compares ISO UTC text, which no process time zone can move, a wall-clock
	 * `timestamp` a bound `Date`, which the driver writes in the process time zone it also reads the column in, and a
	 * `date` its calendar text.
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

		if (date.isCalendar) {
			return { isExact: false };
		}

		const isFiner: boolean = (column.precision ?? AUTHORIZATION_IAM_DIALECT_CONSTANT.POSTGRES_DEFAULT_PRECISION) > AUTHORIZATION_IAM_DIALECT_CONSTANT.MILLISECOND_DIGITS;

		if (column.type === "timestamptz" || column.type === "timestamp with time zone") {
			return this.lowerInstantCompare(atom, date, { isFiner, isWallClock: false, toParameter: (instant: Date): string => instant.toISOString() });
		}

		if (column.type === undefined || column.type === "timestamp" || column.type === "timestamp without time zone") {
			return this.lowerInstantCompare(atom, date, { isFiner, isWallClock: true, toParameter: (instant: Date): Date => instant });
		}

		return { isExact: false };
	}

	/**
	 * Lowers an IgnoreCase comparison: `lower` under `COLLATE "C"` folds A-Z and nothing else. CockroachDB has no such
	 * collation to rely on, and fixed-length text pads, so both fail closed.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `TEXT_IGNORE_CASE` comparison and folded values.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerIgnoreCaseIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		const column: IApiAuthorizationIamColumn | undefined = atom.column.field.column;

		if (column?.family !== EApiAuthorizationIamColumnFamily.TEXT || this.dialect.driverType === IAM_POSTGRES_LOWERER_COCKROACH_DRIVER_TYPE || (column.type !== undefined && AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.FIXED_LENGTH_TEXT_TYPES.has(column.type))) {
			return { isExact: false };
		}

		return this.createRawIn(atom, (columnAlias: string): string => (column.type === "citext" ? `lower(CAST(${columnAlias} AS text) COLLATE "C")` : `lower(${columnAlias} COLLATE "C")`));
	}

	/**
	 * Lowers a containment in a range on an `inet` or `cidr` column with `<<=`.
	 * @param {IApiAuthorizationIamPredicateIpContained} atom - `IP_CONTAINED` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerIpContained(atom: IApiAuthorizationIamPredicateIpContained): IApiAuthorizationIamPredicateLowered {
		const column: IApiAuthorizationIamColumn | undefined = atom.column.field.column;

		if (column?.family !== EApiAuthorizationIamColumnFamily.NETWORK || column.hasTransformer) {
			return { isExact: false };
		}

		const parameterName: string = this.createParameterName("ip", atom.range);

		return { isExact: true, operand: Raw((columnAlias: string): string => (atom.isNegated ? `NOT (${columnAlias} <<= CAST(:${parameterName} AS inet))` : `${columnAlias} <<= CAST(:${parameterName} AS inet)`), { [parameterName]: atom.range }) };
	}

	/**
	 * Lowers a glob with `LIKE`, positive or negated, on the exact text expression of the column.
	 * @param {IApiAuthorizationIamPredicateLike} atom - `LIKE` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerLike(atom: IApiAuthorizationIamPredicateLike): IApiAuthorizationIamPredicateLowered {
		const expression: ((columnAlias: string) => string) | undefined = this.isLikeColumn(atom) ? this.readTextExpression(atom.column.field.column) : undefined;

		return expression ? this.createRawLike(atom, expression) : { isExact: false };
	}

	/**
	 * Lowers a Numeric comparison by column type: the column coerces a text parameter, so a literal is never read through
	 * a double. An integer literal outside the column's range folds, since the column would refuse to bind it. A double
	 * and a real compare a literal their type holds exactly. `float` names a different type per server, and `money` reads
	 * back formatted, so both fail closed.
	 * @param {IApiAuthorizationIamPredicateCompare} atom - `COMPARE` atom with a `NUMERIC` comparison.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerNumericCompare(atom: IApiAuthorizationIamPredicateCompare): IApiAuthorizationIamPredicateLowered {
		const column: IApiAuthorizationIamColumn | undefined = atom.column.field.column;
		const decimal: IApiAuthorizationIamDecimal | undefined = ApiAuthorizationIamDecimal.parse(atom.value);

		if (!column || !decimal) {
			return { isExact: false };
		}

		const bits: number | undefined = this.readPostgresIntegerBits(column);

		if (bits !== undefined) {
			const compare: TApiAuthorizationIamIntegerCompare = this.foldIntegerRange(this.rewriteIntegerCompare(atom.operator, decimal), bits);

			return typeof compare === "string" ? this.createConstant(compare === "all") : this.createRawCompare(atom, compare.operator, compare.value.toString());
		}

		const text: string = ApiAuthorizationIamDecimal.toText(decimal);

		if (column.type === "numeric" || column.type === "decimal" || column.type === "dec") {
			return this.createRawCompare(atom, atom.operator, text);
		}

		if (column.type === "double precision" || column.type === "float8") {
			return this.isFloatExact(decimal, AUTHORIZATION_IAM_DIALECT_CONSTANT.DOUBLE_MAX_DIGITS, AUTHORIZATION_IAM_DIALECT_CONSTANT.DOUBLE_MIN_MAGNITUDE, AUTHORIZATION_IAM_DIALECT_CONSTANT.DOUBLE_MAX_MAGNITUDE) ? this.createRawCompare(atom, atom.operator, text) : { isExact: false };
		}

		if (column.type === "real" || column.type === "float4") {
			return this.isFloatExact(decimal, AUTHORIZATION_IAM_DIALECT_CONSTANT.REAL_MAX_DIGITS, AUTHORIZATION_IAM_DIALECT_CONSTANT.REAL_MIN_MAGNITUDE, AUTHORIZATION_IAM_DIALECT_CONSTANT.REAL_MAX_MAGNITUDE) ? this.createRawCompare(atom, atom.operator, text) : { isExact: false };
		}

		return { isExact: false };
	}

	/**
	 * Lowers a text comparison: native conditions on a plain text, `uuid` or declared enum column, SQL on the exact
	 * text expression otherwise.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `TEXT` comparison on a text, UUID or enum column.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerTextIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		const column: IApiAuthorizationIamColumn | undefined = atom.column.field.column;
		const isStored: ((value: TApiAuthorizationIamPredicateValue) => boolean) | undefined = this.readStoredValueCheck(column);

		if (isStored) {
			const values: Array<TApiAuthorizationIamPredicateValue> = atom.values.filter((value: TApiAuthorizationIamPredicateValue): boolean => isStored(value));

			if (values.length === 0) {
				// TypeORM writes an empty `In` as `0=1`; a NULL column is in neither set, as the atom says.
				return { isExact: true, operand: atom.isNegated ? Not(IsNull()) : In([]) };
			}

			return this.lowerNativeIn({ ...atom, values });
		}

		if (column?.family === EApiAuthorizationIamColumnFamily.ENUM) {
			return this.createRawIn(atom, readIamPostgresTextCast);
		}

		const expression: ((columnAlias: string) => string) | undefined = this.readTextExpression(column);

		if (!expression) {
			return { isExact: false };
		}

		return column?.collation === undefined && column?.type !== "citext" ? this.lowerNativeIn(atom) : this.createRawIn(atom, expression);
	}

	/**
	 * Reads the bits of an integer column as this server holds it: every integer of CockroachDB without a named size has 64.
	 * @param {IApiAuthorizationIamColumn} column - Column.
	 * @returns {number | undefined} The bits, or undefined when the column holds no integer.
	 */
	private readPostgresIntegerBits(column: IApiAuthorizationIamColumn): number | undefined {
		const bits: number | undefined = this.readIntegerBits(column);

		if (bits !== undefined && this.dialect.driverType === IAM_POSTGRES_LOWERER_COCKROACH_DRIVER_TYPE && (column.type === undefined || column.type === "int" || column.type === "integer")) {
			return AUTHORIZATION_IAM_DIALECT_CONSTANT.COCKROACH_INTEGER_BITS;
		}

		return bits;
	}

	/**
	 * Builds the check of which values a column can read back, for a column type that refuses the others.
	 * @param {IApiAuthorizationIamColumn | undefined} column - Column of the atom.
	 * @returns {((value: TApiAuthorizationIamPredicateValue) => boolean) | undefined} The check, or undefined when the column compares every text value.
	 */
	private readStoredValueCheck(column: IApiAuthorizationIamColumn | undefined): ((value: TApiAuthorizationIamPredicateValue) => boolean) | undefined {
		if (column?.family === EApiAuthorizationIamColumnFamily.UUID) {
			return (value: TApiAuthorizationIamPredicateValue): boolean => typeof value === "string" && AUTHORIZATION_IAM_DIALECT_CONSTANT.POSTGRES_CANONICAL_UUID_PATTERN.test(value);
		}

		if (column?.family === EApiAuthorizationIamColumnFamily.ENUM && column.enumValues !== undefined) {
			const members: ReadonlySet<string> = new Set<string>(column.enumValues);

			return (value: TApiAuthorizationIamPredicateValue): boolean => typeof value === "string" && members.has(value);
		}

		return undefined;
	}

	/**
	 * Builds the expression that compares a column's stored text code point by code point.
	 * @param {IApiAuthorizationIamColumn | undefined} column - Column of the atom.
	 * @returns {((columnAlias: string) => string) | undefined} The expression, or undefined when no expression compares the column exactly.
	 */
	private readTextExpression(column: IApiAuthorizationIamColumn | undefined): ((columnAlias: string) => string) | undefined {
		if (!column || (column.type !== undefined && AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.FIXED_LENGTH_TEXT_TYPES.has(column.type))) {
			return undefined;
		}

		const isCockroach: boolean = this.dialect.driverType === IAM_POSTGRES_LOWERER_COCKROACH_DRIVER_TYPE;

		if (column.type === "citext") {
			return isCockroach ? undefined : readIamPostgresTextCast;
		}

		if (column.collation !== undefined) {
			return isCockroach ? undefined : (columnAlias: string): string => `${columnAlias} COLLATE "C"`;
		}

		return readIamPostgresColumnAlias;
	}
}

/**
 * Reads a plain text column as itself.
 * @param {string} columnAlias - Column alias TypeORM passes.
 * @returns {string} The column alias.
 */
function readIamPostgresColumnAlias(columnAlias: string): string {
	return columnAlias;
}

/**
 * Writes one Arn pattern token as regular-expression text.
 * @param {IApiAuthorizationIamToken} token - Literal, `*` or `?` token.
 * @returns {string} Regular-expression text in which no literal can act as syntax.
 */
function readIamPostgresRegexToken(token: IApiAuthorizationIamToken): string {
	switch (token.type) {
		case EApiAuthorizationIamTokenType.LITERAL:
		// falls through

		case EApiAuthorizationIamTokenType.VARIABLE: {
			return (token.value ?? "").replaceAll(IAM_POSTGRES_LOWERER_REGEX_SPECIAL, String.raw`\$&`);
		}

		case EApiAuthorizationIamTokenType.QUESTION_MARK: {
			return "[^:]";
		}

		case EApiAuthorizationIamTokenType.STAR: {
			return "[^:]*";
		}
	}
}

/**
 * Reads a column as its `text` cast, which compares code point by code point and takes any value.
 * @param {string} columnAlias - Column alias TypeORM passes.
 * @returns {string} The cast.
 */
function readIamPostgresTextCast(columnAlias: string): string {
	return `CAST(${columnAlias} AS text)`;
}
