import type { ObjectLiteral, Repository } from "typeorm";

import { vi } from "vitest";

/**
 * Builds a repository stub that TypeORM's InstanceChecker recognizes, as a repository of any installed TypeORM copy.
 * @param {object} dataSource - Data source stub the repository manager is bound to; it gets the TypeORM DataSource marker
 * @param {object} metadata - Entity metadata stub; it gets the TypeORM EntityMetadata marker
 * @param {object} manager - Further entity manager members
 * @returns {Repository<E>} The repository stub
 */
export function createTypeOrmRepositoryStub<E extends ObjectLiteral>(dataSource: object, metadata: object = {}, manager: object = {}): Repository<E> {
	Object.assign(dataSource, { "@instanceof": Symbol.for("DataSource") });
	Object.assign(metadata, { "@instanceof": Symbol.for("EntityMetadata") });

	return {
		manager: { dataSource, getRepository: vi.fn(), ...manager },
		metadata,
	} as unknown as Repository<E>;
}
