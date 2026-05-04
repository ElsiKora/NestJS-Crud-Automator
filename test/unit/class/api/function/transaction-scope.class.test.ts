import type { DataSource, EntityManager, Repository } from "typeorm";

import { ApiFunctionContextStorage } from "@class/api/function/context-storage.class";
import { ApiFunctionTransactionScope } from "@class/api/function/transaction-scope.class";
import { describe, expect, it, vi } from "vitest";

class TransactionScopeEntity {
	public id?: string;
}

const createManager = (id: string): EntityManager =>
	({
		getRepository: vi.fn(() => ({ id }) as unknown as Repository<TransactionScopeEntity>),
	}) as unknown as EntityManager;

describe("ApiFunctionTransactionScope", () => {
	it("restores the outer entity manager after a nested scope completes", async () => {
		const outerManager = createManager("outer");
		const innerManager = createManager("inner");

		await ApiFunctionTransactionScope.runWithEntityManager(outerManager, async () => {
			expect(ApiFunctionContextStorage.get()?.eventManager).toBe(outerManager);

			await ApiFunctionTransactionScope.runWithEntityManager(innerManager, async () => {
				expect(ApiFunctionContextStorage.get()?.eventManager).toBe(innerManager);
			});

			expect(ApiFunctionContextStorage.get()?.eventManager).toBe(outerManager);
		});
	});

	it("rethrows callback errors unchanged", async () => {
		const manager = createManager("manager");
		const error = new Error("scope failed");

		await expect(
			ApiFunctionTransactionScope.runWithEntityManager(manager, async () => {
				throw error;
			}),
		).rejects.toBe(error);
	});

	it("delegates runWithDataSource failures to the data source transaction", async () => {
		const manager = createManager("manager");
		const error = new Error("rollback me");
		const dataSource = {
			transaction: vi.fn(async (callback: (entityManager: EntityManager) => Promise<unknown>) => await callback(manager)),
		} as unknown as DataSource;

		await expect(
			ApiFunctionTransactionScope.runWithDataSource(dataSource, async () => {
				throw error;
			}),
		).rejects.toBe(error);
		expect(dataSource.transaction).toHaveBeenCalledTimes(1);
	});
});
