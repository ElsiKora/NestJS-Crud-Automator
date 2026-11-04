import type { IApiAuthorizationIamColumn, IApiAuthorizationIamPredicateIn, IApiAuthorizationIamPredicateLike, IApiAuthorizationIamPredicateLowered } from "@interface/class/api/authorization";

import { ApiAuthorizationIamPortableLowerer } from "@class/api/authorization/iam/lowerer/portable.class";
import { AUTHORIZATION_IAM_COLUMN_FAMILY_CONSTANT } from "@constant/class/authorization";

// TypeORM driver type of CockroachDB, which shares the PostgreSQL lowering but has no `"C"` collation or `citext` cast to rely on.
const IAM_POSTGRES_LOWERER_COCKROACH_DRIVER_TYPE: string = "cockroachdb";

/**
 * Lowers the IAM predicate IR for PostgreSQL and CockroachDB. A text column with its default deterministic collation
 * compares code point by code point with `=` and `LIKE`, as 5.1.0 compared it. The lowering compares the stored text
 * exactly where the column would not:
 * - a column that declares a collation compares under `COLLATE "C"`, since a nondeterministic collation would make `=` ignore case or accents;
 * - a `citext` column compares its `text` cast, since `citext` equality ignores letter case;
 * - fixed-length `char(n)` fails closed: PostgreSQL ignores the trailing spaces it pads with, and the value read back keeps them.
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
	 * Lowers a text comparison: native conditions on a plain text column, SQL on the exact text expression otherwise.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `TEXT` comparison on a text column.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerTextIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		const column: IApiAuthorizationIamColumn | undefined = atom.column.field.column;
		const expression: ((columnAlias: string) => string) | undefined = this.readTextExpression(column);

		if (!expression) {
			return { isExact: false };
		}

		return column?.collation === undefined && column?.type !== "citext" ? this.lowerNativeIn(atom) : this.createRawIn(atom, expression);
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
			return isCockroach ? undefined : (columnAlias: string): string => `CAST(${columnAlias} AS text)`;
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
