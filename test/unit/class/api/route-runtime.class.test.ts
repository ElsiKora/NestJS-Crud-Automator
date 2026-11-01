import { ApiRouteRuntime } from "@class/api/route-runtime.class";
import { DataSource } from "typeorm";
import { describe, expect, it } from "vitest";

import { KeyPageAccountEntity } from "./function/fixture/key-page-account.entity";
import { KeyPageInstantEntity } from "./function/fixture/key-page-instant.entity";
import { KeyPageLedgerEntity } from "./function/fixture/key-page-ledger.entity";

const resolve = (service: unknown, query: Record<string, unknown>): ReadonlySet<string> => (ApiRouteRuntime as unknown as { resolveInstantFilterPaths: (service: unknown, query: Record<string, unknown>) => ReadonlySet<string> }).resolveInstantFilterPaths(service, query);

describe("ApiRouteRuntime instant filter paths", () => {
	it("marks the value paths of a query by the driver-normalized column type, through relations and embedded parts", async () => {
		const dataSource: DataSource = new DataSource({ entities: [KeyPageAccountEntity, KeyPageInstantEntity, KeyPageLedgerEntity], type: "postgres" });

		// Metadata is enough to read column types; the test never connects.
		await (dataSource as unknown as { buildMetadatas: () => Promise<void> }).buildMetadatas();

		const paths: ReadonlySet<string> = resolve(
			{ repository: dataSource.getRepository(KeyPageInstantEntity) },
			{
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

		expect([...paths].toSorted()).toEqual(["ledger.postedAt", "plainAt", "window.startsAt"]);
	});

	it("marks nothing for a service without a repository", () => {
		expect(resolve({}, { "plainAt[value]": "x" }).size).toBe(0);
		expect(resolve(undefined, { "plainAt[value]": "x" }).size).toBe(0);
	});
});
