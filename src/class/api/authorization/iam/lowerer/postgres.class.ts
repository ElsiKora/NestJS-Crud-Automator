import type { IApiAuthorizationIamColumn, IApiAuthorizationIamPredicateIn, IApiAuthorizationIamPredicateLike, IApiAuthorizationIamPredicateLowered } from "@interface/class/api/authorization";
import type { TApiAuthorizationIamPredicate, TApiAuthorizationIamPredicateAtom, TApiAuthorizationIamPredicateValue } from "@type/class/api/authorization/iam";

import { ApiAuthorizationIamPortableLowerer } from "@class/api/authorization/iam/lowerer/portable.class";
import { AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT, AUTHORIZATION_IAM_DIALECT_CONSTANT } from "@constant/class/authorization";
import { EApiAuthorizationIamColumnFamily, EApiAuthorizationIamPredicateComparison, EApiAuthorizationIamPredicateKind } from "@enum/class/authorization";

// TypeORM driver type of CockroachDB, which shares the PostgreSQL lowering but has no `"C"` collation or `citext` cast to rely on.
const IAM_POSTGRES_LOWERER_COCKROACH_DRIVER_TYPE: string = "cockroachdb";

/**
 * Lowers the IAM predicate IR for PostgreSQL and CockroachDB. A text column with its default deterministic collation
 * compares code point by code point with `=` and `LIKE`, as 5.1.0 compared it. The lowering compares the stored text
 * exactly where the column would not:
 * - a column that declares a collation compares under `COLLATE "C"`, since a nondeterministic collation would make `=` ignore case or accents;
 * - a `citext` column compares its `text` cast, since `citext` equality ignores letter case;
 * - fixed-length `char(n)` fails closed: PostgreSQL ignores the trailing spaces it pads with, and the value read back keeps them.
 *
 * A `uuid` or enum column refuses a value it cannot hold with an error instead of comparing it, and a `uuid` reads
 * other spellings of a UUID, such as upper case, as the lower-case one it reads back. So before the normal form a
 * value such a column never reads back is taken out of each comparison, which then holds for no row when none is
 * left: on a `uuid` column every value but a lower-case UUID in 8-4-4-4-12 groups, on an enum column every value it
 * does not declare. The rest compare natively, so an index on the column still serves them. An enum column whose
 * values TypeORM does not declare compares its `text` cast.
 */
export class ApiAuthorizationIamPostgresLowerer extends ApiAuthorizationIamPortableLowerer {
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
	 * Lowers a text comparison: native conditions on a plain text, `uuid` or declared enum column, SQL on the exact
	 * text expression otherwise.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `TEXT` comparison on a text, UUID or enum column.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerTextIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		const column: IApiAuthorizationIamColumn | undefined = atom.column.field.column;

		if (column?.family === EApiAuthorizationIamColumnFamily.ENUM) {
			return column.enumValues === undefined ? this.createRawIn(atom, readIamPostgresTextCast) : this.lowerNativeIn(atom);
		}

		if (column?.family === EApiAuthorizationIamColumnFamily.UUID) {
			return this.lowerNativeIn(atom);
		}

		const expression: ((columnAlias: string) => string) | undefined = this.readTextExpression(column);

		if (!expression) {
			return { isExact: false };
		}

		return column?.collation === undefined && column?.type !== "citext" ? this.lowerNativeIn(atom) : this.createRawIn(atom, expression);
	}

	/**
	 * Takes the values a `uuid` or declared enum column never reads back out of a text comparison on it: with none
	 * left, a positive comparison holds for no row, and a negated one for every row that is not NULL.
	 * @param {TApiAuthorizationIamPredicateAtom} atom - Atom.
	 * @returns {TApiAuthorizationIamPredicate} The atom, the atom with fewer values, `FALSE`, or `NOT_NULL` on its column.
	 */
	protected override refineAtom(atom: TApiAuthorizationIamPredicateAtom): TApiAuthorizationIamPredicate {
		if (atom.kind !== EApiAuthorizationIamPredicateKind.IN || atom.comparison !== EApiAuthorizationIamPredicateComparison.TEXT) {
			return atom;
		}

		const isStored: ((value: TApiAuthorizationIamPredicateValue) => boolean) | undefined = this.readStoredValueCheck(atom.column.field.column);

		if (!isStored) {
			return atom;
		}

		const values: Array<TApiAuthorizationIamPredicateValue> = atom.values.filter((value: TApiAuthorizationIamPredicateValue): boolean => isStored(value));

		if (values.length === atom.values.length) {
			return atom;
		}

		if (values.length > 0) {
			return { ...atom, values };
		}

		return atom.isNegated ? { column: atom.column, kind: EApiAuthorizationIamPredicateKind.NOT_NULL } : { kind: EApiAuthorizationIamPredicateKind.FALSE };
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
 * Reads a column as its `text` cast, which compares code point by code point and takes any value.
 * @param {string} columnAlias - Column alias TypeORM passes.
 * @returns {string} The cast.
 */
function readIamPostgresTextCast(columnAlias: string): string {
	return `CAST(${columnAlias} AS text)`;
}
