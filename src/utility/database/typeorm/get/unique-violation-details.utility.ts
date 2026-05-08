import { QueryFailedError } from "typeorm";

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

	const postgresDetailMatch: null | RegExpExecArray = /Key \((?<field>[^)]+)\)=\((?<value>[^)]+)\) already exists\./.exec(detailOrMessage);

	if (postgresDetailMatch) {
		field = postgresDetailMatch.groups?.field;
		value = postgresDetailMatch.groups?.value;
	}

	const mysqlDuplicateMatch: null | RegExpExecArray = /Duplicate entry '(?<value>[^']+)' for key '(?<key>[^']+)'/.exec(detailOrMessage);

	if (mysqlDuplicateMatch) {
		const key: string | undefined = mysqlDuplicateMatch.groups?.key;

		value ??= mysqlDuplicateMatch.groups?.value;

		if (key) {
			// Key can be "table.column" or an index name. Best-effort: split by '.' and take the last segment.
			const segments: Array<string> = key.split(".");
			const last: string | undefined = segments.at(-1);
			field ??= last;
		}
	}

	let constraint: string | undefined = constraintFromDriver;

	if (!constraint) {
		const postgresConstraintMatch: null | RegExpExecArray = /unique constraint "(?<constraint>[^"]+)"/.exec(message);

		if (postgresConstraintMatch) {
			constraint = postgresConstraintMatch.groups?.constraint;
		}
	}

	let table: string | undefined = tableFromDriver;

	if (!table) {
		const postgresTableMatch: null | RegExpExecArray = /on table "(?<table>[^"]+)"/.exec(message);

		if (postgresTableMatch) {
			table = postgresTableMatch.groups?.table;
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
