import "reflect-metadata";

import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { describeEagerRelationSuite } from "./to-many-relation-eager";

let container: StartedPostgreSqlContainer | undefined;

describeEagerRelationSuite("PostgreSQL", {
	createDataSourceOptions: async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();

		return { type: "postgres", url: container.getConnectionUri() };
	},
	isCursorSupported: true,
	stop: async () => {
		await container?.stop();
	},
});
