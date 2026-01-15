import { EntityMetadataNotFoundError } from "typeorm";

/**
 * Detects whether an error is a TypeORM EntityMetadataNotFoundError.
 * This usually indicates that an entity was not registered in the current DataSource.
 * @param {unknown} error - Error thrown by TypeORM
 * @returns {boolean} True if it looks like EntityMetadataNotFoundError
 */
export function DatabaseTypeOrmIsEntityMetadataNotFound(error: unknown): boolean {
	if (error instanceof EntityMetadataNotFoundError) {
		return true;
	}

	if (!error || typeof error !== "object") {
		return false;
	}

	const name: unknown = (error as { name?: unknown }).name;

	if (name === "EntityMetadataNotFoundError") {
		return true;
	}

	const message: unknown = (error as { message?: unknown }).message;

	return typeof message === "string" && message.includes("No metadata for");
}
