import "reflect-metadata";

import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";

import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { describeRelationWriteResponseSuite } from "./relation-write-response";

let container: StartedPostgreSqlContainer | undefined;

describeRelationWriteResponseSuite("PostgreSQL", {
	hasMicrosecondTimestamps: true,
	createDataSourceOptions: async () => {
		container = await new PostgreSqlContainer("postgres:17-alpine").start();

		return { type: "postgres", url: container.getConnectionUri() };
	},
	stop: async () => {
		await container?.stop();
	},
});
