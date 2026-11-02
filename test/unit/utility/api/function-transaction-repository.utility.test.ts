import type { EntityManager, QueryRunner } from "typeorm";

import { ApiFunctionGetTransactionRepository } from "@utility/api/function-transaction-repository.utility";
import { Repository } from "typeorm";
import { describe, expect, it, vi } from "vitest";

class ItemEntity {
	public id!: string;
}

// A NestJS custom repository builds itself from the DataSource, so calling its constructor with anything else fails.
class ConstructedItemRepository extends Repository<ItemEntity> {
	public static constructions: number = 0;

	public readonly label: string = "custom";

	public constructor(dataSource: { createEntityManager: () => EntityManager }) {
		super(ItemEntity, dataSource.createEntityManager());
		ConstructedItemRepository.constructions += 1;
	}
}

describe("ApiFunctionGetTransactionRepository", () => {
	const plain = {} as Repository<ItemEntity>;
	const queryRunner = {} as QueryRunner;
	const createManager = () => ({ getRepository: vi.fn(() => plain), queryRunner });

	it("binds a real repository to the transaction without running its constructor again", () => {
		const manager = createManager();
		const repository = new ConstructedItemRepository({ createEntityManager: () => ({}) as EntityManager });
		ConstructedItemRepository.constructions = 0;

		const bound = ApiFunctionGetTransactionRepository(manager as unknown as EntityManager, repository, ItemEntity) as ConstructedItemRepository;

		expect(ConstructedItemRepository.constructions).toBe(0);
		expect(Object.getPrototypeOf(bound)).toBe(repository);
		expect(bound).toBeInstanceOf(ConstructedItemRepository);
		expect(bound.manager).toBe(manager);
		expect(bound.queryRunner).toBe(queryRunner);
		expect(bound.label).toBe("custom");
		expect(bound.target).toBe(ItemEntity);
		expect(manager.getRepository).not.toHaveBeenCalled();
	});

	it("leaves the service repository on its own manager", () => {
		const own = {} as EntityManager;
		const repository = new ConstructedItemRepository({ createEntityManager: () => own });

		ApiFunctionGetTransactionRepository(createManager() as unknown as EntityManager, repository, ItemEntity);

		expect(repository.manager).toBe(own);
		expect(repository.queryRunner).toBeUndefined();
	});

	it.each([
		["a delegating object", { save: vi.fn() }],
		["no repository", undefined],
	])("takes the repository of the entity for %s", (_name: string, repository: object | undefined) => {
		const manager = createManager();

		expect(ApiFunctionGetTransactionRepository(manager as unknown as EntityManager, repository as Repository<ItemEntity>, ItemEntity)).toBe(plain);
		expect(manager.getRepository).toHaveBeenCalledWith(ItemEntity);
	});
});
