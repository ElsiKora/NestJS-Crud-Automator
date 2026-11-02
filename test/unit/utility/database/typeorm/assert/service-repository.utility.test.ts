import type { Repository } from "typeorm";

import { KeyPageAccountEntity } from "@test/unit/class/api/function/fixture/key-page-account.entity";
import { DatabaseTypeOrmAssertServiceRepository } from "@utility/database/typeorm/assert/service-repository.utility";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";

describe("DatabaseTypeOrmAssertServiceRepository", () => {
	const assert = (service: unknown): Repository<KeyPageAccountEntity> => DatabaseTypeOrmAssertServiceRepository<KeyPageAccountEntity>(service, 'Controller "AccountController"', ", so the check stops");

	it("returns the repository of the service", async () => {
		const dataSource: DataSource = await new DataSource({ database: ":memory:", entities: [KeyPageAccountEntity], type: "better-sqlite3" }).initialize();
		const repository: Repository<KeyPageAccountEntity> = dataSource.getRepository(KeyPageAccountEntity);

		expect(assert({ repository })).toBe(repository);
		expect(assert(new Proxy((): undefined => undefined, { get: (_target: object, property: PropertyKey): unknown => (property === "repository" ? repository : undefined) }))).toBe(repository);

		await dataSource.destroy();
	});

	it("names the failure for a missing service, a missing repository, a wrong value and a failing read", () => {
		const prefix: string = '[NestJS-Crud-Automator] Controller "AccountController": service.repository is not a usable TypeORM repository because';

		expect(() => assert(undefined)).toThrow(`${prefix} the controller has no service, so the check stops`);
		expect(() => assert("service")).toThrow(`${prefix} the controller has no service, so the check stops`);
		expect(() => assert({})).toThrow(`${prefix} the service has no repository, so the check stops`);
		expect(() => assert({ repository: "repository" })).toThrow(`${prefix} it is a string, not an object, so the check stops`);
		expect(() =>
			assert({
				get repository(): never {
					throw new Error("the provider is not wired");
				},
			}),
		).toThrow(`${prefix} reading it failed (the provider is not wired), so the check stops`);
	});

	it("names the controller when the data source of the repository is not initialized", () => {
		const repository: Repository<KeyPageAccountEntity> = new DataSource({ database: ":memory:", entities: [KeyPageAccountEntity], type: "better-sqlite3" }).getRepository(KeyPageAccountEntity);

		expect(() => assert({ repository })).toThrow(/Controller "AccountController": service\.repository is not a usable TypeORM repository because reading it failed, usually because its data source is not initialized yet \(.*KeyPageAccountEntity.*\), so the check stops/u);
	});
});
