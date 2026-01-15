import { QueryFailedError } from "typeorm";

const REGEX_GROUP_1_INDEX: number = 1;
const REGEX_GROUP_2_INDEX: number = 2;

const POSTGRES_UNIQUE_CONSTRAINT_REGEX: RegExp = /unique constraint "([^"]+)"/;
const POSTGRES_ON_TABLE_REGEX: RegExp = /on table "([^"]+)"/;
const POSTGRES_UNIQUE_DETAIL_REGEX: RegExp = /Key \(([^)]+)\)=\(([^)]+)\) already exists\./;

const MYSQL_DUPLICATE_ENTRY_REGEX: RegExp = /Duplicate entry '([^']+)' for key '([^']+)'/;

/**
 * Extracts best-effort details from a TypeORM UNIQUE constraint violation (QueryFailedError).
 * Works best with PostgreSQL (driverError.detail / driverError.constraint).
 * @param {unknown} error - Error thrown by TypeORM
 * @returns {{ constraint?: string; detail?: string; field?: string; table?: string; value?: string } | undefined}
 * Unique violation details, when available.
 */
export function DatabaseTypeOrmGetUniqueViolationDetails(error: unknown): { constraint?: string; detail?: string; field?: string; table?: string; value?: string } | undefined {
	const isQueryFailedError: boolean = error instanceof QueryFailedError || (error != null && typeof error === "object" && (error as { name?: unknown }).name === "QueryFailedError");

	if (!isQueryFailedError) {
		return undefined;
	}

	let driverError: Record<string, unknown> | undefined;

	if (error != null && typeof error === "object") {
		const driverErrorUnknown: unknown = (error as { driverError?: unknown }).driverError;

		if (driverErrorUnknown != null && typeof driverErrorUnknown === "object") {
			driverError = driverErrorUnknown as Record<string, unknown>;
		}
	}

	const constraintFromDriver: string | undefined = typeof driverError?.constraint === "string" ? driverError.constraint : undefined;
	const detail: string | undefined = typeof driverError?.detail === "string" ? driverError.detail : undefined;
	const tableFromDriver: string | undefined = typeof driverError?.table === "string" ? driverError.table : undefined;

	const driverMessage: unknown = driverError?.message;
	let message: string = "";

	if (typeof driverMessage === "string") {
		message = driverMessage;
	} else if (error instanceof Error) {
		message = error.message;
	} else if (error != null && typeof error === "object" && "message" in error) {
		const objectMessage: unknown = (error as { message?: unknown }).message;

		if (typeof objectMessage === "string") {
			message = objectMessage;
		}
	}

	const detailOrMessage: string = detail ?? message;

	let field: string | undefined;
	let value: string | undefined;

	const postgresDetailMatch: null | RegExpExecArray = POSTGRES_UNIQUE_DETAIL_REGEX.exec(detailOrMessage);

	if (postgresDetailMatch) {
		field = postgresDetailMatch[REGEX_GROUP_1_INDEX];
		value = postgresDetailMatch[REGEX_GROUP_2_INDEX];
	}

	const mysqlDuplicateMatch: null | RegExpExecArray = MYSQL_DUPLICATE_ENTRY_REGEX.exec(detailOrMessage);

	if (mysqlDuplicateMatch) {
		value ??= mysqlDuplicateMatch[REGEX_GROUP_1_INDEX];
		const key: string | undefined = mysqlDuplicateMatch[REGEX_GROUP_2_INDEX];

		if (key) {
			// Key can be "table.column" or an index name. Best-effort: split by '.' and take the last segment.
			const segments: Array<string> = key.split(".");
			const last: string | undefined = segments.at(-1);
			field ??= last;
		}
	}

	let constraint: string | undefined = constraintFromDriver;

	if (!constraint) {
		const postgresConstraintMatch: null | RegExpExecArray = POSTGRES_UNIQUE_CONSTRAINT_REGEX.exec(message);

		if (postgresConstraintMatch) {
			constraint = postgresConstraintMatch[REGEX_GROUP_1_INDEX];
		}
	}

	let table: string | undefined = tableFromDriver;

	if (!table) {
		const postgresTableMatch: null | RegExpExecArray = POSTGRES_ON_TABLE_REGEX.exec(message);

		if (postgresTableMatch) {
			table = postgresTableMatch[REGEX_GROUP_1_INDEX];
		}
	}

	return {
		constraint,
		detail,
		field,
		table,
		value,
	};
}
