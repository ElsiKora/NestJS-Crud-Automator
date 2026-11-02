import "reflect-metadata";

import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { describeRelationSoftDeleteSuite } from "./relation-reference-soft-delete";

let container: StartedPostgreSqlContainer | undefined;

describeRelationSoftDeleteSuite("PostgreSQL", {
	createDataSourceOptions: async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();

		return { type: "postgres", url: container.getConnectionUri() };
	},
	isCursorSupported: true,
	stop: async () => {
		await container?.stop();
	},
});
