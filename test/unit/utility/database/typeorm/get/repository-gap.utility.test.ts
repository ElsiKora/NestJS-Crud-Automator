import type { Repository } from "typeorm";

import { KeyPageAccountEntity } from "@test/unit/class/api/function/fixture/key-page-account.entity";
import { DatabaseTypeOrmGetRepositoryGap } from "@utility/database/typeorm/get/repository-gap.utility";
import { DataSource } from "typeorm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

describe("DatabaseTypeOrmGetRepositoryGap", () => {
	let dataSource: DataSource;
	let repository: Repository<KeyPageAccountEntity>;

	/**
	 * Forwards every read to the real repository, the way a lazy repository wrapper does.
	 * @param {PropertyKey} property - Property being read
	 * @returns {unknown} The property of the real repository
	 */
	const forward = (property: PropertyKey): unknown => Reflect.get(repository, property, repository);

	beforeAll(async () => {
		dataSource = await new DataSource({ database: ":memory:", entities: [KeyPageAccountEntity], type: "better-sqlite3" }).initialize();
		repository = dataSource.getRepository(KeyPageAccountEntity);
	});

	afterAll(async () => {
		await dataSource.destroy();
	});

	it("names what a value lacks to be a TypeORM repository", () => {
		expect(DatabaseTypeOrmGetRepositoryGap(repository)).toBeUndefined();
		expect(DatabaseTypeOrmGetRepositoryGap(undefined)).toBe("the service has no repository");
		expect(DatabaseTypeOrmGetRepositoryGap(null)).toBe("the service has no repository");
		expect(DatabaseTypeOrmGetRepositoryGap({ find: (): undefined => undefined })).toBe("its metadata is not TypeORM entity metadata");
		expect(DatabaseTypeOrmGetRepositoryGap({ manager: repository.manager, metadata: { columns: [] } })).toBe("its metadata is not TypeORM entity metadata");
		expect(DatabaseTypeOrmGetRepositoryGap({ metadata: repository.metadata })).toBe("its manager is not a TypeORM entity manager bound to a data source");
		expect(DatabaseTypeOrmGetRepositoryGap({ manager: { dataSource: repository.manager.dataSource }, metadata: repository.metadata })).toBe("its manager is not a TypeORM entity manager bound to a data source");
		expect(DatabaseTypeOrmGetRepositoryGap({ manager: { dataSource: {}, getRepository: (): undefined => undefined }, metadata: repository.metadata })).toBe("its manager is not a TypeORM entity manager bound to a data source");
	});

	it("says what a value that cannot be a repository is", () => {
		expect(DatabaseTypeOrmGetRepositoryGap("repository")).toBe("it is a string, not an object");
		expect(DatabaseTypeOrmGetRepositoryGap(1)).toBe("it is a number, not an object");
		expect(DatabaseTypeOrmGetRepositoryGap((): undefined => undefined)).toBe("its metadata is not TypeORM entity metadata");
	});

	it("reads a Proxy-wrapped repository through its get trap, over an object or a function target", () => {
		expect(DatabaseTypeOrmGetRepositoryGap(new Proxy(repository, {}))).toBeUndefined();
		expect(DatabaseTypeOrmGetRepositoryGap(new Proxy({}, { get: (_target: object, property: PropertyKey): unknown => forward(property) }))).toBeUndefined();
		expect(DatabaseTypeOrmGetRepositoryGap(new Proxy((): undefined => undefined, { get: (_target: object, property: PropertyKey): unknown => forward(property) }))).toBeUndefined();
	});

	it("reads a manager wrapped in a function-target Proxy through its get trap", () => {
		const manager: object = new Proxy((): undefined => undefined, { get: (_target: object, property: PropertyKey): unknown => Reflect.get(repository.manager, property, repository.manager) });

		expect(DatabaseTypeOrmGetRepositoryGap({ manager, metadata: repository.metadata })).toBeUndefined();
	});

	it("names the cause when a repository cannot be read because its data source is not initialized", () => {
		const uninitialized: Repository<KeyPageAccountEntity> = new DataSource({ database: ":memory:", entities: [KeyPageAccountEntity], type: "better-sqlite3" }).getRepository(KeyPageAccountEntity);

		expect(DatabaseTypeOrmGetRepositoryGap(uninitialized)).toMatch(/^reading it failed, usually because its data source is not initialized yet \(.*KeyPageAccountEntity.*\)$/u);
	});
});
