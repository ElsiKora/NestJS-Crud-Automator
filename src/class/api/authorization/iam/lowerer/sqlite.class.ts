import type { IApiAuthorizationIamPredicateIn, IApiAuthorizationIamPredicateLike, IApiAuthorizationIamPredicateLowered, IApiAuthorizationIamToken } from "@interface/class/api/authorization";

import { ApiAuthorizationIamPortableLowerer } from "@class/api/authorization/iam/lowerer/portable.class";
import { EApiAuthorizationIamTokenType } from "@enum/class/authorization";
import { Raw } from "typeorm";

// SQLite's default collation, which compares bytes.
const IAM_SQLITE_LOWERER_BINARY_COLLATION: string = "binary";

/**
 * Lowers the IAM predicate IR for the SQLite family. `=` compares bytes under the default `BINARY` collation, as
 * 5.1.0 compared it; a column that declares another collation, such as `NOCASE`, compares under `COLLATE BINARY`.
 * SQLite `LIKE` ignores ASCII letter case, so a glob lowers to `GLOB`, which compares bytes, with `*`, `?` and `[` of a
 * literal escaped as `[*]`, `[?]` and `[[]`.
 */
export class ApiAuthorizationIamSqliteLowerer extends ApiAuthorizationIamPortableLowerer {
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
		const parameterName: string = this.createParameterName("glob", pattern);

		return { isExact: true, operand: Raw((columnAlias: string): string => `${columnAlias} ${atom.isNegated ? "NOT GLOB" : "GLOB"} :${parameterName}`, { [parameterName]: pattern }) };
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
	 * Writes one glob token as SQLite `GLOB` text.
	 * @param {IApiAuthorizationIamToken} token - Literal, `*` or `?` token.
	 * @returns {string} `GLOB` text.
	 */
	private readGlobToken(token: IApiAuthorizationIamToken): string {
		switch (token.type) {
			case EApiAuthorizationIamTokenType.LITERAL:
			// falls through

			case EApiAuthorizationIamTokenType.VARIABLE: {
				return (token.value ?? "").replaceAll(/[*?[]/g, "[$&]");
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
