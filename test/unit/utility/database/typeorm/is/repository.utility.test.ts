import type { Repository } from "typeorm";

import { KeyPageAccountEntity } from "@test/unit/class/api/function/fixture/key-page-account.entity";
import { DatabaseTypeOrmIsRepository } from "@utility/database/typeorm/is/repository.utility";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";

describe("DatabaseTypeOrmIsRepository", () => {
	it("recognizes a repository by its TypeORM shape, also one from another TypeORM copy", async () => {
		const dataSource: DataSource = new DataSource({ entities: [KeyPageAccountEntity], type: "postgres" });

		// Metadata is enough to build repositories; the test never connects.
		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const repository: Repository<KeyPageAccountEntity> = dataSource.getRepository(KeyPageAccountEntity);
		// A second TypeORM copy brands its own classes, so its repository fails instanceof but keeps the shape.
		const foreignRepository: object = { manager: repository.manager, metadata: repository.metadata };

		expect(DatabaseTypeOrmIsRepository(repository)).toBe(true);
		expect(DatabaseTypeOrmIsRepository(foreignRepository)).toBe(true);
	});

	it("rejects values without a repository shape", async () => {
		const dataSource: DataSource = new DataSource({ entities: [KeyPageAccountEntity], type: "postgres" });

		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const repository: Repository<KeyPageAccountEntity> = dataSource.getRepository(KeyPageAccountEntity);

		expect(DatabaseTypeOrmIsRepository(undefined)).toBe(false);
		expect(DatabaseTypeOrmIsRepository("repository")).toBe(false);
		expect(DatabaseTypeOrmIsRepository({})).toBe(false);
		expect(DatabaseTypeOrmIsRepository({ manager: repository.manager, metadata: {} })).toBe(false);
		expect(DatabaseTypeOrmIsRepository({ manager: {}, metadata: repository.metadata })).toBe(false);
		expect(DatabaseTypeOrmIsRepository({ manager: { dataSource: repository.manager.dataSource }, metadata: repository.metadata })).toBe(false);
	});
});
