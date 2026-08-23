import type { FindManyOptions, FindOneOptions, Repository } from "typeorm";

import { ApiControllerGeneratedRelationCacheContract } from "@class/api/controller/generated/relation-cache-contract.class";
import { GeneratedRelationCacheChildEntity } from "@test/unit/class/api/controller/fixture/generated-relation-cache-child.entity";
import { GeneratedRelationCacheOwnerEntity } from "@test/unit/class/api/controller/fixture/generated-relation-cache-owner.entity";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";

describe("ApiControllerGeneratedRelationCacheContract", () => {
	it("fails closed for GET, PAGE, and CURSOR relation queries when global cache is always enabled", async () => {
		const dataSource = new DataSource({
			cache: { alwaysEnabled: true, duration: 60_000 },
			database: ":memory:",
			entities: [GeneratedRelationCacheChildEntity, GeneratedRelationCacheOwnerEntity],
			relationLoadStrategy: "query",
			synchronize: true,
			type: "sqlite",
		});

		await dataSource.initialize();

		try {
			const repository: Repository<GeneratedRelationCacheOwnerEntity> = dataSource.getRepository(GeneratedRelationCacheOwnerEntity);
			const getProperties: FindOneOptions<GeneratedRelationCacheOwnerEntity> = { cache: false, relations: { children: true }, where: { id: "owner-a" } };
			const pageProperties: FindManyOptions<GeneratedRelationCacheOwnerEntity> = { cache: false, relations: { children: true }, take: 10, where: { id: "owner-a" } };
			const cursorProperties: FindManyOptions<GeneratedRelationCacheOwnerEntity> = { cache: false, order: { id: "ASC" }, relations: { children: true }, take: 2, where: { id: "owner-a" } };

			await repository.save([
				{ id: "owner-a", name: "A" },
				{ id: "owner-b", name: "B" },
			]);
			await dataSource.getRepository(GeneratedRelationCacheChildEntity).save({ id: "child-secret", owner: { id: "owner-a" }, ownerId: "owner-a", value: "secret" });

			await repository.findOne(getProperties);
			await repository.findAndCount(pageProperties);
			await repository.find(cursorProperties);
			await dataSource.query('UPDATE "generated_relation_cache_child" SET "ownerId" = ? WHERE "id" = ?', ["owner-b", "child-secret"]);

			const staleGet = await repository.findOne(getProperties);
			const stalePage = await repository.findAndCount(pageProperties);
			const staleCursor = await repository.find(cursorProperties);

			expect(staleGet?.children).toHaveLength(1);
			expect(stalePage[0][0]?.children).toHaveLength(1);
			expect(staleCursor[0]?.children).toHaveLength(1);

			for (const properties of [getProperties, pageProperties, cursorProperties]) {
				expect(() => ApiControllerGeneratedRelationCacheContract.assertSafe(repository, properties)).toThrow('relationLoadStrategy "query"');
			}

			const cacheOptions = dataSource.options.cache as { alwaysEnabled: unknown };

			cacheOptions.alwaysEnabled = "true";
			expect(() => ApiControllerGeneratedRelationCacheContract.assertSafe(repository, getProperties)).toThrow('relationLoadStrategy "query"');
			cacheOptions.alwaysEnabled = 1;
			expect(() => ApiControllerGeneratedRelationCacheContract.assertSafe(repository, getProperties)).toThrow('relationLoadStrategy "query"');

			const inheritedFalsyStrategy = Object.assign(Object.create({ relationLoadStrategy: false, relations: { children: true } }) as FindManyOptions<GeneratedRelationCacheOwnerEntity>, { cache: false });

			expect(() => ApiControllerGeneratedRelationCacheContract.assertSafe(repository, inheritedFalsyStrategy)).toThrow('relationLoadStrategy "query"');
			expect(() => ApiControllerGeneratedRelationCacheContract.assertSafe(repository, { cache: false, relations: { children: {} } })).toThrow('relationLoadStrategy "query"');
		} finally {
			await dataSource.destroy();
		}
	});

	it("allows join loading and query loading when global always-cache is disabled", async () => {
		const cachedDataSource = new DataSource({
			cache: { alwaysEnabled: true, duration: 60_000 },
			database: ":memory:",
			entities: [GeneratedRelationCacheChildEntity, GeneratedRelationCacheOwnerEntity],
			synchronize: true,
			type: "sqlite",
		});
		const uncachedDataSource = new DataSource({
			database: ":memory:",
			entities: [GeneratedRelationCacheChildEntity, GeneratedRelationCacheOwnerEntity],
			relationLoadStrategy: "query",
			synchronize: true,
			type: "sqlite",
		});

		await cachedDataSource.initialize();
		await uncachedDataSource.initialize();

		try {
			const cachedRepository = cachedDataSource.getRepository(GeneratedRelationCacheOwnerEntity);
			const uncachedRepository = uncachedDataSource.getRepository(GeneratedRelationCacheOwnerEntity);

			expect(() => ApiControllerGeneratedRelationCacheContract.assertSafe(cachedRepository, { relationLoadStrategy: "join", relations: { children: true } })).not.toThrow();
			expect(() => ApiControllerGeneratedRelationCacheContract.assertSafe(uncachedRepository, { relations: { children: true } })).not.toThrow();
			expect(() => ApiControllerGeneratedRelationCacheContract.assertSafe(cachedRepository, { relationLoadStrategy: "query" })).not.toThrow();
		} finally {
			await cachedDataSource.destroy();
			await uncachedDataSource.destroy();
		}
	});
});
