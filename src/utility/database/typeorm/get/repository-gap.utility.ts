import { InstanceChecker } from "typeorm";

/**
 * Names what a value lacks to be a TypeORM repository, by the TypeORM markers of its metadata and data source.
 * The markers hold across TypeORM copies, so a repository built by a second installed copy has no gap, unlike with instanceof.
 * @param {unknown} value - Value to check, as a service exposes its repository
 * @returns {string | undefined} The missing part as a clause for an error message, or undefined for a TypeORM repository
 */
export function DatabaseTypeOrmGetRepositoryGap(value: unknown): string | undefined {
	if (!value || typeof value !== "object") {
		return "the service has no repository";
	}

	if (!("metadata" in value) || !InstanceChecker.isEntityMetadata(value.metadata)) {
		return "its metadata is not TypeORM entity metadata";
	}

	const manager: unknown = "manager" in value ? value.manager : undefined;

	if (!manager || typeof manager !== "object" || !("getRepository" in manager) || typeof manager.getRepository !== "function" || !("dataSource" in manager) || !InstanceChecker.isDataSource(manager.dataSource)) {
		return "its manager is not a TypeORM entity manager bound to a data source";
	}

	return undefined;
}
