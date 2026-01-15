import { EntityNotFoundError } from "typeorm";

/**
 * Detects whether an error is a TypeORM EntityNotFoundError.
 * @param {unknown} error - Error thrown by TypeORM
 * @returns {boolean} True if it looks like EntityNotFoundError
 */
export function DatabaseTypeOrmIsEntityNotFound(error: unknown): boolean {
	if (error instanceof EntityNotFoundError) {
		return true;
	}

	if (!error || typeof error !== "object") {
		return false;
	}

	const name: unknown = (error as { name?: unknown }).name;

	if (name === "EntityNotFoundError") {
		return true;
	}

	const message: unknown = (error as { message?: unknown }).message;

	return typeof message === "string" && message.includes("Could not find any entity of type");
}
