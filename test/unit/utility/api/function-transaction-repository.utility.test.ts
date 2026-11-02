import type { EntityManager } from "typeorm";

import { ApiFunctionGetTransactionRepository } from "@utility/api/function-transaction-repository.utility";
import { Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";

class ItemEntity {
	public id!: string;
}

describe("ApiFunctionGetTransactionRepository", () => {
	const bound = {} as Repository<ItemEntity>;
	const plain = {} as Repository<ItemEntity>;
	const createManager = () => ({ getRepository: vi.fn(() => plain), withRepository: vi.fn(() => bound) });

	it("binds a real repository, so its overrides survive", () => {
		const manager = createManager();
		const repository = Object.create(Repository.prototype) as Repository<ItemEntity>;

		expect(ApiFunctionGetTransactionRepository(manager as unknown as EntityManager, repository, ItemEntity)).toBe(bound);
		expect(manager.withRepository).toHaveBeenCalledWith(repository);
		expect(manager.getRepository).not.toHaveBeenCalled();
	});

	it.each([
		["a delegating object", { save: vi.fn() }],
		["no repository", undefined],
	])("takes the repository of the entity for %s", (_name: string, repository: object | undefined) => {
		const manager = createManager();

		expect(ApiFunctionGetTransactionRepository(manager as unknown as EntityManager, repository as Repository<ItemEntity>, ItemEntity)).toBe(plain);
		expect(manager.getRepository).toHaveBeenCalledWith(ItemEntity);
		expect(manager.withRepository).not.toHaveBeenCalled();
	});
});
