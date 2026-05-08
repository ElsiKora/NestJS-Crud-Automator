import { QueryFailedError } from "typeorm";

/**
 * Extracts best-effort details from a TypeORM FOREIGN KEY violation (QueryFailedError).
 * Works best with PostgreSQL (driverError.detail / driverError.constraint).
 * @param {unknown} error - Error thrown by TypeORM
 * @returns {{ constraint?: string; detail?: string; field?: string; referencedField?: string; referencedTable?: string; table?: string; value?: string } | undefined}
 * Foreign key violation details, when available.
 */
export function DatabaseTypeOrmGetForeignKeyViolationDetails(error: unknown): { constraint?: string; detail?: string; field?: string; referencedField?: string; referencedTable?: string; table?: string; value?: string } | undefined {
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

	let field: string | undefined;
	let referencedField: string | undefined;
	let referencedTable: string | undefined;
	let value: string | undefined;

	const detailOrMessage: string = detail ?? message;

	const postgresMissingMatch: null | RegExpExecArray = /Key \((?<field>[^)]+)\)=\((?<value>[^)]+)\) is not present in table "(?<referencedTable>[^"]+)"/.exec(detailOrMessage);

	if (postgresMissingMatch) {
		field = postgresMissingMatch.groups?.field;
		value = postgresMissingMatch.groups?.value;
		referencedTable = postgresMissingMatch.groups?.referencedTable;
	}

	const postgresReferencedMatch: null | RegExpExecArray = /Key \((?<field>[^)]+)\)=\((?<value>[^)]+)\) is still referenced from table "(?<referencedTable>[^"]+)"/.exec(detailOrMessage);

	if (postgresReferencedMatch) {
		field ??= postgresReferencedMatch.groups?.field;
		value ??= postgresReferencedMatch.groups?.value;
		referencedTable ??= postgresReferencedMatch.groups?.referencedTable;
	}

	const mysqlForeignKeyMatch: null | RegExpExecArray = /FOREIGN KEY \(`(?<field>[^`]+)`\) REFERENCES `(?<referencedTable>[^`]+)` \(`(?<referencedField>[^`]+)`\)/.exec(detailOrMessage);

	if (mysqlForeignKeyMatch) {
		field ??= mysqlForeignKeyMatch.groups?.field;
		referencedTable ??= mysqlForeignKeyMatch.groups?.referencedTable;
		referencedField ??= mysqlForeignKeyMatch.groups?.referencedField;
	}

	let constraint: string | undefined = constraintFromDriver;

	if (!constraint) {
		const postgresConstraintMatch: null | RegExpExecArray = /foreign key constraint "(?<constraint>[^"]+)"/.exec(message);

		if (postgresConstraintMatch) {
			constraint = postgresConstraintMatch.groups?.constraint;
		} else {
			const mysqlConstraintMatch: null | RegExpExecArray = /CONSTRAINT `(?<constraint>[^`]+)`/.exec(detailOrMessage);

			if (mysqlConstraintMatch) {
				constraint = mysqlConstraintMatch.groups?.constraint;
			}
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
		referencedField,
		referencedTable,
		table,
		value,
	};
}
