import "reflect-metadata";

import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { describeHydrationSuite } from "./to-many-relation-request";

let container: StartedPostgreSqlContainer | undefined;

describeHydrationSuite("PostgreSQL", {
	createDataSourceOptions: async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();

		return { type: "postgres", url: container.getConnectionUri() };
	},
	stop: async () => {
		await container?.stop();
	},
});
