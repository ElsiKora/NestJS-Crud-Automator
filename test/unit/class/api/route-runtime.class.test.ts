import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import type { DataSourceOptions } from "typeorm";

import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";

import { KeyPageAccountEntity } from "./function/fixture/key-page-account.entity";
import { KeyPageInstantEntity } from "./function/fixture/key-page-instant.entity";
import { KeyPageLedgerEntity } from "./function/fixture/key-page-ledger.entity";
import { KeyPageMssqlEntity } from "./function/fixture/key-page-mssql.entity";

const resolve = (service: unknown, query: Record<string, unknown>): ReadonlyMap<string, boolean> => (ApiRouteRuntime as unknown as { resolveDateTimeFilterPaths: (service: unknown, query: Record<string, unknown>, source: string) => ReadonlyMap<string, boolean> }).resolveDateTimeFilterPaths(service, query, 'Controller "LedgerController" route "getList"');

describe("ApiRouteRuntime date and time filter paths", () => {
	it("marks the date and time value paths of a query and whether each stores an instant, through relations and embedded parts", async () => {
		const dataSource: DataSource = new DataSource({ entities: [KeyPageAccountEntity, KeyPageInstantEntity, KeyPageLedgerEntity], type: "postgres" });

		// Metadata is enough to read column types; the test never connects.
		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const paths: ReadonlyMap<string, boolean> = resolve(
			{ repository: dataSource.getRepository(KeyPageInstantEntity) },
			{
				"count[value]": "x",
				"id[value]": "x",
				limit: 10,
				"ledger.missing[value]": "x",
				"ledger.postedAt[value]": "x",
				"localAt[value]": "x",
				"missing.postedAt[value]": "x",
				"plainAt[operator]": "gte",
				"plainAt[values]": ["x"],
				"textAt[operator]": "gte",
				"window.startsAt[value]": "x",
			},
		);

		expect([...paths].toSorted(([left]: [string, boolean], [right]: [string, boolean]): number => left.localeCompare(right))).toEqual([
			["ledger.postedAt", true],
			["localAt", false],
			["plainAt", true],
			["window.startsAt", true],
		]);
	});

	it("marks an MSSQL datetimeoffset path as an instant and a datetime2 path as a wall-clock time", async () => {
		// The driver option keeps TypeORM from loading the mssql package; the test never connects.
		const dataSource: DataSource = new DataSource({ driver: {}, entities: [KeyPageMssqlEntity], type: "mssql" } as unknown as DataSourceOptions);

		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		expect([...resolve({ repository: dataSource.getRepository(KeyPageMssqlEntity) }, { "bookedAt[value]": "x", "settledAt[value]": "x" })]).toEqual([
			["bookedAt", false],
			["settledAt", true],
		]);
	});

	it("reads a repository from another TypeORM copy by its shape", async () => {
		const dataSource: DataSource = new DataSource({ entities: [KeyPageAccountEntity, KeyPageInstantEntity, KeyPageLedgerEntity], type: "postgres" });

		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const repository = dataSource.getRepository(KeyPageInstantEntity);

		expect(resolve({ repository: { manager: repository.manager, metadata: repository.metadata } }, { "plainAt[value]": "x" })).toEqual(new Map([["plainAt", true]]));
	});

	it("fails closed for a service without a recognized repository", () => {
		expect(() => resolve({}, { "plainAt[value]": "x" })).toThrow('Controller "LedgerController" route "getList": service.repository is not a TypeORM repository because the service has no repository, so its date and time filter values cannot be checked');
		expect(() => resolve(undefined, { "plainAt[value]": "x" })).toThrow('Controller "LedgerController" route "getList": service.repository is not a TypeORM repository because the service has no repository');
		expect(() => resolve({ repository: { metadata: {} } }, { "plainAt[value]": "x" })).toThrow('Controller "LedgerController" route "getList": service.repository is not a TypeORM repository because its metadata is not TypeORM entity metadata');
	});
});
