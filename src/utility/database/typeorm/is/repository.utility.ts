import type { ObjectLiteral, Repository } from "typeorm";

import { DatabaseTypeOrmGetRepositoryGap } from "@utility/database/typeorm/get/repository-gap.utility";

/**
 * Detects whether a value is a TypeORM repository, by the TypeORM markers of its metadata and data source.
 * The markers hold across TypeORM copies, so a repository built by a second installed copy still counts, unlike with instanceof.
 * @param {unknown} value - Value to check, as a service exposes its repository
 * @template E - The entity type the caller expects the repository to hold
 * @returns {boolean} True when the value carries entity metadata and an entity manager bound to a data source
 */
export function DatabaseTypeOrmIsRepository<E extends ObjectLiteral = ObjectLiteral>(value: unknown): value is Repository<E> {
	return DatabaseTypeOrmGetRepositoryGap(value) === undefined;
}
