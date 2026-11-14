import type { DataSource, EntityManager, QueryRunner } from "typeorm";

import { vi } from "vitest";

export function createTransactionFixture(entityManager?: EntityManager): { dataSource: DataSource; entityManager: EntityManager; queryRunner: QueryRunner } {
	const resolvedEntityManager: EntityManager =
		entityManager ??
		({
			getRepository: vi.fn(),
		} as unknown as EntityManager);
	// The depth TypeORM keeps on a query runner: the transaction and each savepoint open inside it.
	const queryRunner = {
		commitTransaction: vi.fn(async () => {
			queryRunner.transactionDepth = Math.max(0, queryRunner.transactionDepth - 1);
		}),
		connect: vi.fn(async () => undefined),
		manager: resolvedEntityManager,
		release: vi.fn(async () => undefined),
		rollbackTransaction: vi.fn(async () => {
			queryRunner.transactionDepth = Math.max(0, queryRunner.transactionDepth - 1);
		}),
		startTransaction: vi.fn(async () => {
			queryRunner.transactionDepth += 1;
		}),
		transactionDepth: 0,
	};
	const dataSource = {
		createQueryRunner: vi.fn(() => queryRunner as unknown as QueryRunner),
		options: { type: "postgres" },
	} as unknown as DataSource;
	Object.assign(resolvedEntityManager, { dataSource });

	return {
		dataSource,
		entityManager: resolvedEntityManager,
		queryRunner: queryRunner as unknown as QueryRunner,
	};
}
