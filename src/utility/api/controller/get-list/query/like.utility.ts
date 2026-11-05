import type { FindOperator } from "typeorm";

import { createHash } from "node:crypto";

import { DATABASE_DRIVER_TYPE_CONSTANT } from "@constant/database-driver-type.constant";
import { ILike, Like, Raw } from "typeorm";

// Characters a LIKE pattern reads as a wildcard or as its escape character when the database escapes with a backslash.
const BACKSLASH_LIKE_SPECIAL_PATTERN: RegExp = /[%\\_]/g;

// The escape character of the pattern a driver without a default escape character compares, named in its ESCAPE clause.
const ESCAPE_CLAUSE_CHARACTER: string = "!";

// Characters that pattern reads as a wildcard or as its escape character.
const ESCAPE_CLAUSE_SPECIAL_PATTERN: RegExp = /[!%_]/g;

// Length of the hash in a parameter name: 96 bits, so two different patterns never share a name in practice.
const PARAMETER_HASH_LENGTH: number = 24;

/**
 * Builds the TypeORM condition of a LIKE family GET_LIST filter, in which the client text matches itself: `%`, `_` and `\` are no wildcards and no escape character. Only the wildcards the operator adds before or after the text match any characters.
 * PostgreSQL, MySQL and MariaDB escape a LIKE pattern with a backslash by default, so the condition stays an ordinary TypeORM `Like` or `ILike` with an escaped pattern. Any other driver, SQLite among them, has no default escape character, so the condition names one in an `ESCAPE` clause, the way TypeORM writes `ILike` for it: `UPPER(column) LIKE UPPER(value)`. The client text is bound as a parameter either way.
 * @param {string} text - Client text of the filter.
 * @param {object} shape - What the operator adds around the text and how it compares.
 * @param {boolean} shape.hasLeadingWildcard - Whether any characters may come before the text, as in `cont` and `ends`.
 * @param {boolean} shape.hasTrailingWildcard - Whether any characters may come after the text, as in `cont` and `starts`.
 * @param {boolean} shape.isCaseInsensitive - Whether the comparison ignores letter case, as `ILike` does.
 * @param {string} [driverType] - Driver type of the DataSource the list reads, as its options name it.
 * @returns {FindOperator<string>} The condition.
 */
export function ApiControllerGetListQueryLike(text: string, shape: { hasLeadingWildcard: boolean; hasTrailingWildcard: boolean; isCaseInsensitive: boolean }, driverType?: string): FindOperator<string> {
	const leading: string = shape.hasLeadingWildcard ? "%" : "";
	const trailing: string = shape.hasTrailingWildcard ? "%" : "";

	if (driverType !== undefined && DATABASE_DRIVER_TYPE_CONSTANT.LIKE_BACKSLASH_ESCAPE.has(driverType)) {
		const pattern: string = leading + text.replaceAll(BACKSLASH_LIKE_SPECIAL_PATTERN, (character: string): string => "\\" + character) + trailing;

		return shape.isCaseInsensitive ? ILike(pattern) : Like(pattern);
	}

	const pattern: string = leading + text.replaceAll(ESCAPE_CLAUSE_SPECIAL_PATTERN, (character: string): string => ESCAPE_CLAUSE_CHARACTER + character) + trailing;
	const parameterName: string = `getListLike${createHash("sha256").update(pattern).digest("hex").slice(0, PARAMETER_HASH_LENGTH)}`;

	return Raw((columnAlias: string): string => (shape.isCaseInsensitive ? `UPPER(${columnAlias}) LIKE UPPER(:${parameterName}) ESCAPE '${ESCAPE_CLAUSE_CHARACTER}'` : `${columnAlias} LIKE :${parameterName} ESCAPE '${ESCAPE_CLAUSE_CHARACTER}'`), { [parameterName]: pattern }) as FindOperator<string>;
}
