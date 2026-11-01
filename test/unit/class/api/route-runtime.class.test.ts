import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";

import { KeyPageAccountEntity } from "./function/fixture/key-page-account.entity";
import { KeyPageInstantEntity } from "./function/fixture/key-page-instant.entity";
import { KeyPageLedgerEntity } from "./function/fixture/key-page-ledger.entity";

const resolve = (service: unknown, query: Record<string, unknown>): ReadonlyMap<string, boolean> => (ApiRouteRuntime as unknown as { resolveDateTimeFilterPaths: (service: unknown, query: Record<string, unknown>) => ReadonlyMap<string, boolean> }).resolveDateTimeFilterPaths(service, query);

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

	it("marks nothing for a service without a repository", () => {
		expect(resolve({}, { "plainAt[value]": "x" }).size).toBe(0);
		expect(resolve(undefined, { "plainAt[value]": "x" }).size).toBe(0);
	});
});
