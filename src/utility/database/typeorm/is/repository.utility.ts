import type { ObjectLiteral, Repository } from "typeorm";

import { InstanceChecker } from "typeorm";

/**
 * Detects whether a value is a TypeORM repository, by the TypeORM brands of its metadata and data source.
 * The brands hold across TypeORM copies, so a repository built by a second installed copy still counts, unlike with instanceof.
 * @param {unknown} value - Value to check, as a service exposes its repository
 * @returns {boolean} True when the value carries entity metadata and an entity manager bound to a data source
 */
export function DatabaseTypeOrmIsRepository(value: unknown): value is Repository<ObjectLiteral> {
	if (!value || typeof value !== "object") {
		return false;
	}

	const { manager, metadata }: { manager?: unknown; metadata?: unknown } = value as { manager?: unknown; metadata?: unknown };

	if (!manager || typeof manager !== "object" || typeof (manager as { getRepository?: unknown }).getRepository !== "function") {
		return false;
	}

	return InstanceChecker.isEntityMetadata(metadata) && InstanceChecker.isDataSource((manager as { dataSource?: unknown }).dataSource);
}
