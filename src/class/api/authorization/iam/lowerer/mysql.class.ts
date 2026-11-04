import type { IApiAuthorizationIamPredicateIn, IApiAuthorizationIamPredicateLike, IApiAuthorizationIamPredicateLowered } from "@interface/class/api/authorization";

import { ApiAuthorizationIamPortableLowerer } from "@class/api/authorization/iam/lowerer/portable.class";

/**
 * Lowers the IAM predicate IR for MySQL and MariaDB. Their default collations ignore letter case and accents, and the
 * PAD SPACE ones trailing spaces, while the in-memory evaluator compares code points. So every text comparison
 * converts the column to `utf8mb4` and compares it under the server's NO PAD binary collation: `utf8mb4_0900_bin` on
 * MySQL, `utf8mb4_nopad_bin` on MariaDB. A server without that collation, or a connection whose charset is not
 * `utf8mb4`, which could not carry every bound character, has none in its dialect, and every text comparison fails closed.
 */
export class ApiAuthorizationIamMysqlLowerer extends ApiAuthorizationIamPortableLowerer {
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
	 * Lowers a text comparison under the binary collation.
	 * @param {IApiAuthorizationIamPredicateIn} atom - `IN` atom with a `TEXT` comparison on a text column.
	 * @returns {IApiAuthorizationIamPredicateLowered} The lowered atom.
	 */
	protected override lowerTextIn(atom: IApiAuthorizationIamPredicateIn): IApiAuthorizationIamPredicateLowered {
		const expression: ((columnAlias: string) => string) | undefined = this.readTextExpression();

		return expression ? this.createRawIn(atom, expression) : { isExact: false };
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
