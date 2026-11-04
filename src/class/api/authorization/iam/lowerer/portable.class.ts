import type { IApiAuthorizationIamColumn, IApiAuthorizationIamDateValue, IApiAuthorizationIamDecimal, IApiAuthorizationIamDialect, IApiAuthorizationIamPredicateArn, IApiAuthorizationIamPredicateCompare, IApiAuthorizationIamPredicateIn, IApiAuthorizationIamPredicateIpContained, IApiAuthorizationIamPredicateLike, IApiAuthorizationIamPredicateLowered, IApiAuthorizationIamToken } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamIntegerCompare, TApiAuthorizationIamPredicate, TApiAuthorizationIamPredicateAtom, TApiAuthorizationIamPredicateValue } from "@type/class/api/authorization/iam";
import type { FindOptionsWhere } from "typeorm";

import { createHash } from "node:crypto";

import { ApiAuthorizationIamDateValue } from "@class/api/authorization/iam/date-value.class";
import { ApiAuthorizationIamDecimal } from "@class/api/authorization/iam/decimal.class";
import { ApiAuthorizationIamPredicateBuilder } from "@class/api/authorization/iam/predicate/builder.class";
import { ApiAuthorizationIamPredicateNormalForm } from "@class/api/authorization/iam/predicate/normal-form.class";
import { AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT, AUTHORIZATION_IAM_DIALECT_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamDialect, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind, EApiAuthorizationIamPredicateOperator, EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { And, Equal, FindOperator, In, IsNull, LessThan, LessThanOrEqual, MoreThan, MoreThanOrEqual, Not, Raw } from "typeorm";

// Column families a resource placeholder compares natively: SQL compares their values, which the rendered text names.
const IAM_LOWERER_NATIVE_FAMILIES: ReadonlySet<EApiAuthorizationIamColumnFamily> = new Set<EApiAuthorizationIamColumnFamily>([EApiAuthorizationIamColumnFamily.DATE, EApiAuthorizationIamColumnFamily.NUMERIC]);

// Length of the hash in a parameter name: 96 bits, so two different values never share a name in practice.
const IAM_LOWERER_PARAMETER_HASH_LENGTH: number = 24;

// SQL of each comparison.
const IAM_LOWERER_OPERATOR_SQL: ReadonlyMap<EApiAuthorizationIamPredicateOperator, string> = new Map<EApiAuthorizationIamPredicateOperator, string>([
	[EApiAuthorizationIamPredicateOperator.EQUAL, "="],
	[EApiAuthorizationIamPredicateOperator.GREATER_THAN, ">"],
	[EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL, ">="],
	[EApiAuthorizationIamPredicateOperator.LESS_THAN, "<"],
	[EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL, "<="],
	[EApiAuthorizationIamPredicateOperator.NOT_EQUAL, "<>"],
]);

// Bits of an integer column whose decorator names no type: TypeORM creates a 32-bit integer for a `number` property.
const IAM_LOWERER_DEFAULT_INTEGER_BITS: number = 32;

const IAM_LOWERER_BIGINT_ZERO: bigint = 0n;

const IAM_LOWERER_BIGINT_ONE: bigint = 1n;

// Milliseconds of a second.
const IAM_LOWERER_MILLISECONDS: number = 1000;

// The base of a decimal.
const IAM_LOWERER_DECIMAL_BASE: number = 10;

/**
 * Lowers the IAM predicate IR to TypeORM `where` branches for a database whose dialect has no lowering of its own.
 * It emits only what every SQL database evaluates alike, which is what 5.1.0 emitted: equality, `IN`, `IS NULL`, and a
 * negated `LIKE` with an explicit `ESCAPE`, and of the operators added since, an integer comparison with a literal in
 * the column's range. Every other atom is not exact here, and an atom that is not exact fails the whole scope closed: a
 * Deny then denies the request and an Allow grants nothing. It never approximates.
 *
 * A dialect lowerer extends it and replaces the lowering of the atoms its database compares differently; the normal
 * form, the branch accounting and the WHERE building stay here.
 */
export class ApiAuthorizationIamPortableLowerer {
	public constructor(protected readonly dialect: IApiAuthorizationIamDialect) {}

	/**
	 * Lowers a predicate to `where` branches.
	 * @template E - Entity type.
	 * @param {TApiAuthorizationIamPredicate} predicate - Predicate.
	 * @param {number} maxBranches - Most branches the result may hold.
	 * @returns {{ branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean }} The OR branches (one empty branch for every row, none for no row), or a non-compilable result when the branches exceed the cap or an atom is not exact.
	 */
	public lower<E>(predicate: TApiAuthorizationIamPredicate, maxBranches: number): { branches?: Array<FindOptionsWhere<E>>; isCompilable: boolean } {
		const atomBranches: Array<Array<TApiAuthorizationIamPredicateAtom>> | undefined = ApiAuthorizationIamPredicateNormalForm.toBranches(predicate, maxBranches);

		if (!atomBranches) {
			return { isCompilable: false };
		}

		const branches: Array<FindOptionsWhere<E>> = [];

		for (const atomBranch of atomBranches) {
			const conditions: Array<[string, unknown]> = [];

			for (const atom of atomBranch) {
				const lowered: IApiAuthorizationIamPredicateLowered = this.lowerAtom(atom);

				if (!lowered.isExact) {
					return { isCompilable: false };
				}

				conditions.push([atom.column.queryPath, lowered.operand]);
			}

			branches.push(this.createBranchWhere<E>(conditions));
		}

		return { branches, isCompilable: true };
	}

	/**
	 * Lowers a comparison whose result does not depend on the row beyond its being NULL: every non-NULL row or no row.
	 * TypeORM writes an empty `In` as `0=1`; a NULL column is in neither set, as an atom says.
	 * @param {boolean} isAll - Whether every non-NULL row holds.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected createConstant(isAll: boolean): IApiAuthorizationIamPredicateLowered {
		return { isExact: true, operand: isAll ? Not(IsNull()) : In([]) };
	}

	/**
	 * Names a bound parameter after a hash of the dialect, the purpose and the value, so equal values share one name
	 * and different values never collide when TypeORM merges the parameters of every branch.
	 * @param {string} purpose - What the parameter binds, such as `in` or `like`.
	 * @param {unknown} value - Bound value.
	 * @returns {string} Parameter name.
	 */
	protected createParameterName(purpose: string, value: unknown): string {
		return `iam${createHash("sha256")
			.update(JSON.stringify([this.dialect.type, purpose, value]))
			.digest("hex")
			.slice(0, IAM_LOWERER_PARAMETER_HASH_LENGTH)}`;
	}

	/**
	 * Lowers an order comparison with SQL: the column expression, the operator, and the bound value. `Raw` bypasses a
	 * TypeORM value transformer, so a column that declares one is not exact here. The parameter is named after the column
	 * too, because PostgreSQL deduces one type per parameter, and one value may compare with columns of several types.
	 * @param {IApiAuthorizationIamPredicateCompare} atom - `COMPARE` atom.
	 * @param {EApiAuthorizationIamPredicateOperator} operator - Comparison, after any rewrite of the literal.
	 * @param {unknown} value - Bound value; never a BigInt, which no driver binds alike.
	 * @param {object} [sql] - SQL around the two sides.
	 * @param {(columnAlias: string) => string} [sql.expression] - Builds the compared expression from the column alias TypeORM passes.
	 * @param {(parameter: string) => string} [sql.parameter] - Builds the compared value from the parameter placeholder.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected createRawCompare(atom: IApiAuthorizationIamPredicateCompare, operator: EApiAuthorizationIamPredicateOperator, value: unknown, sql: { expression?: (columnAlias: string) => string; parameter?: (parameter: string) => string } = {}): IApiAuthorizationIamPredicateLowered {
		if (atom.column.field.column?.hasTransformer !== false) {
			return { isExact: false };
		}

		const parameterName: string = this.createCompareParameterName(atom, value);
		const expression: (columnAlias: string) => string = sql.expression ?? ((columnAlias: string): string => columnAlias);
		const parameter: string = sql.parameter ? sql.parameter(`:${parameterName}`) : `:${parameterName}`;

		return { isExact: true, operand: Raw((columnAlias: string): string => `${expression(columnAlias)} ${IAM_LOWERER_OPERATOR_SQL.get(operator) ?? "="} ${parameter}`, { [parameterName]: value }) };
	}

	/**
	 * Lowers a comparison with SQL built around the column expression, for a dialect that must wrap the column: the
	 * values bind as one parameter, and NULL is in neither set, as the atom says. `Raw` bypasses a TypeORM value
	 * transformer, so a column that declares one is not exact here.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom.
	 * @param {(columnAlias: string) => string} expression - Builds the compared expression from the column alias TypeORM passes.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected createRawIn(atom: IApiAuthorizationIamPredicateIn, expression: (columnAlias: string) => string): IApiAuthorizationIamPredicateLowered {
		if (atom.column.field.column?.hasTransformer !== false) {
			return { isExact: false };
		}

		const parameterName: string = this.createParameterName("in", atom.values);

		if (atom.values.length === 1) {
			return { isExact: true, operand: Raw((columnAlias: string): string => `${expression(columnAlias)} ${atom.isNegated ? "<>" : "="} :${parameterName}`, { [parameterName]: atom.values[0] }) };
		}

		return { isExact: true, operand: Raw((columnAlias: string): string => `${expression(columnAlias)} ${atom.isNegated ? "NOT IN" : "IN"} (:...${parameterName})`, { [parameterName]: [...atom.values] }) };
	}

	/**
	 * Lowers a glob with SQL `LIKE` and an explicit `ESCAPE '!'`, because databases disagree on the default escape
	 * character: `*` becomes `%`, `?` becomes `_`, and `!`, `%` and `_` of a literal are escaped. `Raw` bypasses a
	 * TypeORM value transformer, so a column that declares one is not exact here.
	 * @param {IApiAuthorizationIamPredicateLike} atom - `LIKE` atom.
	 * @param {(columnAlias: string) => string} expression - Builds the compared expression from the column alias TypeORM passes.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected createRawLike(atom: IApiAuthorizationIamPredicateLike, expression: (columnAlias: string) => string): IApiAuthorizationIamPredicateLowered {
		if (atom.column.field.column?.hasTransformer !== false) {
			return { isExact: false };
		}

		const pattern: string = atom.pattern.map((token: IApiAuthorizationIamToken): string => this.readLikeToken(token)).join("");
		const parameterName: string = this.createParameterName("like", pattern);

		return { isExact: true, operand: Raw((columnAlias: string): string => `${expression(columnAlias)} ${atom.isNegated ? "NOT LIKE" : "LIKE"} :${parameterName} ESCAPE '!'`, { [parameterName]: pattern }) };
	}

	/**
	 * Folds an integer comparison whose value lies outside the column's range, which the database would refuse to bind.
	 * @param {TApiAuthorizationIamIntegerCompare} compare - The rewritten comparison.
	 * @param {number} bits - Bits of the column.
	 * @returns {TApiAuthorizationIamIntegerCompare} The comparison, or what it holds for when the value lies outside the range.
	 */
	protected foldIntegerRange(compare: TApiAuthorizationIamIntegerCompare, bits: number): TApiAuthorizationIamIntegerCompare {
		if (typeof compare === "string") {
			return compare;
		}

		const limit: bigint = IAM_LOWERER_BIGINT_ONE << BigInt(bits - 1);

		if (compare.value >= -limit && compare.value < limit) {
			return compare;
		}

		const isAbove: boolean = compare.value >= limit;

		switch (compare.operator) {
			case EApiAuthorizationIamPredicateOperator.EQUAL: {
				return "none";
			}

			case EApiAuthorizationIamPredicateOperator.GREATER_THAN:
			// falls through

			case EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL: {
				return isAbove ? "none" : "all";
			}

			case EApiAuthorizationIamPredicateOperator.LESS_THAN:
			// falls through

			case EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL: {
				return isAbove ? "all" : "none";
			}

			case EApiAuthorizationIamPredicateOperator.NOT_EQUAL: {
				return "all";
			}
		}
	}

	/**
	 * Tells whether a floating-point type holds a decimal exactly enough that the column and memory order it alike: it has
	 * at most so many significant digits, and its magnitude is zero or within a range the type holds without losing any.
	 * @param {IApiAuthorizationIamDecimal} decimal - Literal.
	 * @param {number} maxDigits - Significant digits the type compares exactly.
	 * @param {string} minimum - Smallest magnitude, as decimal text.
	 * @param {string} maximum - Largest magnitude, as decimal text.
	 * @returns {boolean} Whether the type holds the literal.
	 */
	protected isFloatExact(decimal: IApiAuthorizationIamDecimal, maxDigits: number, minimum: string, maximum: string): boolean {
		if (decimal.unscaled === IAM_LOWERER_BIGINT_ZERO) {
			return true;
		}

		const magnitude: IApiAuthorizationIamDecimal = { scale: decimal.scale, unscaled: decimal.unscaled < IAM_LOWERER_BIGINT_ZERO ? -decimal.unscaled : decimal.unscaled };
		const lower: IApiAuthorizationIamDecimal | undefined = ApiAuthorizationIamDecimal.parse(minimum);
		const upper: IApiAuthorizationIamDecimal | undefined = ApiAuthorizationIamDecimal.parse(maximum);

		return ApiAuthorizationIamDecimal.countSignificantDigits(decimal) <= maxDigits && lower !== undefined && upper !== undefined && ApiAuthorizationIamDecimal.compare(magnitude, lower) >= 0 && ApiAuthorizationIamDecimal.compare(magnitude, upper) <= 0;
	}

	/**
	 * Tells whether a `LIKE` atom reads a column that holds text a glob can match: a text column, not a UUID or an enum.
	 * @param {IApiAuthorizationIamPredicateLike} atom - `LIKE` atom.
	 * @returns {boolean} Whether the column is a text column.
	 */
	protected isLikeColumn(atom: IApiAuthorizationIamPredicateLike): boolean {
		return !atom.column.field.isBoolean && atom.column.field.column?.family === EApiAuthorizationIamColumnFamily.TEXT;
	}

	/**
	 * Tells whether an instant needs more fraction digits than a column holds, so no value of the column can equal it.
	 * @param {IApiAuthorizationIamDateValue} date - The literal instant.
	 * @param {number} digits - Fraction digits the column holds.
	 * @returns {boolean} Whether the literal is more precise than the column.
	 */
	protected isMorePrecise(date: IApiAuthorizationIamDateValue, digits: number): boolean {
		return digits < AUTHORIZATION_IAM_DIALECT_CONSTANT.MILLISECOND_DIGITS && ((date.epoch % IAM_LOWERER_MILLISECONDS) + IAM_LOWERER_MILLISECONDS) % IAM_LOWERER_DECIMAL_BASE ** (AUTHORIZATION_IAM_DIALECT_CONSTANT.MILLISECOND_DIGITS - digits) !== 0;
	}

	/**
	 * Lowers an Arn pattern. No portable SQL matches one segment by segment.
	 * @param {IApiAuthorizationIamPredicateArn} _atom - `ARN` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} A result that is not exact.
	 */
	protected lowerArn(_atom: IApiAuthorizationIamPredicateArn): IApiAuthorizationIamPredicateLowered {
		return { isExact: false };
	}

	/**
	 * Lowers a boolean comparison: TypeORM binds the boolean in each driver's stored form (`1`/`0` on SQLite and MySQL).
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `BOOLEAN` comparison.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected lowerBooleanIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		return atom.column.field.isBoolean && atom.values.every((value: TApiAuthorizationIamPredicateValue): boolean => typeof value === "boolean") ? this.lowerNativeIn(atom) : { isExact: false };
	}

	/**
	 * Lowers a Date comparison. No portable SQL compares a date alike on every database.
	 * @param {IApiAuthorizationIamPredicateCompare} _atom - `COMPARE` atom with a `DATE` comparison.
	 * @returns {IApiAuthorizationIamPredicateLowered} A result that is not exact.
	 */
	protected lowerDateCompare(_atom: IApiAuthorizationIamPredicateCompare): IApiAuthorizationIamPredicateLowered {
		return { isExact: false };
	}

	/**
	 * Lowers a case-insensitive comparison. No portable SQL folds only A-Z.
	 * @param {IApiAuthorizationIamPredicateIn} _atom - `IN` atom with a `TEXT_IGNORE_CASE` comparison.
	 * @returns {IApiAuthorizationIamPredicateLowered} A result that is not exact.
	 */
	protected lowerIgnoreCaseIn(_atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		return { isExact: false };
	}

	/**
	 * Lowers a comparison of an instant. A column finer than the milliseconds a value reads back with holds instants memory
	 * floors, so it compares against the floored literal: `> L` is `>= L+1ms`, `<= L` is `< L+1ms`, and `= L` is the
	 * millisecond starting at L. A wall-clock column cannot tell the second occurrence of a repeated hour from the
	 * first, so such a literal fails closed.
	 * @param {IApiAuthorizationIamPredicateCompare} atom - `COMPARE` atom with a `DATE` comparison.
	 * @param {IApiAuthorizationIamDateValue} date - The literal instant.
	 * @param {object} options - How the column compares.
	 * @param {boolean} options.isFiner - Whether the column holds more than milliseconds.
	 * @param {boolean} options.isWallClock - Whether the column holds a local date and time with no zone.
	 * @param {(instant: Date) => unknown} options.toParameter - Builds the bound value of an instant.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected lowerInstantCompare(atom: IApiAuthorizationIamPredicateCompare, date: IApiAuthorizationIamDateValue, options: { isFiner: boolean; isWallClock: boolean; toParameter: (instant: Date) => unknown }): IApiAuthorizationIamPredicateLowered {
		const instant: Date = new Date(date.epoch);

		if (options.isWallClock && ApiAuthorizationIamDateValue.isRepeatedHour(instant)) {
			return { isExact: false };
		}

		if (!options.isFiner || atom.operator === EApiAuthorizationIamPredicateOperator.LESS_THAN || atom.operator === EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL) {
			return this.createRawCompare(atom, atom.operator, options.toParameter(instant));
		}

		const next: IApiAuthorizationIamDateValue | undefined = ApiAuthorizationIamDateValue.parse(new Date(date.epoch + 1));

		if (!next || (options.isWallClock && ApiAuthorizationIamDateValue.isRepeatedHour(new Date(next.epoch)))) {
			return { isExact: false };
		}

		const nextParameter: unknown = options.toParameter(new Date(next.epoch));

		switch (atom.operator) {
			case EApiAuthorizationIamPredicateOperator.EQUAL: {
				return this.createRawRange(atom, options.toParameter(instant), nextParameter, false);
			}

			case EApiAuthorizationIamPredicateOperator.GREATER_THAN: {
				return this.createRawCompare(atom, EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL, nextParameter);
			}

			case EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL: {
				return this.createRawCompare(atom, EApiAuthorizationIamPredicateOperator.LESS_THAN, nextParameter);
			}

			case EApiAuthorizationIamPredicateOperator.NOT_EQUAL: {
				return this.createRawRange(atom, options.toParameter(instant), nextParameter, true);
			}
		}
	}

	/**
	 * Lowers a containment in a network range. Only PostgreSQL holds networks.
	 * @param {IApiAuthorizationIamPredicateIpContained} _atom - `IP_CONTAINED` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} A result that is not exact.
	 */
	protected lowerIpContained(_atom: IApiAuthorizationIamPredicateIpContained): IApiAuthorizationIamPredicateLowered {
		return { isExact: false };
	}

	/**
	 * Lowers a glob on text. A portable `LIKE` follows the column collation, which may ignore letter case, so a
	 * negated one can only hide more rows than the glob says, and a positive one could show more: only the negated one
	 * of a resource pattern lowers. A condition key must agree with memory in both directions, so its glob does not.
	 * @param {IApiAuthorizationIamPredicateLike} atom - `LIKE` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected lowerLike(atom: IApiAuthorizationIamPredicateLike): IApiAuthorizationIamPredicateLowered {
		return atom.isNegated && atom.isConditionKey !== true && this.isLikeColumn(atom) ? this.createRawLike(atom, (columnAlias: string): string => columnAlias) : { isExact: false };
	}

	/**
	 * Lowers an `IN` atom with the column's own TypeORM conditions: a plain value for one value, so the scope
	 * normalization converts it to the column type as before, `Not(Equal())`, `In()` or `Not(In())` otherwise.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected lowerNativeIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		if (atom.values.length === 1) {
			return { isExact: true, operand: atom.isNegated ? Not(Equal(atom.values[0])) : atom.values[0] };
		}

		return { isExact: true, operand: atom.isNegated ? Not(In([...atom.values])) : In([...atom.values]) };
	}

	/**
	 * Lowers a Numeric comparison on an integer column, the one numeric type every database orders alike, with a literal
	 * its type holds, as a number bound in the column's own terms.
	 * @param {IApiAuthorizationIamPredicateCompare} atom - `COMPARE` atom with a `NUMERIC` comparison.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected lowerNumericCompare(atom: IApiAuthorizationIamPredicateCompare): IApiAuthorizationIamPredicateLowered {
		const column: IApiAuthorizationIamColumn | undefined = atom.column.field.column;
		const decimal: IApiAuthorizationIamDecimal | undefined = ApiAuthorizationIamDecimal.parse(atom.value);
		const bits: number | undefined = column ? this.readIntegerBits(column) : undefined;

		if (!decimal || bits === undefined) {
			return { isExact: false };
		}

		const rewritten: TApiAuthorizationIamIntegerCompare = this.rewriteIntegerCompare(atom.operator, decimal);

		if (typeof rewritten === "string") {
			return this.createConstant(rewritten === "all");
		}

		const limit: bigint = IAM_LOWERER_BIGINT_ONE << BigInt(bits - 1);
		const value: number = Number(rewritten.value);

		if (rewritten.value < -limit || rewritten.value >= limit || !Number.isSafeInteger(value)) {
			return { isExact: false };
		}

		return { isExact: true, operand: this.createNativeCompare(rewritten.operator, value) };
	}

	/**
	 * Lowers a text comparison. Portable SQL compares with the column collation; the dialect-free lowering keeps the
	 * equality 5.1.0 used.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `TEXT` comparison on a text column.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected lowerTextIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		return this.lowerNativeIn(atom);
	}

	/**
	 * Reads the bits of a signed integer column.
	 * @param {IApiAuthorizationIamColumn} column - Column.
	 * @returns {number | undefined} The bits, or undefined when the column holds no integer.
	 */
	protected readIntegerBits(column: IApiAuthorizationIamColumn): number | undefined {
		if (column.family !== EApiAuthorizationIamColumnFamily.NUMERIC) {
			return undefined;
		}

		return column.type === undefined ? IAM_LOWERER_DEFAULT_INTEGER_BITS : AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT.INTEGER_BITS.get(column.type);
	}

	/**
	 * Rewrites a comparison of an integer column with a literal that may hold a fraction, exactly: `c < 1.5` is `c < 2`,
	 * `c <= 1.5` is `c <= 1`, `c > 1.5` is `c > 1`, `c >= 1.5` is `c >= 2`, and `= 1.5` holds for no row.
	 * @param {EApiAuthorizationIamPredicateOperator} operator - Comparison.
	 * @param {IApiAuthorizationIamDecimal} decimal - Literal.
	 * @returns {TApiAuthorizationIamIntegerCompare} What the comparison lowers to.
	 */
	protected rewriteIntegerCompare(operator: EApiAuthorizationIamPredicateOperator, decimal: IApiAuthorizationIamDecimal): TApiAuthorizationIamIntegerCompare {
		if (ApiAuthorizationIamDecimal.isInteger(decimal)) {
			return { operator, value: decimal.unscaled };
		}

		switch (operator) {
			case EApiAuthorizationIamPredicateOperator.EQUAL: {
				return "none";
			}

			case EApiAuthorizationIamPredicateOperator.GREATER_THAN:
			// falls through

			case EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL: {
				return { operator, value: ApiAuthorizationIamDecimal.floor(decimal) };
			}

			case EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL:
			// falls through

			case EApiAuthorizationIamPredicateOperator.LESS_THAN: {
				return { operator, value: ApiAuthorizationIamDecimal.ceil(decimal) };
			}

			case EApiAuthorizationIamPredicateOperator.NOT_EQUAL: {
				return "all";
			}
		}
	}

	/**
	 * Writes a condition at a nested query path of a WHERE branch.
	 * @param {Record<string, unknown>} where - WHERE branch.
	 * @param {string} queryPath - Entity query path such as `status` or `operator.id`.
	 * @param {unknown} value - Value or find operator.
	 */
	private assignWhereValue(where: Record<string, unknown>, queryPath: string, value: unknown): void {
		const pathSegments: Array<string> = queryPath.split(".").filter(Boolean);
		const lastSegment: string | undefined = pathSegments.at(-1);

		if (!lastSegment) {
			return;
		}

		let currentValue: Record<string, unknown> = where;

		for (const segment of pathSegments.slice(0, -1)) {
			const next: unknown = currentValue[segment];

			if (!next || typeof next !== "object" || Array.isArray(next) || next instanceof FindOperator) {
				currentValue[segment] = {};
			}

			currentValue = currentValue[segment] as Record<string, unknown>;
		}

		currentValue[lastSegment] = value;
	}

	/**
	 * Builds one WHERE branch from the column conditions it ANDs. Conditions on one query path combine with `And`; a
	 * plain value becomes `Equal` only when it meets another condition.
	 * @template E - Entity type.
	 * @param {Array<[string, unknown]>} conditions - Query paths with their values or find operators.
	 * @returns {FindOptionsWhere<E>} WHERE branch.
	 */
	private createBranchWhere<E>(conditions: Array<[string, unknown]>): FindOptionsWhere<E> {
		const pathConditions: Map<string, Array<unknown>> = new Map<string, Array<unknown>>();

		for (const [queryPath, value] of conditions) {
			pathConditions.set(queryPath, [...(pathConditions.get(queryPath) ?? []), value]);
		}

		const where: Record<string, unknown> = {};

		for (const [queryPath, values] of pathConditions) {
			const operand: unknown = values.length === 1 ? values[0] : And(...values.map((value: unknown): FindOperator<unknown> => (value instanceof FindOperator ? (value as FindOperator<unknown>) : Equal(value))));

			this.assignWhereValue(where, queryPath, operand);
		}

		return where as FindOptionsWhere<E>;
	}

	/**
	 * Names the bound parameter of a comparison.
	 * @param {IApiAuthorizationIamPredicateCompare} atom - `COMPARE` atom.
	 * @param {unknown} value - Bound value.
	 * @returns {string} Parameter name.
	 */
	private createCompareParameterName(atom: IApiAuthorizationIamPredicateCompare, value: unknown): string {
		return this.createParameterName(`compare:${atom.comparison}:${atom.column.queryPath}`, value);
	}

	/**
	 * Builds the TypeORM condition of a comparison the column binds in its own terms.
	 * @param {EApiAuthorizationIamPredicateOperator} operator - Comparison.
	 * @param {number} value - Value.
	 * @returns {FindOperator<number>} The condition.
	 */
	private createNativeCompare(operator: EApiAuthorizationIamPredicateOperator, value: number): FindOperator<number> {
		switch (operator) {
			case EApiAuthorizationIamPredicateOperator.EQUAL: {
				return Equal(value);
			}

			case EApiAuthorizationIamPredicateOperator.GREATER_THAN: {
				return MoreThan(value);
			}

			case EApiAuthorizationIamPredicateOperator.GREATER_THAN_EQUAL: {
				return MoreThanOrEqual(value);
			}

			case EApiAuthorizationIamPredicateOperator.LESS_THAN: {
				return LessThan(value);
			}

			case EApiAuthorizationIamPredicateOperator.LESS_THAN_EQUAL: {
				return LessThanOrEqual(value);
			}

			case EApiAuthorizationIamPredicateOperator.NOT_EQUAL: {
				return Not(Equal(value));
			}
		}
	}

	/**
	 * Lowers the half-open range of one millisecond, or everything outside it.
	 * @param {IApiAuthorizationIamPredicateCompare} atom - `COMPARE` atom.
	 * @param {unknown} start - Bound start, inclusive.
	 * @param {unknown} end - Bound end, exclusive.
	 * @param {boolean} isOutside - Whether the column must lie outside the range.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	private createRawRange(atom: IApiAuthorizationIamPredicateCompare, start: unknown, end: unknown, isOutside: boolean): IApiAuthorizationIamPredicateLowered {
		if (atom.column.field.column?.hasTransformer !== false) {
			return { isExact: false };
		}

		const startName: string = this.createCompareParameterName(atom, start);
		const endName: string = this.createCompareParameterName(atom, end);

		return {
			isExact: true,
			operand: Raw((columnAlias: string): string => (isOutside ? `(${columnAlias} < :${startName} OR ${columnAlias} >= :${endName})` : `(${columnAlias} >= :${startName} AND ${columnAlias} < :${endName})`), { [endName]: end, [startName]: start }),
		};
	}

	/**
	 * Lowers one atom. A text comparison needs a text column: on a numeric or date column SQL compares by value and the
	 * in-memory evaluator by text, so the two disagree and the atom is not exact. A native comparison, which only the
	 * `fails` of an exact resource placeholder holds, lowers only negated and only on a numeric or date column: SQL may
	 * then keep fewer rows than the text comparison would, never more. An unresolved dialect lowers no atom.
	 * @param {TApiAuthorizationIamPredicateAtom} atom - Atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	private lowerAtom(atom: TApiAuthorizationIamPredicateAtom): IApiAuthorizationIamPredicateLowered {
		if (this.dialect.type === EApiAuthorizationIamDialect.UNRESOLVED) {
			return { isExact: false };
		}

		switch (atom.kind) {
			case EApiAuthorizationIamPredicateKind.ARN: {
				return this.lowerArn(atom);
			}

			case EApiAuthorizationIamPredicateKind.COMPARE: {
				return atom.comparison === EApiAuthorizationIamPredicateComparison.DATE ? this.lowerDateCompare(atom) : this.lowerNumericCompare(atom);
			}

			case EApiAuthorizationIamPredicateKind.IN: {
				return this.lowerInAtom(atom);
			}

			case EApiAuthorizationIamPredicateKind.IP_CONTAINED: {
				return this.lowerIpContained(atom);
			}

			case EApiAuthorizationIamPredicateKind.IS_NULL: {
				return { isExact: true, operand: IsNull() };
			}

			case EApiAuthorizationIamPredicateKind.LIKE: {
				return this.lowerLike(atom);
			}

			case EApiAuthorizationIamPredicateKind.NOT_NULL: {
				return { isExact: true, operand: Not(IsNull()) };
			}

			default: {
				return { isExact: false };
			}
		}
	}

	/**
	 * Lowers one `IN` atom by what it compares.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	private lowerInAtom(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		switch (atom.comparison) {
			case EApiAuthorizationIamPredicateComparison.BOOLEAN: {
				return this.lowerBooleanIn(atom);
			}

			case EApiAuthorizationIamPredicateComparison.DATE:
			// falls through

			case EApiAuthorizationIamPredicateComparison.NUMERIC: {
				return { isExact: false };
			}

			case EApiAuthorizationIamPredicateComparison.NATIVE: {
				return atom.isNegated && atom.column.field.column !== undefined && IAM_LOWERER_NATIVE_FAMILIES.has(atom.column.field.column.family) ? this.lowerNativeIn(atom) : { isExact: false };
			}

			case EApiAuthorizationIamPredicateComparison.TEXT: {
				return ApiAuthorizationIamPredicateBuilder.isTextColumn(atom.column.field) ? this.lowerTextIn(atom) : { isExact: false };
			}

			case EApiAuthorizationIamPredicateComparison.TEXT_IGNORE_CASE: {
				return this.lowerIgnoreCaseIn(atom);
			}
		}
	}

	/**
	 * Writes one glob token as SQL `LIKE` text.
	 * @param {IApiAuthorizationIamToken} token - Literal, `*` or `?` token.
	 * @returns {string} `LIKE` text.
	 */
	private readLikeToken(token: IApiAuthorizationIamToken): string {
		switch (token.type) {
			case EApiAuthorizationIamTokenType.LITERAL:
			// falls through

			case EApiAuthorizationIamTokenType.VARIABLE: {
				return (token.value ?? "").replaceAll(/[!%_]/g, "!$&");
			}

			case EApiAuthorizationIamTokenType.QUESTION_MARK: {
				return "_";
			}

			case EApiAuthorizationIamTokenType.STAR: {
				return "%";
			}
		}
	}
}
