import { InstanceChecker } from "typeorm";

/**
 * Names what a value lacks to be a TypeORM repository, by the TypeORM markers of its metadata and data source.
 * It reads the properties instead of testing for them, so a Proxy-wrapped repository over an object or a function target counts.
 * @param {unknown} value - Value to check, as a service exposes its repository
 * @returns {string | undefined} The missing part as a clause of an error message, or undefined when the value is a repository
 */
export function DatabaseTypeOrmGetRepositoryGap(value: unknown): string | undefined {
	if (value === undefined || value === null) {
		return "the service has no repository";
	}

	if (typeof value !== "object" && typeof value !== "function") {
		return `it is a ${typeof value}, not an object`;
	}

	try {
		if (!InstanceChecker.isEntityMetadata(Reflect.get(value, "metadata"))) {
			return "its metadata is not TypeORM entity metadata";
		}

		const manager: unknown = Reflect.get(value, "manager");

		if (!manager || (typeof manager !== "object" && typeof manager !== "function") || typeof Reflect.get(manager, "getRepository") !== "function" || !InstanceChecker.isDataSource(Reflect.get(manager, "dataSource"))) {
			return "its manager is not a TypeORM entity manager bound to a data source";
		}
	} catch (error) {
		return `reading it failed, usually because its data source is not initialized yet (${error instanceof Error ? error.message : String(error)})`;
	}

	return undefined;
}
