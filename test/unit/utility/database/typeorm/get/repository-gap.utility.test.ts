import type { Repository } from "typeorm";

import { KeyPageAccountEntity } from "@test/unit/class/api/function/fixture/key-page-account.entity";
import { DatabaseTypeOrmGetRepositoryGap } from "@utility/database/typeorm/get/repository-gap.utility";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";

describe("DatabaseTypeOrmGetRepositoryGap", () => {
	it("names what a value lacks to be a TypeORM repository", async () => {
		const dataSource: DataSource = await new DataSource({ database: ":memory:", entities: [KeyPageAccountEntity], type: "better-sqlite3" }).initialize();
		const repository: Repository<KeyPageAccountEntity> = dataSource.getRepository(KeyPageAccountEntity);

		expect(DatabaseTypeOrmGetRepositoryGap(repository)).toBeUndefined();
		expect(DatabaseTypeOrmGetRepositoryGap(undefined)).toBe("the service has no repository");
		expect(DatabaseTypeOrmGetRepositoryGap("repository")).toBe("the service has no repository");
		expect(DatabaseTypeOrmGetRepositoryGap({ find: (): undefined => undefined })).toBe("its metadata is not TypeORM entity metadata");
		expect(DatabaseTypeOrmGetRepositoryGap({ manager: repository.manager, metadata: { columns: [] } })).toBe("its metadata is not TypeORM entity metadata");
		expect(DatabaseTypeOrmGetRepositoryGap({ metadata: repository.metadata })).toBe("its manager is not a TypeORM entity manager bound to a data source");
		expect(DatabaseTypeOrmGetRepositoryGap({ manager: { dataSource: repository.manager.dataSource }, metadata: repository.metadata })).toBe("its manager is not a TypeORM entity manager bound to a data source");
		expect(DatabaseTypeOrmGetRepositoryGap({ manager: { dataSource: {}, getRepository: (): undefined => undefined }, metadata: repository.metadata })).toBe("its manager is not a TypeORM entity manager bound to a data source");

		await dataSource.destroy();
	});
});
