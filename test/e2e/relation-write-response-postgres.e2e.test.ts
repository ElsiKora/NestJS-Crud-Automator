import "reflect-metadata";

import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { describeRelationWriteResponseSuite } from "./relation-write-response";

let container: StartedPostgreSqlContainer | undefined;

describeRelationWriteResponseSuite("PostgreSQL", {
	createDataSourceOptions: async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();

		// Without an index scan a read returns rows in physical order, and an UPDATE moves a row to the end of it.
		return { extra: { options: "-c enable_bitmapscan=off -c enable_indexonlyscan=off -c enable_indexscan=off" }, type: "postgres", url: container.getConnectionUri() };
	},
	stop: async () => {
		await container?.stop();
	},
});
