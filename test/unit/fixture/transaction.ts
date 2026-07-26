import type { DataSource, EntityManager, QueryRunner } from "typeorm";

import { vi } from "vitest";

export function createTransactionFixture(entityManager?: EntityManager): { dataSource: DataSource; entityManager: EntityManager; queryRunner: QueryRunner } {
	const resolvedEntityManager: EntityManager =
		entityManager ??
		({
			getRepository: vi.fn(),
		} as unknown as EntityManager);
	const queryRunner = {
		commitTransaction: vi.fn(async () => undefined),
		connect: vi.fn(async () => undefined),
		manager: resolvedEntityManager,
		release: vi.fn(async () => undefined),
		rollbackTransaction: vi.fn(async () => undefined),
		startTransaction: vi.fn(async () => undefined),
	} as unknown as QueryRunner;
	const dataSource = {
		createQueryRunner: vi.fn(() => queryRunner),
	} as unknown as DataSource;

	return {
		dataSource,
		entityManager: resolvedEntityManager,
		queryRunner,
	};
}
