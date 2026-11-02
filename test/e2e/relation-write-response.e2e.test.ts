import "reflect-metadata";

import { describeRelationWriteResponseSuite } from "./relation-write-response";

describeRelationWriteResponseSuite("SQLite", {
	createDataSourceOptions: async () => ({ database: ":memory:", type: "better-sqlite3" }),
});
