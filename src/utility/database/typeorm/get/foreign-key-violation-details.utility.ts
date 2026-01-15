import { QueryFailedError } from "typeorm";

const REGEX_GROUP_1_INDEX: number = 1;
const REGEX_GROUP_2_INDEX: number = 2;
const REGEX_GROUP_3_INDEX: number = 3;

const MYSQL_CONSTRAINT_REGEX: RegExp = /CONSTRAINT `([^`]+)`/;
const MYSQL_FOREIGN_KEY_REGEX: RegExp = /FOREIGN KEY \(`([^`]+)`\) REFERENCES `([^`]+)` \(`([^`]+)`\)/;

const POSTGRES_FOREIGN_KEY_CONSTRAINT_REGEX: RegExp = /foreign key constraint "([^"]+)"/;
const POSTGRES_ON_TABLE_REGEX: RegExp = /on table "([^"]+)"/;
const POSTGRES_REFERENCED_REGEX: RegExp = /Key \(([^)]+)\)=\(([^)]+)\) is still referenced from table "([^"]+)"/;
const POSTGRES_REFERENCED_ROW_MISSING_REGEX: RegExp = /Key \(([^)]+)\)=\(([^)]+)\) is not present in table "([^"]+)"/;

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

	const postgresMissingMatch: null | RegExpExecArray = POSTGRES_REFERENCED_ROW_MISSING_REGEX.exec(detailOrMessage);

	if (postgresMissingMatch) {
		field = postgresMissingMatch[REGEX_GROUP_1_INDEX];
		value = postgresMissingMatch[REGEX_GROUP_2_INDEX];
		referencedTable = postgresMissingMatch[REGEX_GROUP_3_INDEX];
	}

	const postgresReferencedMatch: null | RegExpExecArray = POSTGRES_REFERENCED_REGEX.exec(detailOrMessage);

	if (postgresReferencedMatch) {
		field ??= postgresReferencedMatch[REGEX_GROUP_1_INDEX];
		value ??= postgresReferencedMatch[REGEX_GROUP_2_INDEX];
		referencedTable ??= postgresReferencedMatch[REGEX_GROUP_3_INDEX];
	}

	const mysqlForeignKeyMatch: null | RegExpExecArray = MYSQL_FOREIGN_KEY_REGEX.exec(detailOrMessage);

	if (mysqlForeignKeyMatch) {
		field ??= mysqlForeignKeyMatch[REGEX_GROUP_1_INDEX];
		referencedTable ??= mysqlForeignKeyMatch[REGEX_GROUP_2_INDEX];
		referencedField ??= mysqlForeignKeyMatch[REGEX_GROUP_3_INDEX];
	}

	let constraint: string | undefined = constraintFromDriver;

	if (!constraint) {
		const postgresConstraintMatch: null | RegExpExecArray = POSTGRES_FOREIGN_KEY_CONSTRAINT_REGEX.exec(message);

		if (postgresConstraintMatch) {
			constraint = postgresConstraintMatch[REGEX_GROUP_1_INDEX];
		} else {
			const mysqlConstraintMatch: null | RegExpExecArray = MYSQL_CONSTRAINT_REGEX.exec(detailOrMessage);

			if (mysqlConstraintMatch) {
				constraint = mysqlConstraintMatch[REGEX_GROUP_1_INDEX];
			}
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
		referencedField,
		referencedTable,
		table,
		value,
	};
}
